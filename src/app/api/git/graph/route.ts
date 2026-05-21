import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fingerprintsTable, sharedViewsTable, usersTable } from "@/db/schema";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  getClientIp,
  getUserAgent,
  logApiRequest,
} from "@/lib/services/activityLogger";
import {
  getGitHubService,
  getGitHubServiceForUser,
} from "@/lib/services/githubApiHelper";
import { validateRepoAccess } from "@/lib/services/repoValidator";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

// GET /api/git/graph - Get graph data
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let userId: number | undefined;
  let fingerprintId: number | undefined;

  // Rate limiting check
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(`api:graph:${clientIp}`);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.reset).toISOString(),
          "Retry-After": Math.ceil(
            (rateLimitResult.reset - Date.now()) / 1000,
          ).toString(),
        },
      },
    );
  }

  try {
    // Run auth and fingerprint header read together, then fan out DB queries in parallel
    const { userId: clerkUserId } = await auth();
    const visitorId = request.headers.get("x-visitor-id");

    // Parallel DB lookups – user and fingerprint are independent
    const [userResult, fingerprintResult] = await Promise.all([
      clerkUserId
        ? db
            .select()
            .from(usersTable)
            .where(eq(usersTable.clerkUserId, clerkUserId))
            .limit(1)
        : Promise.resolve([] as typeof usersTable.$inferSelect[]),
      visitorId
        ? db
            .select()
            .from(fingerprintsTable)
            .where(eq(fingerprintsTable.visitorId, visitorId))
            .limit(1)
            .catch((dbError: unknown) => {
              if (
                (dbError instanceof Error && dbError.message?.includes("does not exist")) ||
                (dbError instanceof Error && dbError.message?.includes("relation"))
              ) {
                return [] as typeof fingerprintsTable.$inferSelect[];
              }
              throw dbError;
            })
        : Promise.resolve([] as typeof fingerprintsTable.$inferSelect[]),
    ]);

    if (userResult.length > 0) {
      userId = userResult[0].id;
    }
    if (fingerprintResult.length > 0) {
      fingerprintId = fingerprintResult[0].id;
    }

    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get("repo");
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const shareId = request.headers.get("x-share-id"); // For shared views

    if (!repoFullName) {
      const responseTime = Date.now() - startTime;
      await logApiRequest({
        userId,
        fingerprintId,
        method: "GET",
        path: "/api/git/graph",
        queryParams: Object.fromEntries(searchParams),
        statusCode: 400,
        responseTime,
        errorCode: "REPO_REQUIRED",
        errorMessage: "Repository name is required",
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json(
        {
          error: {
            code: "REPO_REQUIRED",
            message: "Repository name is required",
          },
        },
        { status: 400 },
      );
    }

    // Handle shared views: if shareId is provided, use creator's token if viewer doesn't have access
    let githubService: Awaited<ReturnType<typeof getGitHubService>> | undefined;
    const { userId: clerkUserIdForValidation } = await auth();

    if (shareId && repoFullName) {
      // This is a shared view request
      const [sharedView] = await db
        .select()
        .from(sharedViewsTable)
        .where(eq(sharedViewsTable.shareId, shareId))
        .limit(1);

      if (sharedView && sharedView.repoFullName === repoFullName) {
        // Verify share is not expired
        if (
          !sharedView.expiresAt ||
          new Date(sharedView.expiresAt) >= new Date()
        ) {
          // Check if viewer has access
          let viewerHasAccess = false;
          if (clerkUserIdForValidation) {
            try {
              githubService = await getGitHubService(repoFullName);
              await githubService.getRepoInfo();
              viewerHasAccess = true;
            } catch {
              // Viewer doesn't have access - use creator's token
              viewerHasAccess = false;
            }
          }

          if (viewerHasAccess) {
            // Viewer has access - use their token (already set above)
            // githubService is already set in the try block above
          } else if (sharedView.userId) {
            // Get creator's Clerk ID and use their token
            const [creator] = await db
              .select()
              .from(usersTable)
              .where(eq(usersTable.id, sharedView.userId))
              .limit(1);

            if (creator) {
              try {
                githubService = await getGitHubServiceForUser(
                  creator.clerkUserId,
                  repoFullName,
                );
              } catch (_error: any) {
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
            } else {
              return NextResponse.json(
                {
                  error: {
                    code: "ACCESS_DENIED",
                    message: "Share creator not found",
                  },
                },
                { status: 403 },
              );
            }
          } else {
            return NextResponse.json(
              {
                error: {
                  code: "ACCESS_DENIED",
                  message: "Authentication required",
                },
              },
              { status: 401 },
            );
          }
        } else {
          return NextResponse.json(
            { error: { code: "EXPIRED", message: "Shared view has expired" } },
            { status: 410 },
          );
        }
      } else {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_SHARE",
              message: "Invalid share ID or repository mismatch",
            },
          },
          { status: 403 },
        );
      }
    } else {
      // Normal request - validate repository access
      if (clerkUserIdForValidation) {
        const validation = await validateRepoAccess(
          clerkUserIdForValidation,
          repoFullName,
        );
        if (!validation.valid) {
          const responseTime = Date.now() - startTime;
          await logApiRequest({
            userId,
            fingerprintId,
            method: "GET",
            path: "/api/git/graph",
            queryParams: Object.fromEntries(searchParams),
            statusCode: 403,
            responseTime,
            errorCode: "ACCESS_DENIED",
            errorMessage: validation.error,
            ipAddress: getClientIp(request),
            userAgent: getUserAgent(request),
          });

          // Note: We log but don't block - GitHub API will enforce actual permissions
          console.warn(
            `Repository access validation warning: ${validation.error}`,
          );
        }
      }

      githubService = await getGitHubService(repoFullName);
    }

    if (!githubService) {
      return NextResponse.json(
        {
          error: {
            code: "SERVICE_ERROR",
            message: "Failed to initialize GitHub service",
          },
        },
        { status: 500 },
      );
    }

    const safeLimit = Math.min(Math.max(limit, 1), 10000);
    const safeOffset = Math.max(0, Number.isFinite(offset) ? offset : 0);
    const graph = await githubService.getGraph(safeLimit, safeOffset);

    const responseTime = Date.now() - startTime;
    await logApiRequest({
      userId,
      fingerprintId,
      method: "GET",
      path: "/api/git/graph",
      queryParams: Object.fromEntries(searchParams),
      statusCode: 200,
      responseTime,
      metadata: {
        repoFullName,
        limit,
        offset,
        nodesCount: graph.nodes.length,
        edgesCount: graph.edges.length,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ data: graph });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const response = formatErrorResponse(error);

    await logApiRequest({
      userId,
      fingerprintId,
      method: "GET",
      path: "/api/git/graph",
      statusCode: 400,
      responseTime,
      errorCode: response.error?.code,
      errorMessage: response.error?.message,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    console.error("[/api/git/graph] Error:", error);
    return NextResponse.json(response, { status: 400 });
  }
}
