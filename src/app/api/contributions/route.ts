import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { getContributionsFromDB, getTotalCommitsCount, needsSync } from '@/lib/services/contributionSync';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureUserExists } from '@/lib/services/githubSync';
import { logger } from '@/lib/utils/logger';

export async function GET(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database (handle DB timeouts gracefully)
    let user;
    try {
      user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .limit(1);
    } catch (err: any) {
      const code = err?.code || err?.cause?.code || '';
      const msg = err?.message || '';
      if (code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { error: 'Database timeout, please retry.' },
          { status: 503 },
        );
      }
      throw err;
    }

    // If user doesn't exist, try to create them using GitHub token from Clerk
    if (user.length === 0) {
      logger.warn('User not found in database, attempting to create user', { clerkUserId });
      
      try {
        // Get GitHub OAuth token from Clerk
        const client = await clerkClient();
        const tokenResponse = await client.users.getUserOauthAccessToken(clerkUserId, 'github');
        const githubToken = tokenResponse.data[0]?.token;

        if (!githubToken) {
          logger.error('GitHub token not found for user', { clerkUserId });
          return NextResponse.json(
            { error: 'User not found. Please ensure you have connected your GitHub account.' },
            { status: 404 }
          );
        }

        // Create user in database
        const userId = await ensureUserExists(clerkUserId, githubToken);
        
        // Fetch the newly created user
        user = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1);

        if (user.length === 0) {
          logger.error('Failed to retrieve user after creation', { clerkUserId });
          return NextResponse.json(
            { error: 'User creation failed. Please try again.' },
            { status: 500 }
          );
        }

        logger.info('Successfully created user', { clerkUserId });
      } catch (createError: any) {
        logger.error('Error creating user', { clerkUserId, error: createError });
        return NextResponse.json(
          { error: `User not found: ${createError.message || 'Failed to create user'}` },
          { status: 404 }
        );
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '371', 10);

    let contributions, totalCommits, shouldSync;
    try {
      contributions = await getContributionsFromDB(user[0].id, days);
      totalCommits = await getTotalCommitsCount(user[0].id);
      shouldSync = await needsSync(user[0].id);
    } catch (err: any) {
      const code = err?.code || err?.cause?.code || '';
      const msg = err?.message || '';
      if (code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT')) {
        return NextResponse.json(
          { error: 'Database timeout, please retry.' },
          { status: 503 },
        );
      }
      throw err;
    }

    // Calculate max count per day
    const maxCount = contributions.reduce((max, c) => Math.max(max, c.count), 0);

    return NextResponse.json({
      contributions,
      totalCommits,
      maxCount,
      shouldSync, // Indicates if a sync is recommended
    });
  } catch (error: any) {
    logger.error('Error fetching contributions', { error });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
