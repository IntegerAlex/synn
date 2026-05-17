import { db } from '@/db';
import { commitsTable, contributionsTable, reposTable, usersTable } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { GitHubApiService } from './githubApi';
import type { GraphData } from '@/types/git';
import { logger } from '@/lib/utils/logger';
import { retry } from '@/lib/utils/retry';

// Transaction type - extracted from db.transaction callback
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface SyncOptions {
  userId: number;
  clerkUserId: string;
  githubToken: string;
  repoFullName?: string; // If provided, sync only this repo; otherwise sync all repos
}

/**
 * Validate sync options
 */
function validateSyncOptions(options: SyncOptions): void {
  if (!options.userId || options.userId <= 0 || !Number.isInteger(options.userId)) {
    throw new Error('Invalid userId: must be a positive integer');
  }
  if (!options.clerkUserId || typeof options.clerkUserId !== 'string' || options.clerkUserId.trim().length === 0) {
    throw new Error('Invalid clerkUserId: must be a non-empty string');
  }
  if (!options.githubToken || typeof options.githubToken !== 'string' || options.githubToken.trim().length === 0) {
    throw new Error('Invalid githubToken: must be a non-empty string');
  }
  if (options.repoFullName !== undefined) {
    if (typeof options.repoFullName !== 'string' || options.repoFullName.trim().length === 0) {
      throw new Error('Invalid repoFullName: must be a non-empty string if provided');
    }
    // Validate format: owner/repo
    if (!options.repoFullName.includes('/') || options.repoFullName.split('/').length !== 2) {
      throw new Error('Invalid repoFullName format: expected "owner/repo"');
    }
  }
}

/**
 * Process commits in chunks to optimize memory usage for large repositories
 * This function processes commits in batches and yields them for insertion
 */
async function* processCommitsInChunks(
  graphData: GraphData,
  userId: number,
  repoId: number,
  chunkSize: number = 1000
): AsyncGenerator<Array<{
  userId: number;
  repoId: number;
  hash: string;
  shortHash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  commitDate: Date;
  branch: string | null;
  metadata: Record<string, unknown>;
  syncedAt: Date;
}>, void, unknown> {
  if (!graphData?.nodes || graphData.nodes.length === 0) {
    return;
  }

  // Process nodes in chunks to avoid loading all into memory at once
  for (let i = 0; i < graphData.nodes.length; i += chunkSize) {
    const nodeChunk = graphData.nodes.slice(i, i + chunkSize);
    
    const commitsChunk = nodeChunk
      .map((node) => {
        // Validate required fields
        if (!node.hash || typeof node.hash !== 'string' || node.hash.length === 0) {
          logger.warn('Skipping commit with invalid hash', { node: JSON.stringify(node), repoId, userId });
          return null;
        }
        if (!node.date) {
          logger.warn('Skipping commit with invalid date', { hash: node.hash, repoId, userId });
          return null;
        }

        const commitDate = new Date(node.date);
        // Validate date
        if (isNaN(commitDate.getTime())) {
          logger.warn('Skipping commit with invalid date', { hash: node.hash, date: node.date, repoId, userId });
          return null;
        }

        // Extract author name from node.author (which is a string)
        const authorParts = node.author?.split('<') || [node.author || 'Unknown'];
        const authorName = authorParts[0].trim() || 'Unknown';
        const authorEmail = authorParts[1]?.replace('>', '').trim() || '';

        // Validate hash length (SHA-1 is 40 chars, but allow short hashes too)
        const hash = node.hash.trim();
        if (hash.length === 0 || hash.length > 40) {
          logger.warn('Skipping commit with invalid hash length', { hash, repoId, userId });
          return null;
        }

        // Validate shortHash
        const shortHash = (node.shortHash || hash.substring(0, 7)).substring(0, 7);

        return {
          userId,
          repoId,
          hash,
          shortHash,
          message: (node.message || '').substring(0, 10000), // Limit message length
          authorName: authorName.substring(0, 255), // Limit to varchar length
          authorEmail: authorEmail.substring(0, 255), // Limit to varchar length
          commitDate,
          branch: node.refs?.[0] ? node.refs[0].substring(0, 255) : null,
          metadata: {
            column: node.column,
            row: node.row,
            refs: node.refs,
            color: node.color,
          },
          syncedAt: new Date(),
        };
      })
      .filter((commit): commit is NonNullable<typeof commit> => commit !== null);

    if (commitsChunk.length > 0) {
      yield commitsChunk;
    }
  }
}

