import { auth, clerkClient } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { githubRateLimiter } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimitResult = githubRateLimiter.check(`github:insights:${userId}`);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: { code: "RATE_LIMIT_EXCEEDED", message: "Rate limit exceeded" },
      },
      { status: 429 },
    );
  }

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

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json({ error: "Repository required" }, { status: 400 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  try {
    // Fetch repo info, languages, and contributors in parallel
    const [repoRes, languagesRes, contributorsRes, commitsRes] =
      await Promise.all([
        fetch(`https://api.github.com/repos/${repo}`, { headers }),
        fetch(`https://api.github.com/repos/${repo}/languages`, { headers }),
        fetch(`https://api.github.com/repos/${repo}/contributors?per_page=10`, {
          headers,
        }),
        fetch(`https://api.github.com/repos/${repo}/commits?per_page=30`, {
          headers,
        }),
      ]);

    if (!repoRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch repository data" },
        { status: repoRes.status },
      );
    }

    const repoData = await repoRes.json();
    const languages = languagesRes.ok ? await languagesRes.json() : {};
    const contributors = contributorsRes.ok ? await contributorsRes.json() : [];
    const commits = commitsRes.ok ? await commitsRes.json() : [];

    // Calculate language percentages
    const totalBytes = Object.values(
      languages as Record<string, number>,
    ).reduce((sum: number, bytes: number) => sum + bytes, 0);
    const languagePercentages = Object.entries(
      languages as Record<string, number>,
    ).map(([name, bytes]) => ({
      name,
      bytes,
      percentage:
        totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0, // Round to 1 decimal place
    }));

    // Process commit activity (last 30 commits)
    const commitActivity = commits.map((c: any) => ({
      sha: c.sha?.substring(0, 7),
      date: c.commit?.author?.date,
      author: c.commit?.author?.name,
    }));

    // Process contributors
    const topContributors = Array.isArray(contributors)
      ? contributors.map((c: any) => ({
          login: c.login,
          avatar_url: c.avatar_url,
          contributions: c.contributions,
        }))
      : [];

    return NextResponse.json({
      data: {
        repo: {
          name: repoData.name,
          full_name: repoData.full_name,
          description: repoData.description,
          stars: repoData.stargazers_count,
          forks: repoData.forks_count,
          watchers: repoData.watchers_count,
          open_issues: repoData.open_issues_count,
          size: repoData.size,
          default_branch: repoData.default_branch,
          created_at: repoData.created_at,
          updated_at: repoData.updated_at,
          pushed_at: repoData.pushed_at,
          license: repoData.license?.spdx_id,
          topics: repoData.topics,
          visibility: repoData.visibility,
          has_issues: repoData.has_issues,
          has_wiki: repoData.has_wiki,
          archived: repoData.archived,
          network_count: repoData.network_count,
          subscribers_count: repoData.subscribers_count,
        },
        languages: languagePercentages,
        contributors: topContributors,
        recent_commits: commitActivity,
      },
    });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
