import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** GET /api/github/branches/compare?repo=owner/repo&base=main&head=feature */
export async function GET(request: NextRequest) {
  const authResult = await getGitHubAuth("branches:compare");
  if ("error" in authResult && authResult.error) return authResult.error;
  const { token } = authResult as { token: string };

  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const base = searchParams.get("base");
  const head = searchParams.get("head");

  if (!repo || !base || !head) {
    return NextResponse.json(
      { error: "Repository, base, and head are required" },
      { status: 400 },
    );
  }

  try {
    const response = await githubFetch(
      `https://api.github.com/repos/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
      token,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to compare branches" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    return NextResponse.json({
      data: {
        status: data.status as string,
        ahead_by: data.ahead_by as number,
        behind_by: data.behind_by as number,
        total_commits: data.total_commits as number,
        files: (
          (data.files as Array<Record<string, unknown>>) ?? []
        ).map((f) => ({
          filename: f.filename as string,
          status: f.status as string,
          additions: f.additions as number,
          deletions: f.deletions as number,
          changes: f.changes as number,
          patch: f.patch as string | undefined,
        })),
      },
    });
  } catch (error) {
    console.error("Error comparing branches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
