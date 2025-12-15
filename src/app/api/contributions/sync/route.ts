import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { syncContributions } from '@/lib/services/contributionSync';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

// Track ongoing syncs to prevent duplicate syncs for the same user
const ongoingSyncs = new Map<string, Promise<void>>();

export async function POST(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if sync is already in progress for this user
    if (ongoingSyncs.has(clerkUserId)) {
      return NextResponse.json({
        success: true,
        message: 'Sync already in progress',
        status: 'in_progress',
      });
    }

    // Get user from database
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get GitHub token
    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(clerkUserId, 'github');
    const token = tokenResponse.data[0]?.token;

    if (!token) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }

    // Parse request body for optional repoFullName
    const body = await request.json().catch(() => ({}));
    const repoFullName = body.repoFullName;

    // Start sync in background - don't await, let it run independently
    const syncPromise = (async () => {
      try {
        logger.info('Starting background sync for user', { clerkUserId });
        const result = await syncContributions({
          userId: user[0].id,
          clerkUserId,
          githubToken: token,
          repoFullName,
        });
        logger.info('Completed sync for user', { clerkUserId, reposSynced: result.reposSynced, totalCommits: result.totalCommits });
      } catch (error: any) {
        console.error(`[Sync] Error for user ${clerkUserId}:`, error.message);
      } finally {
        // Remove from ongoing syncs when done
        ongoingSyncs.delete(clerkUserId);
      }
    })();

    // Track the ongoing sync
    ongoingSyncs.set(clerkUserId, syncPromise);

    // Return immediately - sync continues in background
    return NextResponse.json({
      success: true,
      message: 'Sync started in background',
      status: 'started',
    });
  } catch (error: any) {
    console.error('Error initiating sync:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
