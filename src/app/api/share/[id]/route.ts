import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sharedViewsTable, usersTable } from "@/db/schema";
import {
  getGitHubService,
  getGitHubServiceForUser,
} from "@/lib/services/githubApiHelper";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

// GET /api/share/[id] - Get shared view
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Validate share ID format (should be base64url, 16-32 chars)
    if (
      !id ||
      id.length < 16 ||
      id.length > 32 ||
      !/^[A-Za-z0-9_-]+$/.test(id)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_SHARE_ID",
            message: "Invalid share ID format",
          },
        },
        { status: 400 },
      );
    }

    // Find shared view (check expiration)
    // First, get the view to check expiration manually (drizzle doesn't support conditional where clauses easily)
    const [sharedView] = await db
      .select()
      .from(sharedViewsTable)
      .where(eq(sharedViewsTable.shareId, id))
      .limit(1);

    // Check if view exists and is not expired
    if (!sharedView) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Shared view not found" } },
        { status: 404 },
      );
    }

    // Check expiration
    if (sharedView.expiresAt && new Date(sharedView.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: { code: "EXPIRED", message: "Shared view has expired" } },
        { status: 410 },
      );
    }

    // SECURITY: Allow viewing shared views (even for private repos)
    // If viewer has access, use their token. Otherwise, use creator's token.
    const { userId: viewerClerkUserId } = await auth();

    // Get creator's Clerk user ID if available
    let creatorClerkUserId: string | null = null;
    if (sharedView.userId) {
      const [creator] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, sharedView.userId))
        .limit(1);
      if (creator) {
        creatorClerkUserId = creator.clerkUserId;
      }
    }

    // Try to verify repository access
    let hasAccess = false;

    if (viewerClerkUserId) {
      // Viewer is authenticated - check if they have access
      try {
        const githubService = await getGitHubService(sharedView.repoFullName);
        await githubService.getRepoInfo();
        hasAccess = true;
      } catch {
        // Viewer doesn't have access - will use creator's token below
        hasAccess = false;
      }
    }

    // If viewer doesn't have access, verify creator's token is available
    if (!hasAccess) {
      if (!creatorClerkUserId) {
        // No creator token available - require authentication
        return NextResponse.json(
          {
            error: {
              code: "AUTH_REQUIRED",
              message: "Authentication required to view this shared repository",
            },
          },
          { status: 401 },
        );
      }

      // Verify creator's token still works and has access
      try {
        const creatorService = await getGitHubServiceForUser(
          creatorClerkUserId,
          sharedView.repoFullName,
        );
        await creatorService.getRepoInfo();
        // Creator's token is valid - allow access
      } catch (_error: any) {
        // Creator's token is invalid or expired
        return NextResponse.json(
          {
            error: {
              code: "ACCESS_DENIED",
              message:
                "The share creator no longer has access to this repository",
            },
          },
          { status: 403 },
        );
      }
    }

    // Increment view count and update last viewed
    await db
      .update(sharedViewsTable)
      .set({
        viewCount: sharedView.viewCount + 1,
        lastViewedAt: new Date(),
      })
      .where(eq(sharedViewsTable.id, sharedView.id));

    return NextResponse.json({
      data: {
        shareId: sharedView.shareId,
        repoFullName: sharedView.repoFullName,
        viewState: sharedView.viewState,
        title: sharedView.title,
        description: sharedView.description,
        createdAt: sharedView.createdAt,
        expiresAt: sharedView.expiresAt,
        viewCount: sharedView.viewCount + 1,
        // Include creator's clerkUserId so graph API can use their token if viewer doesn't have access
        creatorClerkUserId: creatorClerkUserId || undefined,
        viewerHasAccess: hasAccess,
      },
    });
  } catch (error) {
    console.error("[/api/share/[id]] Error:", error);
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}
