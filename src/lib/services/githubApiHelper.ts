import { auth } from "@clerk/nextjs/server";
import { getGitHubToken } from "@/lib/api/githubAuth";
import { GitHubApiService } from "./githubApi";

/**
 * Get GitHub API service for the authenticated user and selected repository
 * @param repoFullName - The full name of the repository (owner/repo)
 * @param defaultBranch - Optional default branch
 */
export async function getGitHubService(
  repoFullName: string,
  defaultBranch?: string,
): Promise<GitHubApiService> {
  // Validate repo format
  if (!repoFullName?.includes("/")) {
    throw new Error("Invalid repository format. Expected: owner/repo");
  }

  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const token = await getGitHubToken(userId);

  if (!token) {
    throw new Error(
      "No GitHub token found. Please reconnect your GitHub account.",
    );
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
  defaultBranch?: string,
): Promise<GitHubApiService> {
  // Validate repo format
  if (!repoFullName?.includes("/")) {
    throw new Error("Invalid repository format. Expected: owner/repo");
  }

  const token = await getGitHubToken(clerkUserId);

  if (!token) {
    throw new Error("No GitHub token found for the share creator.");
  }

  return new GitHubApiService(token, repoFullName, defaultBranch, {
    clerkUserId,
  });
}
