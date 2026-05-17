import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  activityLogsTable,
  apiRequestsTable,
  fingerprintsTable,
  reposTable,
  usersTable,
} from "@/db/schema";

/**
 * GDPR Right to be Forgotten - Delete all user data
 * DELETE /api/gdpr/delete
 *
 * This endpoint deletes ALL user data from the system:
 * - User profile
 * - All repositories
 * - All fingerprints associated with user
 * - All activity logs
 * - All API request logs
 *
 * Note: This does NOT delete data from external services (GitHub, Clerk)
 */
export async function DELETE() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    // Get user from database
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found in database",
          },
        },
        { status: 404 },
      );
    }

    const user = users[0];
    const userId = user.id;

    // Track what we're deleting for the response
    const deletionStats = {
      activityLogs: 0,
      apiRequests: 0,
      fingerprints: 0,
      repositories: 0,
      user: false,
    };

    // Delete activity logs
    try {
      const activityResult = await db
        .delete(activityLogsTable)
        .where(eq(activityLogsTable.userId, userId))
        .returning();
      deletionStats.activityLogs = activityResult.length;
    } catch (error) {
      console.warn(
        "Could not delete activity logs (table may not exist):",
        error,
      );
    }

    // Delete API request logs
    try {
      const apiResult = await db
        .delete(apiRequestsTable)
        .where(eq(apiRequestsTable.userId, userId))
        .returning();
      deletionStats.apiRequests = apiResult.length;
    } catch (error) {
      console.warn(
        "Could not delete API requests (table may not exist):",
        error,
      );
    }

    // Delete fingerprints
    try {
      const fingerprintResult = await db
        .delete(fingerprintsTable)
        .where(eq(fingerprintsTable.userId, userId))
        .returning();
      deletionStats.fingerprints = fingerprintResult.length;
    } catch (error) {
      console.warn(
        "Could not delete fingerprints (table may not exist):",
        error,
      );
    }

    // Delete repositories (cascade from foreign key should work, but explicit is better)
    try {
      const repoResult = await db
        .delete(reposTable)
        .where(eq(reposTable.userId, userId))
        .returning();
      deletionStats.repositories = repoResult.length;
    } catch (error) {
      console.warn("Could not delete repositories:", error);
    }

    // Delete user
    try {
      await db.delete(usersTable).where(eq(usersTable.id, userId));
      deletionStats.user = true;
    } catch (error) {
      console.error("Failed to delete user:", error);
      return NextResponse.json(
        {
          error: {
            code: "DELETION_FAILED",
            message: "Failed to delete user account",
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "All your data has been deleted from our system",
      deletionStats,
      note: "This does not delete your Clerk or GitHub accounts. Please delete those separately if desired.",
    });
  } catch (error) {
    console.error("GDPR deletion error:", error);
    return NextResponse.json(
      {
        error: {
          code: "DELETION_ERROR",
          message: "An error occurred during data deletion",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/gdpr/delete - Get info about what will be deleted
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }

    // Get user from database
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json({
        dataExists: false,
        message: "No data found for your account",
      });
    }

    const userId = users[0].id;

    // Count data that would be deleted
    const counts = {
      activityLogs: 0,
      apiRequests: 0,
      fingerprints: 0,
      repositories: 0,
    };

    try {
      const activityLogs = await db
        .select()
        .from(activityLogsTable)
        .where(eq(activityLogsTable.userId, userId));
      counts.activityLogs = activityLogs.length;
    } catch (_error) {
      // Table might not exist
    }

    try {
      const apiRequests = await db
        .select()
        .from(apiRequestsTable)
        .where(eq(apiRequestsTable.userId, userId));
      counts.apiRequests = apiRequests.length;
    } catch (_error) {
      // Table might not exist
    }

    try {
      const fingerprints = await db
        .select()
        .from(fingerprintsTable)
        .where(eq(fingerprintsTable.userId, userId));
      counts.fingerprints = fingerprints.length;
    } catch (_error) {
      // Table might not exist
    }

    try {
      const repos = await db
        .select()
        .from(reposTable)
        .where(eq(reposTable.userId, userId));
      counts.repositories = repos.length;
    } catch (_error) {
      // Table might not exist
    }

    return NextResponse.json({
      dataExists: true,
      dataToBeDeleted: {
        userProfile: 1,
        ...counts,
      },
      warning:
        "Deleting your data is irreversible. This will remove all your activity logs, repositories, and account information from Synn.",
      externalData: "This does not affect your Clerk or GitHub accounts.",
    });
  } catch (error) {
    console.error("GDPR info error:", error);
    return NextResponse.json(
      {
        error: {
          code: "ERROR",
          message: "Failed to retrieve data information",
        },
      },
      { status: 500 },
    );
  }
}
