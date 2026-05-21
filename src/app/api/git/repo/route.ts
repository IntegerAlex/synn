import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { fingerprintsTable, usersTable } from "@/db/schema";
import {
  getClientIp,
  getUserAgent,
  logActivity,
  logApiRequest,
} from "@/lib/services/activityLogger";
import { getGitHubService } from "@/lib/services/githubApiHelper";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

const SetRepoSchema = z.object({
  repo_full_name: z
    .string()
    .min(1, "Repository name is required")
    .regex(/^[^/]+\/[^/]+$/, "Repository must be in format: owner/repo"),
  default_branch: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

// GET /api/git/repo - Get repository info
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: number | undefined;
  let fingerprintId: number | undefined;

  try {
    // Run auth and fingerprint header read, then fan out DB queries in parallel
    const { userId: clerkUserId } = await auth();
    const visitorId = request.headers.get("x-visitor-id");

    const [userResult, fingerprintResult] = await Promise.all([
      clerkUserId
        ? db
            .select()
            .from(usersTable)
            .where(eq(usersTable.clerkUserId, clerkUserId))
            .limit(1)
        : Promise.resolve([] as typeof usersTable.$inferSelect[]),
      visitorId
        ? db
            .select()
            .from(fingerprintsTable)
            .where(eq(fingerprintsTable.visitorId, visitorId))
            .limit(1)
            .catch((dbError: unknown) => {
              if (
                (dbError instanceof Error && dbError.message?.includes("does not exist")) ||
                (dbError instanceof Error && dbError.message?.includes("relation"))
              ) {
                return [] as typeof fingerprintsTable.$inferSelect[];
              }
              throw dbError;
            })
        : Promise.resolve([] as typeof fingerprintsTable.$inferSelect[]),
    ]);

    if (userResult.length > 0) {
      userId = userResult[0].id;
    }
    if (fingerprintResult.length > 0) {
      fingerprintId = fingerprintResult[0].id;
    }

    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get("repo");

    if (!repoFullName) {
      const responseTime = Date.now() - startTime;
      await logApiRequest({
        userId,
        fingerprintId,
        method: "GET",
        path: "/api/git/repo",
        statusCode: 400,
        responseTime,
        errorCode: "REPO_REQUIRED",
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json(
        {
          error: {
            code: "REPO_REQUIRED",
            message: "Repository name is required",
          },
        },
        { status: 400 },
      );
    }

    const githubService = await getGitHubService(repoFullName);
    const info = await githubService.getRepoInfo();

    const responseTime = Date.now() - startTime;
    await logActivity({
      userId,
      fingerprintId,
      activityType: "repo_info_viewed",
      category: "repository",
      description: `Viewed repository info: ${repoFullName}`,
      repoFullName,
      requestMethod: "GET",
      requestPath: "/api/git/repo",
      responseStatus: 200,
      responseTime,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ data: info });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const response = formatErrorResponse(error);

    await logApiRequest({
      userId,
      fingerprintId,
      method: "GET",
      path: "/api/git/repo",
      statusCode: 400,
      responseTime,
      errorCode: response.error?.code,
      errorMessage: response.error?.message,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(response, { status: 400 });
  }
}

// POST /api/git/repo - Set repository (now accepts repo_full_name instead of path)
export async function POST(request: Request) {
  const startTime = Date.now();
  let userId: number | undefined;
  let fingerprintId: number | undefined;

  try {
    // Run auth and fingerprint header read, then fan out DB queries in parallel
    const { userId: clerkUserId } = await auth();
    const visitorId = request.headers.get("x-visitor-id");

    const [userResult, fingerprintResult] = await Promise.all([
      clerkUserId
        ? db
            .select()
            .from(usersTable)
            .where(eq(usersTable.clerkUserId, clerkUserId))
            .limit(1)
        : Promise.resolve([] as typeof usersTable.$inferSelect[]),
      visitorId
        ? db
            .select()
            .from(fingerprintsTable)
            .where(eq(fingerprintsTable.visitorId, visitorId))
            .limit(1)
            .catch((dbError: unknown) => {
              if (
                (dbError instanceof Error && dbError.message?.includes("does not exist")) ||
                (dbError instanceof Error && dbError.message?.includes("relation"))
              ) {
                return [] as typeof fingerprintsTable.$inferSelect[];
              }
              throw dbError;
            })
        : Promise.resolve([] as typeof fingerprintsTable.$inferSelect[]),
    ]);

    if (userResult.length > 0) {
      userId = userResult[0].id;
    }
    if (fingerprintResult.length > 0) {
      fingerprintId = fingerprintResult[0].id;
    }

    const body = await request.json();
    const { repo_full_name, default_branch } = SetRepoSchema.parse(body);

    const githubService = await getGitHubService(
      repo_full_name,
      default_branch ?? undefined,
    );
    const fullInfo = await githubService.getRepoInfo();

    const responseTime = Date.now() - startTime;
    await logActivity({
      userId,
      fingerprintId,
      activityType: "repo_selected",
      category: "repository",
      description: `Repository selected: ${repo_full_name}`,
      repoFullName: repo_full_name,
      requestMethod: "POST",
      requestPath: "/api/git/repo",
      responseStatus: 200,
      responseTime,
      metadata: { defaultBranch: default_branch },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ data: fullInfo });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const response = formatErrorResponse(error);

    await logActivity({
      userId,
      fingerprintId,
      activityType: "api_error",
      category: "error",
      description: `Failed to set repository: ${error instanceof Error ? error.message : "Unknown error"}`,
      requestMethod: "POST",
      requestPath: "/api/git/repo",
      responseStatus: 400,
      responseTime,
      errorCode: response.error?.code,
      errorMessage: response.error?.message,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(response, { status: 400 });
  }
}
