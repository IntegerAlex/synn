import { NextResponse } from 'next/server';
import { gitService } from '@/lib/git/GitService';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/branches - Get all branches
export async function GET() {
    try {
        const branches = await gitService.getBranches();
        return NextResponse.json({ data: branches });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
