import { NextResponse, type NextRequest } from 'next/server';
import { gitService } from '@/lib/git/GitService';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/commits/[hash] - Get commit details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ hash: string }> }
) {
    try {
        const { hash } = await params;
        if (!hash || hash.length < 4) {
            return NextResponse.json(
                { error: { code: 'INVALID_HASH', message: 'Invalid commit hash' } },
                { status: 400 }
            );
        }
        const details = await gitService.getCommitDetails(hash);
        return NextResponse.json({ data: details });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
