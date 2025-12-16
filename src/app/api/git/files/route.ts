import { NextResponse, type NextRequest } from 'next/server';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/files - List repository files (default branch or ref)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const repoFullName = searchParams.get('repo');
    const ref = searchParams.get('ref') || undefined;

    if (!repoFullName) {
      return NextResponse.json(
        { error: { code: 'REPO_REQUIRED', message: 'Repository name is required' } },
        { status: 400 }
      );
    }

    const githubService = await getGitHubService(repoFullName);
    const files = await githubService.getFiles(ref);
    return NextResponse.json({ data: files });
  } catch (error) {
    const response = formatErrorResponse(error);
    return NextResponse.json(response, { status: 400 });
  }
}

