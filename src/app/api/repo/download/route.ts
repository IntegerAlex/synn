import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { GitHubApiService } from '@/lib/services/githubApi';

/**
 * Select a repository for visualization
 * Instead of cloning locally (which doesn't work on Vercel),
 * we use GitHub API to access repository data
 */
export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { repo_full_name, default_branch } = await req.json();

    if (!repo_full_name) {
        return NextResponse.json({ error: 'Repository name is required' }, { status: 400 });
    }

    // Get Token (use 'github' not 'oauth_github' per deprecation warning)
    const client = await clerkClient();
    const tokenRes = await client.users.getUserOauthAccessToken(userId, 'github');
    const token = tokenRes.data[0]?.token;

    if (!token) return NextResponse.json({ error: 'No GitHub token' }, { status: 400 });

    try {
        // Initialize GitHub API service to verify access
        const githubService = new GitHubApiService(token, repo_full_name, default_branch);
        const repoInfo = await githubService.getRepoInfo();

        // Return repo info instead of local path
        // The frontend will use this to make API calls
        return NextResponse.json({
            success: true,
            repo_full_name,
            default_branch: repoInfo.currentBranch,
            message: 'Repository selected successfully'
        });
    } catch (e: any) {
        console.error('Failed to access repository:', e);
        return NextResponse.json({ 
            error: 'Failed to access repository: ' + (e.message || 'Unknown error') 
        }, { status: 500 });
    }
}
