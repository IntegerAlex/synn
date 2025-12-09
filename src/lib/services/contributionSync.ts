import { db } from '@/db';
import { commitsTable, contributionsTable, reposTable, usersTable } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { GitHubApiService } from './githubApi';
import type { GraphData } from '@/types/git';

interface SyncOptions {
  userId: number;
  clerkUserId: string;
  githubToken: string;
  repoFullName?: string; // If provided, sync only this repo; otherwise sync all repos
}

/**
 * Sync commits for a single repository to the database
 */
async function syncRepoCommits(
  userId: number,
  repoId: number,
  githubService: GitHubApiService,
  limit: number = 10000
): Promise<number> {
  try {
    // Fetch graph data from GitHub
    const graphData = await githubService.getGraph(limit);
    
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      return 0;
    }

    // Prepare commits for insertion
    const commitsToInsert = graphData.nodes.map((node) => {
      const commitDate = new Date(node.date);
      // Extract author name from node.author (which is a string)
      const authorParts = node.author?.split('<') || [node.author || 'Unknown'];
      const authorName = authorParts[0].trim();
      const authorEmail = authorParts[1]?.replace('>', '').trim() || '';

      return {
        userId,
        repoId,
        hash: node.hash,
        shortHash: node.shortHash,
        message: node.message,
        authorName,
        authorEmail,
        commitDate,
        branch: node.refs?.[0] || null,
        metadata: {
          column: node.column,
          row: node.row,
          refs: node.refs,
          color: node.color,
        },
        syncedAt: new Date(),
      };
    });

    // Batch insert commits (handle duplicates gracefully, handle timeouts)
    let insertedCount = 0;
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < commitsToInsert.length; i += batchSize) {
      const batch = commitsToInsert.slice(i, i + batchSize);
      try {
        await db.insert(commitsTable).values(batch);
        insertedCount += batch.length;
      } catch (error: any) {
        if (isDbTimeout(error)) {
          console.error('DB timeout while inserting commits batch; aborting batch and retry later.');
          throw error;
        }
        // If batch fails due to duplicates, try individual inserts
        const isDuplicateError = error.code === '23505' || 
          error.cause?.code === '23505' ||
          error.message?.includes('duplicate') || 
          error.message?.includes('unique');
        
        if (isDuplicateError) {
          // Try individual inserts to handle mixed batch of new/existing commits
          for (const commit of batch) {
            try {
              await db.insert(commitsTable).values(commit);
              insertedCount++;
            } catch (err: any) {
              if (isDbTimeout(err)) {
                console.error('DB timeout while inserting single commit; aborting.');
                throw err;
              }
              // Silently skip duplicates (PostgreSQL error code 23505)
              const isCommitDuplicate = err.code === '23505' || 
                err.cause?.code === '23505' ||
                err.message?.includes('duplicate') || 
                err.message?.includes('unique');
              
              if (!isCommitDuplicate) {
                console.error(`Error inserting commit ${commit.hash}:`, err.message);
              }
              // Duplicates are expected during re-sync, no need to log
            }
          }
        } else {
          console.error('Error inserting commit batch:', error.message);
        }
      }
    }

    // Update contributions table (aggregated daily counts)
    await updateContributions(userId, repoId, commitsToInsert);

    return insertedCount;
  } catch (error) {
    console.error(`Error syncing commits for repo ${repoId}:`, error);
    throw error;
  }
}

/**
 * Update contributions table with aggregated daily counts
 */
