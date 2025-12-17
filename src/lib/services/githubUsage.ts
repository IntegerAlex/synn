'use server';

import { db } from '@/db';
import { githubApiUsageTable } from '@/db/schema';
import { sql } from 'drizzle-orm';

interface UsageRecord {
  clerkUserId?: string | null;
  userId?: number | null;
  endpoint: string;
  statusCode?: number | null;
  createdAt?: Date;
}

// Bucket date to UTC midnight for daily aggregation
function bucketToDayUTC(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return d;
}

/**
 * Record GitHub API usage per user/endpoint (daily bucket).
 * Safe to call without user info; will still track aggregate usage.
 */
export async function recordGitHubUsage({
  clerkUserId,
  userId,
  endpoint,
  statusCode,
  createdAt = new Date(),
}: UsageRecord): Promise<void> {
  const bucketDate = bucketToDayUTC(createdAt);

  // Drizzle onConflictDoUpdate for atomic increment
  // Requires unique constraint on (clerkUserId, endpoint, bucketDate)
  try {
    await db
      .insert(githubApiUsageTable)
      .values({
        clerkUserId: clerkUserId || null,
        userId: userId ?? null,
        endpoint,
        statusCode: statusCode ?? null,
        bucketDate,
        count: 1,
        lastSeenAt: createdAt,
      })
      .onConflictDoUpdate({
        target: [githubApiUsageTable.clerkUserId, githubApiUsageTable.endpoint, githubApiUsageTable.bucketDate],
        set: {
          count: sql`${githubApiUsageTable.count} + 1`,
          statusCode: statusCode ?? null,
          lastSeenAt: createdAt,
        },
      });
  } catch (error: any) {
    // If unique constraint doesn't exist yet, log warning but don't fail
    // The migration should be run to add the constraint
    if (error?.code === '42P10' || error?.message?.includes('unique constraint') || error?.message?.includes('ON CONFLICT')) {
      console.warn('GitHub usage tracking: Unique constraint missing. Run migration: drizzle/add_github_api_usage_unique_constraint.sql');
      // Silently fail - usage tracking is non-critical
      return;
    }
    // Re-throw other errors
    throw error;
  }
}