/**
 * Sync commits for a single repository to the database
 * Uses transactions, retry logic, and memory-optimized chunking
 */
async function syncRepoCommits(
  userId: number,
  repoId: number,
  githubService: GitHubApiService,
  limit: number = 10000
): Promise<number> {
  const startTime = Date.now();
  
  try {
    logger.info('Starting repo commit sync', { userId, repoId, limit });

    // Fetch graph data from GitHub with retry logic
    const graphData = await retry(
      () => githubService.getGraph(limit),
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        retryableErrors: (error) => {
          const err = error as { message?: string; code?: string };
          return (
            err.message?.includes('rate limit') ||
            err.message?.includes('timeout') ||
            err.code === 'ETIMEDOUT' ||
            err.code === 'ECONNRESET'
          );
        },
      }
    );
    
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
      logger.info('No commits found for repo', { userId, repoId });
      return 0;
    }

    logger.info('Fetched commits from GitHub', {
      userId,
      repoId,
      commitCount: graphData.nodes.length,
    });

    let insertedCount = 0;
    const allCommits: Array<{ commitDate: Date }> = [];
    const batchSize = parseInt(process.env.COMMIT_BATCH_SIZE || '100', 10);

    // Process commits in chunks to optimize memory
    for await (const commitsChunk of processCommitsInChunks(graphData, userId, repoId, 1000)) {
      // Insert commits in batches within a transaction for atomicity
      await db.transaction(async (tx) => {
        // Insert commits in smaller batches
        for (let i = 0; i < commitsChunk.length; i += batchSize) {
          const batch = commitsChunk.slice(i, i + batchSize);
          
          try {
            // Retry batch insert with exponential backoff
            await retry(
              () => tx.insert(commitsTable).values(batch),
              {
                maxRetries: 3,
                initialDelayMs: 500,
                retryableErrors: (error) => {
                  const err = error as { code?: string; message?: string };
                  return (
                    isDbTimeout(err) ||
                    err.code === '23505' || // Duplicate key (retry to handle race conditions)
                    err.message?.includes('timeout')
                  );
                },
              }
            );
            insertedCount += batch.length;
            allCommits.push(...batch);
          } catch (error: any) {
            // If batch fails due to duplicates, try individual inserts
            const isDuplicateError = error.code === '23505' || 
              error.cause?.code === '23505' ||
              error.message?.includes('duplicate') || 
              error.message?.includes('unique');
            
            if (isDuplicateError) {
              // Try individual inserts to handle mixed batch of new/existing commits
              for (const commit of batch) {
                try {
                  await retry(
                    () => tx.insert(commitsTable).values(commit),
                    {
                      maxRetries: 2,
                      initialDelayMs: 200,
                      retryableErrors: (err) => {
                        const e = err as { code?: string };
                        return e.code === '23505' || isDbTimeout(e);
                      },
                    }
                  );
                  insertedCount++;
                  allCommits.push(commit);
                } catch (err: any) {
                  if (isDbTimeout(err)) {
                    logger.error('DB timeout while inserting single commit', err, {
                      hash: commit.hash,
                      repoId,
                      userId,
                    });
                    throw err;
                  }
                  // Silently skip duplicates (PostgreSQL error code 23505)
                  const isCommitDuplicate = err.code === '23505' || 
                    err.cause?.code === '23505' ||
                    err.message?.includes('duplicate') || 
                    err.message?.includes('unique');
                  
                  if (!isCommitDuplicate) {
                    logger.error('Error inserting commit', err, {
                      hash: commit.hash,
                      repoId,
                      userId,
                      code: err.code,
                    });
                    // Don't throw - continue with other commits
                  }
                  // Duplicates are expected during re-sync, no need to log
                }
              }
            } else {
              logger.error('Error inserting commit batch', error, {
                batchSize: batch.length,
                repoId,
                userId,
                code: error.code,
              });
              // Don't throw - continue with next batch
            }
          }
        }
      });
    }

    // Update contributions table (aggregated daily counts)
    // Note: We update contributions outside the commits transaction to avoid
    // potential issues with onConflictDoUpdate inside transactions
    if (allCommits.length > 0) {
      await updateContributions(userId, repoId, allCommits);
    }

    const duration = Date.now() - startTime;
    logger.info('Completed repo commit sync', {
      userId,
      repoId,
      insertedCount,
      totalCommits: graphData.nodes.length,
      durationMs: duration,
    });

    return insertedCount;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Error syncing commits for repo', error, {
      repoId,
      userId,
      durationMs: duration,
    });
    throw error;
  }
}

