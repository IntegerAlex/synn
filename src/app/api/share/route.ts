import { randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sharedViewsTable, usersTable } from "@/db/schema";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/services/activityLogger";
import { getGitHubService } from "@/lib/services/githubApiHelper";
import { validateRepoAccess } from "@/lib/services/repoValidator";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

// Generate a URL-friendly share ID (32 characters)
function generateShareId(): string {
  // Generate 24 bytes to ensure we get at least 32 base64url characters
  // base64url encoding: 24 bytes = 32 characters
  return randomBytes(24).toString("base64url").substring(0, 32);
}

// POST /api/share - Create a shared view
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit(`api:share:${clientIp}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests" },
        },
        { status: 429 },
      );
    }

    const { userId: clerkUserId } = await auth();
    let userId: number | undefined;

    if (clerkUserId) {
      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkUserId, clerkUserId))
        .limit(1);
      if (user.length > 0) {
        userId = user[0].id;
      }
    }

    const body = await request.json();
    const { repoFullName, viewState, title, description, expiresInHours } =
      body;

    // Input validation
    if (!repoFullName || typeof repoFullName !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "repoFullName is required and must be a string",
          },
        },
        { status: 400 },
      );
    }

    // Validate repository format (owner/repo)
    if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repoFullName)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "Invalid repository format. Expected: owner/repo",
          },
        },
        { status: 400 },
      );
    }

    if (
      !viewState ||
      typeof viewState !== "object" ||
      Array.isArray(viewState)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: "viewState is required and must be an object",
          },
        },
        { status: 400 },
      );
    }

    // Validate viewState structure to prevent injection
    const allowedKeys = [
      "branch",
      "selectedCommit",
      "graphFilters",
      "graphLimit",
    ];
    const viewStateKeys = Object.keys(viewState);
    const invalidKeys = viewStateKeys.filter(
      (key) => !allowedKeys.includes(key),
    );
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_INPUT",
            message: `Invalid viewState keys: ${invalidKeys.join(", ")}`,
          },
        },
        { status: 400 },
      );
    }

    // Validate graphFilters if present
    if (viewState.graphFilters) {
      if (
        typeof viewState.graphFilters !== "object" ||
        Array.isArray(viewState.graphFilters)
      ) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "graphFilters must be an object",
            },
          },
          { status: 400 },
        );
      }
      const allowedFilterKeys = [
        "showMergeCommits",
        "showTags",
        "highlightedBranches",
      ];
      const filterKeys = Object.keys(viewState.graphFilters);
      const invalidFilterKeys = filterKeys.filter(
        (key) => !allowedFilterKeys.includes(key),
      );
      if (invalidFilterKeys.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: `Invalid graphFilters keys: ${invalidFilterKeys.join(", ")}`,
            },
          },
          { status: 400 },
        );
      }
      // Validate highlightedBranches is an array
      if (
        viewState.graphFilters.highlightedBranches &&
        !Array.isArray(viewState.graphFilters.highlightedBranches)
      ) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "highlightedBranches must be an array",
            },
          },
          { status: 400 },
        );
      }
    }

    // Validate graphLimit if present
    if (viewState.graphLimit !== undefined) {
      const limit = Number(viewState.graphLimit);
      if (!Number.isFinite(limit) || limit < 1 || limit > 10000) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "graphLimit must be between 1 and 10000",
            },
          },
          { status: 400 },
        );
      }
    }

    // Validate expiresInHours if provided
    if (expiresInHours !== undefined) {
      const hours = Number(expiresInHours);
      if (!Number.isFinite(hours) || hours < 0.1 || hours > 8760) {
        // Max 1 year (8760 hours)
        return NextResponse.json(
          {
            error: {
              code: "INVALID_INPUT",
              message: "expiresInHours must be between 0.1 and 8760",
            },
          },
          { status: 400 },
        );
      }
    }

    // SECURITY: Validate repository access before allowing share creation
    if (clerkUserId) {
      const validation = await validateRepoAccess(clerkUserId, repoFullName);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: {
              code: "ACCESS_DENIED",
              message: "You do not have access to this repository",
            },
          },
          { status: 403 },
        );
      }

      // Additional check: Verify repository exists and user can access it via GitHub API
      try {
        const githubService = await getGitHubService(repoFullName);
        const _repoInfo = await githubService.getRepoInfo();

        // Only allow sharing of public repositories OR repositories the user has access to
        // GitHub API will throw if user doesn't have access
      } catch (_error: any) {
        // If user doesn't have access, GitHub API will fail
        return NextResponse.json(
          {
            error: {
              code: "ACCESS_DENIED",
              message:
                "Cannot access this repository. It may be private or you may not have permission.",
            },
          },
          { status: 403 },
        );
      }
    } else {
      // Unauthenticated users cannot create shares
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to create shares",
          },
        },
        { status: 401 },
      );
    }

    // Generate unique share ID
    let shareId = generateShareId();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db
        .select()
        .from(sharedViewsTable)
        .where(eq(sharedViewsTable.shareId, shareId))
        .limit(1);
      if (existing.length === 0) break;
      shareId = generateShareId();
      attempts++;
    }

    // Calculate expiration (default: 1 hour, validated above)
    const hours = expiresInHours ?? 1;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Create shared view
    const [sharedView] = await db
      .insert(sharedViewsTable)
      .values({
        shareId,
        userId: userId || null,
        repoFullName,
        viewState,
        title: title || null,
        description: description || null,
        expiresAt,
      })
      .returning();

    // Get base URL from request headers or env
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host =
      request.headers.get("host") ||
      request.headers.get("x-forwarded-host") ||
      "localhost:3000";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    return NextResponse.json({
      data: {
        shareId: sharedView.shareId,
        url: `${baseUrl}/share/${sharedView.shareId}`,
        createdAt: sharedView.createdAt,
        expiresAt: sharedView.expiresAt,
      },
    });
  } catch (error) {
    console.error("[/api/share] Error:", error);
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}
