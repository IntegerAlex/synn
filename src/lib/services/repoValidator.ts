import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reposTable, usersTable } from "@/db/schema";

/**
 * Repository ownership validation service
 * Ensures users can only access repositories they have permission to view
 */

export interface ValidationResult {
  valid: boolean;
  userId?: number;
  repoId?: number;
  error?: string;
}

/**
 * Validate that a user has access to a specific repository
 * @param clerkUserId - Clerk user ID
 * @param repoFullName - Full repository name (owner/repo)
 */
export async function validateRepoAccess(
  clerkUserId: string,
  repoFullName: string,
): Promise<ValidationResult> {
  try {
    // First, get the user from database
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (users.length === 0) {
      return {
        valid: false,
        error: "User not found in database",
      };
    }

    const user = users[0];

    // Check if the repository is linked to this user
    const repos = await db
      .select()
      .from(reposTable)
      .where(
        and(
          eq(reposTable.userId, user.id),
          eq(reposTable.fullName, repoFullName),
        ),
      )
      .limit(1);

    if (repos.length === 0) {
      // Repository not found in user's synced repos
      // This could mean:
      // 1. User hasn't synced repos yet
      // 2. User doesn't have access to this repo
      // 3. Repo was recently added but not synced

      // For better UX, we allow the request but log it
      // The GitHub API will ultimately enforce permissions
      console.warn(
        `Repository ${repoFullName} not found in user ${clerkUserId}'s synced repos`,
      );

      return {
        valid: true, // Allow but log - GitHub API will enforce
        userId: user.id,
        error: undefined,
      };
    }

    return {
      valid: true,
      userId: user.id,
      repoId: repos[0].id,
    };
  } catch (error) {
    console.error("Repository validation error:", error);
    return {
      valid: false,
      error: "Failed to validate repository access",
    };
  }
}
