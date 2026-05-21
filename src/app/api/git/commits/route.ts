import { type NextRequest, NextResponse } from "next/server";
import { getGitHubService } from "@/lib/services/githubApiHelper";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

// GET /api/git/commits - Get commits list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get("repo");
    const branch = searchParams.get("branch");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    if (!repoFullName) {
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

    const githubService = await getGitHubService(repoFullName);
    const commits = await githubService.getCommits(
      branch || undefined,
      Math.min(Math.max(limit, 1), 10000),
    );
    return NextResponse.json(
      { data: commits },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}
