import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogsTable } from "@/db/schema";
import { requireAdmin } from "@/lib/utils/adminAuth";
import { detectSuspiciousActivity } from "@/lib/utils/suspiciousActivity";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    await requireAdmin();

    const limit = parseInt(searchParams.get("limit") || "300", 10);
    const logs = await db
      .select()
      .from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit);

    const alerts = detectSuspiciousActivity(logs);
    const unauthorized = logs.filter(
      (log) => log.responseStatus === 401 || log.responseStatus === 403,
    ).length;
    const errors = logs.filter(
      (log) => log.responseStatus && log.responseStatus >= 400,
    ).length;
    const exportsCount = logs.filter(
      (log) =>
        log.requestPath?.includes("/export") ||
        log.requestPath?.includes("/gdpr/export") ||
        log.activityType?.includes("export"),
    ).length;

    return NextResponse.json(
      {
        alerts,
        summary: {
          recentLogs: logs.length,
          unauthorized,
          errors,
          exports: exportsCount,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "DASHBOARD_ALERTS_ERROR",
          message: error?.message || "Failed to load alerts",
        },
      },
      { status: 500 },
    );
  }
}
