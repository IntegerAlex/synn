import { auth, clerkClient } from '@clerk/nextjs/server';
import { GitHubApiService } from './githubApi';

/**
 * Get GitHub API service for the authenticated user and selected repository
 * @param repoFullName - The full name of the repository (owner/repo)
 * @param defaultBranch - Optional default branch
 */
export async function getGitHubService(
  repoFullName: string,
  defaultBranch?: string
): Promise<GitHubApiService> {
  // Validate repo format
  if (!repoFullName || !repoFullName.includes('/')) {
    throw new Error('Invalid repository format. Expected: owner/repo');
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthorized');
  }

  const client = await clerkClient();
  const tokenRes = await client.users.getUserOauthAccessToken(userId, 'github');
  const token = tokenRes.data[0]?.token;

  if (!token) {
    throw new Error('No GitHub token found. Please reconnect your GitHub account.');
  }

  return new GitHubApiService(token, repoFullName, defaultBranch, {
    clerkUserId: userId,
  });
}

/**
 * Get GitHub API service using a specific user's token (for shared views)
 * @param clerkUserId - Clerk user ID of the user whose token to use
 * @param repoFullName - The full name of the repository (owner/repo)
 * @param defaultBranch - Optional default branch
 */
export async function getGitHubServiceForUser(
  clerkUserId: string,
  repoFullName: string,
  defaultBranch?: string
): Promise<GitHubApiService> {
  // Validate repo format
  if (!repoFullName || !repoFullName.includes('/')) {
    throw new Error('Invalid repository format. Expected: owner/repo');
  }

  const client = await clerkClient();
  const tokenRes = await client.users.getUserOauthAccessToken(clerkUserId, 'github');
  const token = tokenRes.data[0]?.token;

  if (!token) {
    throw new Error('No GitHub token found for the share creator.');
  }

  return new GitHubApiService(token, repoFullName, defaultBranch, {
    clerkUserId,
  });
}

