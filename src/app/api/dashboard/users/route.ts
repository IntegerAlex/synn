import { NextResponse } from 'next/server';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { reposTable, usersTable } from '@/db/schema';
import { requireAdmin } from '@/lib/utils/adminAuth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    await requireAdmin();

    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const userConditions = [];
    if (search) {
      const pattern = `%${search}%`;
      userConditions.push(
        ilike(usersTable.email, pattern),
        ilike(usersTable.name, pattern),
        ilike(usersTable.clerkUserId, pattern),
      );
    }

    const users = await db
      .select({
        id: usersTable.id,
        clerkUserId: usersTable.clerkUserId,
        email: usersTable.email,
        name: usersTable.name,
        githubUsername: usersTable.githubUsername,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .where(userConditions.length > 0 ? and(...userConditions) : undefined)
      .orderBy(sql`coalesce(${usersTable.updatedAt}, ${usersTable.createdAt}) desc`)
      .limit(limit)
      .offset(offset);

    const userIds = users.map((u) => u.id);
    const repos =
      userIds.length === 0
        ? []
        : await db
            .select({
              id: reposTable.id,
              userId: reposTable.userId,
              fullName: reposTable.fullName,
              isPrivate: reposTable.isPrivate,
              starsCount: reposTable.starsCount,
              forksCount: reposTable.forksCount,
              updatedAt: reposTable.updatedAt,
            })
            .from(reposTable)
            .where(inArray(reposTable.userId, userIds))
            .orderBy(reposTable.updatedAt ?? reposTable.createdAt);

    const repoMap = new Map<number, typeof repos>();
    for (const repo of repos) {
      const list = repoMap.get(repo.userId) || [];
      list.push(repo);
      repoMap.set(repo.userId, list);
    }

    const enrichedUsers = users.map((u) => ({
      ...u,
      repos: repoMap.get(u.id) || [],
      repoCount: (repoMap.get(u.id) || []).length,
    }));

    return NextResponse.json(
      {
        users: enrichedUsers,
        pagination: {
          total: enrichedUsers.length + offset, // approximate without count query
          limit,
          offset,
          hasMore: enrichedUsers.length === limit,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('DASHBOARD_USERS_ERROR', error);
    return NextResponse.json(
      {
        error: {
          code: 'DASHBOARD_USERS_ERROR',
          message: error?.message || 'Failed to fetch users',
        },
      },
      { status: 500 },
    );
  }
}

