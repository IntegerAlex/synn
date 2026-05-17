import { and, eq, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { apiRequestsTable, githubApiUsageTable, usersTable } from "@/db/schema";
import { requireAdmin } from "@/lib/utils/adminAuth";

export function getDateRange(start?: string | null, end?: string | null) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const startDate = start ? new Date(start) : defaultStart;
  const endDate = end ? new Date(end) : now;
  return { startDate, endDate };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    await requireAdmin();

    const userIdParam = searchParams.get("userId");
    const clerkUserId = searchParams.get("clerkUserId");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const { startDate, endDate } = getDateRange(start, end);

    const conditions = [
      gte(githubApiUsageTable.bucketDate, startDate),
      lte(githubApiUsageTable.bucketDate, endDate),
    ];

    if (userIdParam) {
      const parsed = parseInt(userIdParam, 10);
      if (!Number.isNaN(parsed)) {
        conditions.push(eq(githubApiUsageTable.userId, parsed));
      }
    }

    if (clerkUserId) {
      conditions.push(eq(githubApiUsageTable.clerkUserId, clerkUserId));
    }

    const whereClause = and(...conditions);

    // Aggregate from github_api_usage (best effort; ignore if table missing)
    let endpointUsageGithub: { endpoint: string; total: number }[] = [];
    let userUsageGithub: {
      clerkUserId: string | null;
      userId: number | null;
      endpoint: string;
      total: number;
    }[] = [];
    try {
      endpointUsageGithub = await db
        .select({
          endpoint: githubApiUsageTable.endpoint,
          total: sql<number>`sum(${githubApiUsageTable.count})`,
        })
        .from(githubApiUsageTable)
        .where(whereClause)
        .groupBy(githubApiUsageTable.endpoint)
        .orderBy(sql`sum(${githubApiUsageTable.count}) DESC`);

      userUsageGithub = await db
        .select({
          clerkUserId: githubApiUsageTable.clerkUserId,
          userId: githubApiUsageTable.userId,
          endpoint: githubApiUsageTable.endpoint,
          total: sql<number>`sum(${githubApiUsageTable.count})`,
        })
        .from(githubApiUsageTable)
        .where(whereClause)
        .groupBy(
          githubApiUsageTable.clerkUserId,
          githubApiUsageTable.userId,
          githubApiUsageTable.endpoint,
        )
        .orderBy(sql`sum(${githubApiUsageTable.count}) DESC`);
    } catch (_e) {
      // Table may not exist; fallback handled below
    }

    // Build base where clause for raw API requests
    const requestConditions = [];
    if (startDate)
      requestConditions.push(gte(apiRequestsTable.createdAt, startDate));
    if (endDate)
      requestConditions.push(lte(apiRequestsTable.createdAt, endDate));
    if (userIdParam) {
      const parsed = parseInt(userIdParam, 10);
      if (!Number.isNaN(parsed)) {
        requestConditions.push(eq(apiRequestsTable.userId, parsed));
      }
    }
    const requestWhere =
      requestConditions.length > 0 ? and(...requestConditions) : undefined;

    // Endpoint aggregation from raw API requests
    const endpointUsageRequests = clerkUserId
      ? await db
          .select({
            endpoint: apiRequestsTable.path,
            total: sql<number>`count(*)`,
          })
          .from(apiRequestsTable)
          .innerJoin(usersTable, eq(usersTable.id, apiRequestsTable.userId))
          .where(
            requestWhere
              ? and(eq(usersTable.clerkUserId, clerkUserId), requestWhere)
              : eq(usersTable.clerkUserId, clerkUserId),
          )
          .groupBy(apiRequestsTable.path)
          .orderBy(sql`count(*) DESC`)
      : await db
          .select({
            endpoint: apiRequestsTable.path,
            total: sql<number>`count(*)`,
          })
          .from(apiRequestsTable)
          .where(requestWhere)
          .groupBy(apiRequestsTable.path)
          .orderBy(sql`count(*) DESC`);

    // User aggregation from raw API requests
    const userUsageRequests = clerkUserId
      ? await db
          .select({
            clerkUserId: usersTable.clerkUserId,
            userId: apiRequestsTable.userId,
            endpoint: apiRequestsTable.path,
            total: sql<number>`count(*)`,
          })
          .from(apiRequestsTable)
          .innerJoin(usersTable, eq(usersTable.id, apiRequestsTable.userId))
          .where(
            requestWhere
              ? and(eq(usersTable.clerkUserId, clerkUserId), requestWhere)
              : eq(usersTable.clerkUserId, clerkUserId),
          )
          .groupBy(
            usersTable.clerkUserId,
            apiRequestsTable.userId,
            apiRequestsTable.path,
          )
          .orderBy(sql`count(*) DESC`)
      : await db
          .select({
            clerkUserId: usersTable.clerkUserId,
            userId: apiRequestsTable.userId,
            endpoint: apiRequestsTable.path,
            total: sql<number>`count(*)`,
          })
          .from(apiRequestsTable)
          .leftJoin(usersTable, eq(usersTable.id, apiRequestsTable.userId))
          .where(requestWhere)
          .groupBy(
            usersTable.clerkUserId,
            apiRequestsTable.userId,
            apiRequestsTable.path,
          )
          .orderBy(sql`count(*) DESC`);

    // Choose data: prefer github aggregate, else requests fallback
    const endpointUsage =
      endpointUsageGithub.length > 0
        ? endpointUsageGithub
        : endpointUsageRequests;
    const userUsage =
      userUsageGithub.length > 0 ? userUsageGithub : userUsageRequests;
    const totalCalls = endpointUsage.reduce(
      (acc, row) => acc + (row.total || 0),
      0,
    );

    return NextResponse.json(
      {
        filters: {
          userId: userIdParam,
          clerkUserId,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          totalCalls,
          endpoints: endpointUsage.length,
        },
        endpoints: endpointUsage,
        users: userUsage,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("DASHBOARD_USAGE_ERROR", error);
    return NextResponse.json(
      {
        error: {
          code: "DASHBOARD_USAGE_ERROR",
          message: error?.message || "Failed to fetch usage",
        },
      },
      { status: 500 },
    );
  }
}