/**
 * Update contributions table with aggregated daily counts
 * Uses UPSERT to avoid race conditions in concurrent syncs
 * Accepts optional transaction parameter for atomic operations
 */
async function updateContributions(
  userId: number,
  repoId: number,
  commits: Array<{ commitDate: Date }>,
  tx?: Transaction | typeof db
): Promise<void> {
  // Use transaction if provided, otherwise use regular db instance
  const dbInstance = (tx as typeof db) || db;
  
  // Group commits by date (date only, no time)
  const contributionsByDate = new Map<string, number>();
  
  commits.forEach((commit) => {
    // Ensure valid date
    if (!commit.commitDate || isNaN(commit.commitDate.getTime())) {
      logger.warn('Invalid commit date encountered, skipping', {
        commitDate: commit.commitDate,
        repoId,
        userId,
      });
      return;
    }
    const dateKey = commit.commitDate.toISOString().split('T')[0];
    contributionsByDate.set(dateKey, (contributionsByDate.get(dateKey) || 0) + 1);
  });

  // Insert or update contributions using UPSERT to avoid race conditions
  // Process all contributions in a single batch for better performance
  const contributionsToUpsert = Array.from(contributionsByDate.entries()).map(([dateStr, count]) => {
    const contributionDate = new Date(dateStr);
    contributionDate.setHours(0, 0, 0, 0); // Normalize to midnight UTC
    return {
      userId,
      repoId,
      contributionDate,
      commitCount: count,
      updatedAt: new Date(),
    };
  });

  if (contributionsToUpsert.length === 0) {
    return;
  }

  // Use UPSERT for each contribution with proper error handling
  for (const contribution of contributionsToUpsert) {
    try {
      // Try insert first, then update on conflict
      // Note: onConflictDoUpdate requires the unique index to exist
      await dbInstance
        .insert(contributionsTable)
        .values(contribution)
        .onConflictDoUpdate({
          target: [
            contributionsTable.userId,
            contributionsTable.repoId,
            contributionsTable.contributionDate,
          ],
          set: {
            commitCount: contribution.commitCount,
            updatedAt: contribution.updatedAt,
          },
        });
    } catch (error: any) {
      // Log the full error for debugging
      logger.debug('UPSERT error details', {
        error: error.message,
        code: error.code,
        cause: error.cause,
        stack: error.stack?.substring(0, 200),
        dateStr: contribution.contributionDate.toISOString().split('T')[0],
        repoId,
        userId,
      });
      // If onConflictDoUpdate fails (e.g., index not found), fall back to manual check
      if (isDbTimeout(error)) {
        logger.error('DB timeout updating contribution', error, {
          dateStr: contribution.contributionDate.toISOString().split('T')[0],
          repoId,
          userId,
        });
        throw error;
      }

      // Check if it's a duplicate error or constraint issue
      const isDuplicateError = error.code === '23505' || 
        error.cause?.code === '23505' ||
        error.message?.includes('duplicate') || 
        error.message?.includes('unique') ||
        error.message?.includes('constraint');

      if (isDuplicateError || error.message?.includes('Failed query')) {
        // Fallback: try to update existing record
        try {
          const updateResult = await dbInstance
            .update(contributionsTable)
            .set({
              commitCount: contribution.commitCount,
              updatedAt: contribution.updatedAt,
            })
            .where(
              and(
                eq(contributionsTable.userId, userId),
                eq(contributionsTable.repoId, repoId),
                eq(contributionsTable.contributionDate, contribution.contributionDate)
              )
            );

          // If no rows were updated, try inserting again (race condition)
          // Note: Drizzle doesn't return row count easily, so we'll just log
          logger.debug('Updated contribution via fallback', {
            dateStr: contribution.contributionDate.toISOString().split('T')[0],
            repoId,
            userId,
          });
        } catch (updateError: any) {
          // If update also fails, log and continue (don't break entire sync)
          logger.warn('Failed to update contribution, skipping', {
            error: updateError.message,
            code: updateError.code,
            dateStr: contribution.contributionDate.toISOString().split('T')[0],
            repoId,
            userId,
          });
          // Don't throw - continue with other contributions
        }
      } else {
        // Non-duplicate error - log and rethrow
        logger.error('Error updating contribution', error, {
          dateStr: contribution.contributionDate.toISOString().split('T')[0],
          repoId,
          userId,
          code: error.code,
        });
        // Don't throw - continue with other contributions to avoid breaking entire sync
      }
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
  // Validate input parameters
  validateSyncOptions(options);

  const { userId, clerkUserId, githubToken, repoFullName } = options;
  const errors: string[] = [];
  let reposSynced = 0;
  let totalCommits = 0;

  try {
    // Validate userId is a positive integer
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error(`Invalid userId: ${userId}`);
    }

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

    // Sync repositories in parallel for better performance
    const syncPromises = reposToSync.map(async (repo) => {
      try {
        // Validate repo data
        if (!repo.id || !Number.isInteger(repo.id) || repo.id <= 0) {
          throw new Error(`Invalid repo ID for ${repo.fullName || 'unknown'}`);
        }
        if (!repo.fullName || typeof repo.fullName !== 'string') {
          throw new Error(`Invalid repo fullName for repo ID ${repo.id}`);
        }

        const githubService = new GitHubApiService(githubToken, repo.fullName, repo.defaultBranch || 'main', {
          userId,
          clerkUserId,
        });
        const commitCount = await syncRepoCommits(userId, repo.id, githubService);
        return { success: true, commitCount };
      } catch (error: any) {
        logger.error('Failed to sync repository', error, {
          repoFullName: repo.fullName,
          userId,
          clerkUserId,
          code: error.code,
        });
        return { success: false, error: error.message || 'Unknown error', repoFullName: repo.fullName };
      }
    });

    const results = await Promise.all(syncPromises);

    for (const result of results) {
      if (result.success) {
        totalCommits += (result as any).commitCount;
        reposSynced++;
      } else {
        errors.push(`Failed to sync ${(result as any).repoFullName}: ${(result as any).error}`);
      }
    }

    logger.info('Completed contribution sync', {
      userId,
      clerkUserId,
      reposSynced,
      totalCommits,
      errors: errors.length,
    });

    return { reposSynced, totalCommits, errors };
  } catch (error: any) {
    logger.error('Error in syncContributions', error, {
      userId,
      clerkUserId,
      code: error.code,
    });
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
      logger.warn('Commits table does not exist yet. Please run migrations.', {
        userId,
        days,
      });
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
      logger.warn('DB timeout in getContributionsFromDB; returning empty data placeholder.', {
        userId,
        days,
      });
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
      logger.warn('DB timeout in getTotalCommitsCount; returning 0.', { userId });
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
      logger.warn('DB timeout in needsSync; returning true to trigger sync later.', { userId });
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
