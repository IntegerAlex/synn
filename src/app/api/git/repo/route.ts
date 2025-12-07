import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gitService } from '@/lib/git/GitService';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

const SetRepoSchema = z.object({
    path: z.string().min(1, 'Path is required'),
});

// GET /api/git/repo - Get repository info
export async function GET() {
    try {
        const info = await gitService.getRepoInfo();
        return NextResponse.json({ data: info });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}

// POST /api/git/repo - Set repository path
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path } = SetRepoSchema.parse(body);
        gitService.setRepository(path);
        const fullInfo = await gitService.getRepoInfo();
        return NextResponse.json({ data: fullInfo });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
