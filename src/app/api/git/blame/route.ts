import { NextRequest, NextResponse } from 'next/server';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/blame - Get git blame information for a file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get('repo');
    const filePath = searchParams.get('filepath');
    const ref = searchParams.get('ref') || undefined;

    if (!repoFullName) {
      return NextResponse.json(
        { error: { code: 'REPO_REQUIRED', message: 'Repository name is required' } },
        { status: 400 }
      );
    }

    if (!filePath) {
      return NextResponse.json(
        { error: { code: 'FILEPATH_REQUIRED', message: 'filepath is required' } },
        { status: 400 }
      );
    }

    const githubService = await getGitHubService(repoFullName);
    const blameInfo = await githubService.getBlame(filePath, ref);
    return NextResponse.json({ data: blameInfo });
  } catch (error) {
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}
