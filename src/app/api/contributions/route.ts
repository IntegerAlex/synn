import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getContributionsFromDB, getTotalCommitsCount, needsSync } from '@/lib/services/contributionSync';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    console.error('Error fetching contributions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
