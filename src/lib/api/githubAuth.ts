import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { githubRateLimiter } from "@/lib/rateLimit";

/**
 * Shared helper for GitHub API routes.
 * Authenticates, rate-limits, and returns the GitHub token.
 */
export async function getGitHubAuth(rateLimitKey: string) {
  const { userId } = await auth();

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const rateLimitResult = githubRateLimiter.check(
    `github:${rateLimitKey}:${userId}`,
  );
  if (!rateLimitResult.success) {
    return {
      error: NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded",
          },
        },
        { status: 429 },
      ),
    };
  }

  const client = await clerkClient();
  const tokenResponse = await client.users.getUserOauthAccessToken(
    userId,
    "github",
  );
  const token = tokenResponse.data[0]?.token;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "GitHub token not found" },
        { status: 400 },
      ),
    };
  }

  return { token, userId };
}

/**
 * Make an authenticated request to the GitHub API.
 */
export async function githubFetch(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}
