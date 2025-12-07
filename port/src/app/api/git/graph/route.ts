import { NextResponse, type NextRequest } from 'next/server';
import { gitService } from '@/lib/git/GitService';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/graph - Get graph data
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const graph = await gitService.getGraph(Math.min(Math.max(limit, 1), 10000));
        return NextResponse.json({ data: graph });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
