import { NextResponse, type NextRequest } from 'next/server';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/branches - Get all branches
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const repoFullName = searchParams.get('repo');
        
        if (!repoFullName) {
            return NextResponse.json(
                { error: { code: 'REPO_REQUIRED', message: 'Repository name is required' } },
                { status: 400 }
            );
        }

        const githubService = await getGitHubService(repoFullName);
        const branches = await githubService.getBranches();
        return NextResponse.json({ data: branches });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
