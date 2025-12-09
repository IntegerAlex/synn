import { db } from '@/db';
import { reposTable, usersTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptToken } from './tokenEncryption';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    id: number;
    login: string;
    type: string;
  };
  description: string | null;
  default_branch: string;
  language: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  topics: string[];
  visibility: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

/**
 * Fetches all repositories for a user from GitHub and stores them in the database
 */
export async function syncUserRepos(userId: number, accessToken: string): Promise<void> {
  const allRepos: GitHubRepo[] = [];
  let page = 1;
  let hasMore = true;

  // Fetch all repos with pagination
  while (hasMore) {
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&type=all&per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch repos from GitHub: ${response.statusText}`);
    }

    const repos = await response.json() as GitHubRepo[];

    if (repos.length === 0) {
      hasMore = false;
    } else {
      allRepos.push(...repos);
      hasMore = repos.length === 100;
      page++;
    }
  }

  // Process and store each repository
  for (const repo of allRepos) {
    const metadata = {
      description: repo.description,
      language: repo.language,
      size: repo.size,
      archived: repo.archived,
      disabled: repo.disabled,
      fork: repo.fork,
      topics: repo.topics || [],
      visibility: repo.visibility,
      permissions: repo.permissions,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,
    };

    // Check if repo already exists for this user
    const existingRepo = await db
      .select()
      .from(reposTable)
      .where(
        and(
          eq(reposTable.githubRepoId, repo.id),
          eq(reposTable.userId, userId)
        )
      )
      .limit(1);

    const repoData = {
      userId,
      githubRepoId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      ownerId: repo.owner.id,
      ownerLogin: repo.owner.login,
      ownerType: repo.owner.type,
      description: repo.description,
      defaultBranch: repo.default_branch,
      language: repo.language,
      metadata,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      starsCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      openIssuesCount: repo.open_issues_count,
      syncedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingRepo.length > 0) {
      // Update existing repo
      await db
        .update(reposTable)
        .set(repoData)
        .where(
          and(
            eq(reposTable.githubRepoId, repo.id),
            eq(reposTable.userId, userId)
          )
        );
    } else {
      // Insert new repo
      await db.insert(reposTable).values({
        ...repoData,
        createdAt: new Date(),
      });
    }
  }
}

/**
 * Ensures a user exists in the database, creating them if needed
 * This is useful when the webhook hasn't fired yet or failed
 * Handles cases where user exists by githubId but has different clerkUserId
 * @param clerkUserId - Clerk user ID
 * @param accessToken - GitHub OAuth access token (will be encrypted before storage)
 * @returns The database user ID
 */
export async function ensureUserExists(
  clerkUserId: string,
  accessToken: string
): Promise<number> {
  // Check if user exists by clerkUserId
  const existingUserByClerkId = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  if (existingUserByClerkId.length > 0) {
    return existingUserByClerkId[0].id;
  }

  // Fetch user data from GitHub
  const githubUserResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!githubUserResponse.ok) {
    throw new Error(`Failed to fetch GitHub user data: ${githubUserResponse.statusText}`);
  }

  const githubUser = await githubUserResponse.json();

  // Check if user exists by githubId (might have different clerkUserId)
  const existingUserByGithubId = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.githubId, githubUser.id))
    .limit(1);

  // Encrypt token before storing
  const encryptedAccessToken = encryptToken(accessToken);

  if (existingUserByGithubId.length > 0) {
    // User exists with same GitHub ID but different Clerk ID - update the record
    console.log(`Updating existing user with githubId ${githubUser.id} to use clerkUserId ${clerkUserId}`);
    
    try {
      await db
        .update(usersTable)
        .set({
          clerkUserId,
          name: githubUser.name || githubUser.login,
          email: githubUser.email,
          githubUsername: githubUser.login,
          githubAccessToken: encryptedAccessToken,
          oauthMetadata: {
            provider: 'github',
            providerAccountId: githubUser.id.toString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(usersTable.githubId, githubUser.id));

      // Return the updated user's ID
      return existingUserByGithubId[0].id;
    } catch (updateError: any) {
      // Handle case where clerkUserId might be taken (race condition)
      if (updateError?.code === '23505' && updateError?.constraint === 'users_clerkUserId_unique') {
        // Another user already has this clerkUserId - fetch that user instead
        const userWithClerkId = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.clerkUserId, clerkUserId))
          .limit(1);
        
        if (userWithClerkId.length > 0) {
          return userWithClerkId[0].id;
        }
      }
      throw updateError;
    }
  }

  // Create new user in database
  const newUser = await db
    .insert(usersTable)
    .values({
      clerkUserId,
      name: githubUser.name || githubUser.login,
      email: githubUser.email,
      githubId: githubUser.id,
      githubUsername: githubUser.login,
      githubAccessToken: encryptedAccessToken,
      oauthMetadata: {
        provider: 'github',
        providerAccountId: githubUser.id.toString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return newUser[0].id;
}

/**
 * Syncs repositories for a user by their Clerk user ID
 * Creates the user if they don't exist in the database
 */
export async function syncReposByClerkUserId(
  clerkUserId: string,
  accessToken: string
): Promise<void> {
  const userId = await ensureUserExists(clerkUserId, accessToken);
  await syncUserRepos(userId, accessToken);
}