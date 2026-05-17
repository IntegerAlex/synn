import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogsTable, usersTable } from "@/db/schema";
import { decryptData } from "@/lib/services/encryption";
import { requireAdmin } from "@/lib/utils/adminAuth";

/**
 * GET /api/admin/logs - Get activity logs with filters
 * Admin-only endpoint - verified server-side
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access - throws if not admin
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const privateKey = searchParams.get("privateKey");
    const dataType = searchParams.get("dataType") || "activity_logs";
    const userIdStr = searchParams.get("userId");
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;
    const activityType = searchParams.get("activityType");
    const ipAddress = searchParams.get("ipAddress");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const conditions = [];

    // Build conditions
    if (userId) {
      conditions.push(eq(activityLogsTable.userId, userId));
    }
    if (activityType) {
      conditions.push(
        like(activityLogsTable.activityType, `%${activityType}%`),
      );
    }
    if (startDate) {
      conditions.push(gte(activityLogsTable.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(activityLogsTable.createdAt, new Date(endDate)));
    }

    let logs: any[] = [];

    if (dataType === "activity_logs" || dataType === "all") {
      const query = db
        .select()
        .from(activityLogsTable)
        .orderBy(desc(activityLogsTable.createdAt))
        .limit(limit)
        .offset(offset);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      logs = await query;

      // Decrypt if private key provided
      if (privateKey) {
        logs = logs.map((log) => {
          const decrypted = { ...log };
          try {
            if (
              log.ipAddress &&
              typeof log.ipAddress === "string" &&
              log.ipAddress.length > 100
            ) {
              decrypted.ipAddress = decryptData(log.ipAddress, privateKey);
            }
            if (
              log.userAgent &&
              typeof log.userAgent === "string" &&
              log.userAgent.length > 100
            ) {
              decrypted.userAgent = decryptData(log.userAgent, privateKey);
            }
            if (
              log.metadata &&
              typeof log.metadata === "string" &&
              log.metadata.length > 100
            ) {
              const decryptedMeta = decryptData(log.metadata, privateKey);
              try {
                decrypted.metadata = JSON.parse(decryptedMeta);
              } catch {
                decrypted.metadata = decryptedMeta;
              }
            }
          } catch (_error) {
            // Decryption failed, keep encrypted
          }
          return decrypted;
        });

        // Filter by IP if provided (after decryption)
        if (ipAddress) {
          logs = logs.filter((log) => log.ipAddress?.includes(ipAddress));
        }
      }
    }

    // Get user info for logs
    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))];
    const users =
      userIds.length > 0
        ? await db
            .select()
            .from(usersTable)
            .where(or(...userIds.map((id) => eq(usersTable.id, id))))
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Enrich logs with user info
    const enrichedLogs = logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));

    // Get total count for pagination
    let totalCount = 0;
    try {
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(activityLogsTable)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      totalCount = countResult[0]?.count || 0;
    } catch (error) {
      console.error("Count query error:", error);
      // Fallback to logs length if count fails
      totalCount = logs.length;
    }

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Admin logs error:", error);
    return NextResponse.json(
      {
        error: {
          code: "ERROR",
          message: "An error occurred while fetching logs",
        },
      },
      { status: 500 },
    );
  }
}
