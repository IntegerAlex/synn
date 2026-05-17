import { type NextRequest, NextResponse } from "next/server";
import { getGitHubService } from "@/lib/services/githubApiHelper";
import { formatErrorResponse } from "@/lib/utils/errorHandler";

// GET /api/git/commits/[hash] - Get commit details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hash: string }> },
) {
  try {
    const { hash } = await params;
    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get("repo");

    if (!hash || hash.length < 4) {
      return NextResponse.json(
        { error: { code: "INVALID_HASH", message: "Invalid commit hash" } },
        { status: 400 },
      );
    }

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
    const details = await githubService.getCommitDetails(hash);
    return NextResponse.json({ data: details });
  } catch (error) {
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}
