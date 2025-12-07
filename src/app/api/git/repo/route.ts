import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

const SetRepoSchema = z.object({
    repo_full_name: z.string()
        .min(1, 'Repository name is required')
        .regex(/^[^\/]+\/[^\/]+$/, 'Repository must be in format: owner/repo'),
    default_branch: z.union([z.string(), z.null(), z.undefined()]).optional(),
});

// GET /api/git/repo - Get repository info
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
        const info = await githubService.getRepoInfo();
        return NextResponse.json({ data: info });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}

// POST /api/git/repo - Set repository (now accepts repo_full_name instead of path)
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { repo_full_name, default_branch } = SetRepoSchema.parse(body);
        
        const githubService = await getGitHubService(repo_full_name, default_branch);
        const fullInfo = await githubService.getRepoInfo();
        return NextResponse.json({ data: fullInfo });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
