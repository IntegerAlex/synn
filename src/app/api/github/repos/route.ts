import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { reposTable, usersTable } from "@/db/schema";
import { githubRateLimiter } from "@/lib/rateLimit";
import { syncReposByClerkUserId } from "@/lib/services/githubSync";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting check for GitHub API calls
  const rateLimitResult = githubRateLimiter.check(`github:repos:${userId}`);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "GitHub API rate limit exceeded. Please try again later.",
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

  // Retrieve the OAuth Access Token
  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(
    userId,
    "github",
  );

  const token = tokenResponse.data[0]?.token;

  if (!token) {
    return NextResponse.json(
      { error: "GitHub token not found" },
      { status: 400 },
    );
  }

  try {
    // Sync repos to database in the background (don't wait for it)
    syncReposByClerkUserId(userId, token).catch((error) => {
      console.error("Error syncing repos to database:", error);
    });

    // Fetch repos from database if available, otherwise fetch from GitHub
    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId))
      .limit(1);

    if (user.length > 0) {
      const dbRepos = await db
        .select()
        .from(reposTable)
        .where(eq(reposTable.userId, user[0].id));

      // If we have repos in DB, return them
      if (dbRepos.length > 0) {
        return NextResponse.json(
          dbRepos.map((r) => ({
            id: r.githubRepoId,
            name: r.name,
            full_name: r.fullName,
            private: r.isPrivate,
            default_branch: r.defaultBranch || "main", // Ensure it's always a string
            owner: r.ownerLogin,
            description: r.description,
            language: r.language,
            stars_count: r.starsCount,
            forks_count: r.forksCount,
            metadata: r.metadata,
          })),
        );
      }
    }

    // Fallback: Fetch from GitHub API if no DB repos found
    const allRepos: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(
        `https://api.github.com/user/repos?sort=updated&type=all&per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch repos from GitHub" },
          { status: response.status },
        );
      }

      const repos = await response.json();

      if (repos.length === 0) {
        hasMore = false;
      } else {
        allRepos.push(...repos);
        hasMore = repos.length === 100;
        page++;
      }
    }

    // Return simplified data
    const simplifiedRepos = allRepos.map((r: any) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      default_branch: r.default_branch,
      owner: r.owner.login,
      description: r.description,
      language: r.language,
      stars_count: r.stargazers_count,
      forks_count: r.forks_count,
    }));

    return NextResponse.json(simplifiedRepos);
  } catch (error) {
    console.error("Error in GET /api/github/repos:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
