import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';

// Ensure Node.js runtime for fs access
export const runtime = 'nodejs';

export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { repo_full_name, default_branch } = await req.json();

    // Get Token (use 'github' not 'oauth_github' per deprecation warning)
    const client = await clerkClient();
    const tokenRes = await client.users.getUserOauthAccessToken(userId, 'github');
    const token = tokenRes.data[0]?.token;

    if (!token) return NextResponse.json({ error: 'No GitHub token' }, { status: 400 });

    // Setup Storage
    const tmpDir = process.env.REPO_STORAGE_PATH || '/tmp';

    // ensure tmpDir exists
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    const safeName = repo_full_name.replace('/', '-');
    const clonePath = path.join(tmpDir, `${userId}-${safeName}`);

    // Remove existing clone if present
    if (fs.existsSync(clonePath)) {
        fs.rmSync(clonePath, { recursive: true, force: true });
    }

    // Clone using authenticated HTTPS URL
    // Format: https://<token>@github.com/owner/repo.git
    const cloneUrl = `https://${token}@github.com/${repo_full_name}.git`;

    try {
        const git = simpleGit();
        await git.clone(cloneUrl, clonePath, ['--branch', default_branch || 'main', '--single-branch']);
    } catch (e: any) {
        console.error('Git clone failed:', e);
        return NextResponse.json({ error: 'Clone failed: ' + e.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        path: clonePath,
        message: 'Repository cloned successfully'
    });
}
