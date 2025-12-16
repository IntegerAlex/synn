import { NextResponse, type NextRequest } from 'next/server';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/file-history - List commits affecting a file
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get('repo');
    const filePath = searchParams.get('filepath');
    const ref = searchParams.get('ref') || undefined;
    const limitRaw = searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : 50;

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
    const history = await githubService.getFileHistory(filePath, ref, Number.isFinite(limit) ? limit : 50);
    return NextResponse.json({ data: history });
  } catch (error) {
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}

