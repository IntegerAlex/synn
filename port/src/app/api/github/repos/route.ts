import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve the OAuth Access Token
    const client = await clerkClient();
    const tokenResponse = await client.users.getUserOauthAccessToken(userId, 'github');

    const token = tokenResponse.data[0]?.token;

    if (!token) {
        return NextResponse.json({ error: 'GitHub token not found' }, { status: 400 });
    }

    // Fetch Repos from GitHub
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch repos from GitHub' }, { status: response.status });
    }

    const repos = await response.json();

    // Return simplified data
    const simplifiedRepos = repos.map((r: any) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        private: r.private,
        default_branch: r.default_branch,
        owner: r.owner.login,
    }));

    return NextResponse.json(simplifiedRepos);
}