async function updateContributions(
  userId: number,
  repoId: number,
  commits: Array<{ commitDate: Date }>
): Promise<void> {
  // Group commits by date (date only, no time)
  const contributionsByDate = new Map<string, number>();
  
  commits.forEach((commit) => {
    const dateKey = commit.commitDate.toISOString().split('T')[0];
    contributionsByDate.set(dateKey, (contributionsByDate.get(dateKey) || 0) + 1);
  });

  // Insert or update contributions
  for (const [dateStr, count] of contributionsByDate.entries()) {
    const contributionDate = new Date(dateStr);
    
    try {
      // Check if contribution exists
      const existing = await db
        .select()
        .from(contributionsTable)
        .where(
          and(
            eq(contributionsTable.userId, userId),
            eq(contributionsTable.repoId, repoId),
            eq(contributionsTable.contributionDate, contributionDate)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(contributionsTable)
          .set({
            commitCount: count,
            updatedAt: new Date(),
          })
          .where(eq(contributionsTable.id, existing[0].id));
      } else {
        // Insert new
        await db.insert(contributionsTable).values({
          userId,
          repoId,
          contributionDate,
          commitCount: count,
          updatedAt: new Date(),
        });
      }
    } catch (error: any) {
      if (isDbTimeout(error)) {
        console.error(`DB timeout updating contribution for ${dateStr}; will retry on next sync.`);
        throw error;
      }
      console.error(`Error updating contribution for ${dateStr}:`, error);
    }
  }
}

/**
 * Sync commits for all repositories or a specific repository
 */
export async function syncContributions(options: SyncOptions): Promise<{
  reposSynced: number;
  totalCommits: number;
  errors: string[];
}> {
  const { userId, clerkUserId, githubToken, repoFullName } = options;
  const errors: string[] = [];
  let reposSynced = 0;
  let totalCommits = 0;

  try {
    // Get user's repositories
    const userRepos = await db
      .select()
      .from(reposTable)
      .where(eq(reposTable.userId, userId));

    const reposToSync = repoFullName
      ? userRepos.filter((r) => r.fullName === repoFullName)
      : userRepos;

    if (reposToSync.length === 0) {
      return { reposSynced: 0, totalCommits: 0, errors: ['No repositories found'] };
    }

    // Sync each repository
    for (const repo of reposToSync) {
      try {
        const githubService = new GitHubApiService(githubToken, repo.fullName, repo.defaultBranch || 'main');
        const commitCount = await syncRepoCommits(userId, repo.id, githubService);
        totalCommits += commitCount;
        reposSynced++;
      } catch (error: any) {
        const errorMsg = `Failed to sync ${repo.fullName}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return { reposSynced, totalCommits, errors };
  } catch (error: any) {
    console.error('Error in syncContributions:', error);
    throw error;
  }
}

/**
 * Get contributions from database for a user
 * Returns daily contribution counts for the past year
 */
export async function getContributionsFromDB(
  userId: number,
  days: number = 371
): Promise<Array<{ date: string; count: number }>> {
  try {
    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Query commits table directly - count DISTINCT commit hashes per day
    // This matches GitHub's contribution graph which counts unique commits across all repos/branches
    const contributions = await db
      .select({
        date: sql<string>`DATE(${commitsTable.commitDate})`,
        count: sql<number>`COUNT(DISTINCT ${commitsTable.hash})`,
      })
      .from(commitsTable)
      .where(
        and(
          eq(commitsTable.userId, userId),
          gte(commitsTable.commitDate, startDate)
        )
      )
      .groupBy(sql`DATE(${commitsTable.commitDate})`)
      .orderBy(sql`DATE(${commitsTable.commitDate})`);

    // Convert to map for easy lookup
    const contributionsMap = new Map<string, number>();
    contributions.forEach((c) => {
      contributionsMap.set(c.date, Number(c.count));
    });

    // Generate all dates in range and fill in missing dates with 0
    const result: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      result.push({
        date: dateKey,
        count: contributionsMap.get(dateKey) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  } catch (error: any) {
    // If table doesn't exist yet, return empty array
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      console.warn('Commits table does not exist yet. Please run migrations.');
      // Return empty contributions for all dates
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 371);
      startDate.setHours(0, 0, 0, 0);
      
      const result: Array<{ date: string; count: number }> = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        result.push({
          date: dateKey,
          count: 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return result;
    }
    if (isDbTimeout(error)) {
      console.warn('DB timeout in getContributionsFromDB; returning empty data placeholder.');
      return [];
    }
    throw error;
  }
}

/**
 * Get total commit count for a user (deduplicated by commit hash)
 * This matches GitHub's contribution count which counts unique commits across all repos/branches
 */
export async function getTotalCommitsCount(userId: number): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${commitsTable.hash})` })
      .from(commitsTable)
      .where(eq(commitsTable.userId, userId));

    return Number(result[0]?.count || 0);
  } catch (error: any) {
    // If table doesn't exist yet, return 0
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return 0;
    }
    if (isDbTimeout(error)) {
      console.warn('DB timeout in getTotalCommitsCount; returning 0.');
      return 0;
    }
    throw error;
  }
}

/**
 * Check if contributions need syncing (last sync was more than 1 hour ago)
 */
export async function needsSync(userId: number): Promise<boolean> {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Check if there are any recent contributions
    const recentContributions = await db
      .select()
      .from(contributionsTable)
      .where(
        and(
          eq(contributionsTable.userId, userId),
          gte(contributionsTable.updatedAt, oneHourAgo)
        )
      )
      .limit(1);

    return recentContributions.length === 0;
  } catch (error: any) {
    // If table doesn't exist yet, sync is needed
    if (error.message?.includes('does not exist') || error.code === '42P01') {
      return true;
    }
    if (isDbTimeout(error)) {
      console.warn('DB timeout in needsSync; returning true to trigger sync later.');
      return true;
    }
    throw error;
  }
}

function isDbTimeout(error: any) {
  const code = error?.code || error?.cause?.code || '';
  const msg = error?.message || '';
  return code === 'ETIMEDOUT' || msg.includes('ETIMEDOUT');
}
