import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

interface GitHubBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

/** GET /api/github/branches - Get branches for a GitHub repo */
export async function GET(request: NextRequest) {
  const authResult = await getGitHubAuth("branches");
  if ("error" in authResult && authResult.error) return authResult.error;
  const { token } = authResult as { token: string };

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "100";

  if (!repo) {
    return NextResponse.json({ error: "Repository required" }, { status: 400 });
  }

  try {
    // Fetch branches and repo info in parallel
    const [branchesRes, repoRes] = await Promise.all([
      githubFetch(
        `https://api.github.com/repos/${repo}/branches?per_page=${perPage}&page=${page}`,
        token,
      ),
      githubFetch(`https://api.github.com/repos/${repo}`, token),
    ]);

    if (!branchesRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch branches" },
        { status: branchesRes.status },
      );
    }

    const branches: GitHubBranch[] = await branchesRes.json();
    const repoData = repoRes.ok
      ? ((await repoRes.json()) as { default_branch: string })
      : null;
    const defaultBranch = repoData?.default_branch ?? "main";

    const linkHeader = branchesRes.headers.get("Link");

    const simplifiedBranches = branches.map((b) => ({
      name: b.name,
      sha: b.commit.sha,
      protected: b.protected,
      isDefault: b.name === defaultBranch,
    }));

    return NextResponse.json({
      data: {
        branches: simplifiedBranches,
        defaultBranch,
      },
      pagination: {
        page: Number.parseInt(page, 10),
        per_page: Number.parseInt(perPage, 10),
        has_next: linkHeader?.includes('rel="next"') ?? false,
      },
    });
  } catch (error) {
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
