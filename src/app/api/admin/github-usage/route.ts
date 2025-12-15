import { NextResponse } from 'next/server';
import { and, gte, lte, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { githubApiUsageTable } from '@/db/schema';
import { requireAdmin } from '@/lib/utils/adminAuth';
import { adminRateLimiter } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/services/activityLogger';

function getDateRange(start?: string | null, end?: string | null) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days
  const startDate = start ? new Date(start) : defaultStart;
  const endDate = end ? new Date(end) : now;
  return { startDate, endDate };
}

export async function GET(request: Request) {
  const clientIp = getClientIp(request) || 'unknown';
  const rateResult = adminRateLimiter.check(`admin:github-usage:${clientIp}`);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded' } },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateResult.limit.toString(),
          'X-RateLimit-Remaining': rateResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateResult.reset).toISOString(),
        },
      }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    await requireAdmin();

    const userIdParam = searchParams.get('userId');
    const clerkUserId = searchParams.get('clerkUserId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

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

    const endpointUsage = await db
      .select({
        endpoint: githubApiUsageTable.endpoint,
        total: sql<number>`sum(${githubApiUsageTable.count})`,
      })
      .from(githubApiUsageTable)
      .where(whereClause)
      .groupBy(githubApiUsageTable.endpoint)
      .orderBy(sql`sum(${githubApiUsageTable.count}) DESC`);

    const userUsage = await db
      .select({
        clerkUserId: githubApiUsageTable.clerkUserId,
        userId: githubApiUsageTable.userId,
        endpoint: githubApiUsageTable.endpoint,
        total: sql<number>`sum(${githubApiUsageTable.count})`,
      })
      .from(githubApiUsageTable)
      .where(whereClause)
      .groupBy(githubApiUsageTable.clerkUserId, githubApiUsageTable.userId, githubApiUsageTable.endpoint)
      .orderBy(sql`sum(${githubApiUsageTable.count}) DESC`);

    const totalCalls = endpointUsage.reduce((acc, row) => acc + (row.total || 0), 0);

    return NextResponse.json({
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
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: 'ADMIN_GITHUB_USAGE_ERROR',
          message: error.message || 'Failed to fetch GitHub usage',
        },
      },
      { status: 500 }
    );
  }
}



