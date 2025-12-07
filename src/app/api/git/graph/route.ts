import { NextResponse, type NextRequest } from 'next/server';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/graph - Get graph data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const repoFullName = searchParams.get('repo');
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        
        if (!repoFullName) {
            return NextResponse.json(
                { error: { code: 'REPO_REQUIRED', message: 'Repository name is required' } },
                { status: 400 }
            );
        }

        const githubService = await getGitHubService(repoFullName);
        const graph = await githubService.getGraph(Math.min(Math.max(limit, 1), 10000));
        return NextResponse.json({ data: graph });
    } catch (error) {
        console.error('[/api/git/graph] Error:', error);
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
