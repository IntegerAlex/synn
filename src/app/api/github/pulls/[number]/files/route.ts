import { type NextRequest, NextResponse } from "next/server";
import { getGitHubAuth, githubFetch } from "@/lib/api/githubAuth";

/** GET /api/github/pulls/[number]/files - Get paginated files for a PR */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const authResult = await getGitHubAuth("pulls:files");
  if ("error" in authResult && authResult.error) return authResult.error;
  const { token } = authResult as { token: string };

  const { number } = await params;
  const { searchParams } = new URL(request.url);
  const repo = searchParams.get("repo");
  const page = searchParams.get("page") || "1";
  const perPage = searchParams.get("per_page") || "30";

  if (!repo) {
    return NextResponse.json({ error: "Repository required" }, { status: 400 });
  }

  try {
    const response = await githubFetch(
      `https://api.github.com/repos/${repo}/pulls/${number}/files?per_page=${perPage}&page=${page}`,
      token,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch PR files" },
        { status: response.status },
      );
    }

    const files = await response.json();
    const linkHeader = response.headers.get("Link");

    const simplifiedFiles = (files as Array<Record<string, unknown>>).map(
      (f: Record<string, unknown>) => ({
        sha: f.sha as string,
        filename: f.filename as string,
        status: f.status as string,
        additions: f.additions as number,
        deletions: f.deletions as number,
        changes: f.changes as number,
        patch: f.patch as string | undefined,
        blob_url: f.blob_url as string,
        raw_url: f.raw_url as string,
        contents_url: f.contents_url as string,
      }),
    );

    return NextResponse.json({
      data: simplifiedFiles,
      pagination: {
        page: Number.parseInt(page),
        per_page: Number.parseInt(perPage),
        has_next: linkHeader?.includes('rel="next"') ?? false,
      },
    });
  } catch (error) {
    console.error("Error fetching PR files:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
