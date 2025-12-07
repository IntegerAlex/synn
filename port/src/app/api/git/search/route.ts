import { NextResponse, type NextRequest } from 'next/server';
import { gitService } from '@/lib/git/GitService';
import { formatErrorResponse } from '@/lib/utils/errorHandler';

// GET /api/git/search - Search commits and branches
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        if (!query || query.length < 1) {
            return NextResponse.json(
                { error: { code: 'INVALID_QUERY', message: 'Search query is required' } },
                { status: 400 }
            );
        }
        const results = await gitService.search(query);
        return NextResponse.json({ data: results });
    } catch (error) {
        const response = formatErrorResponse(error);
        return NextResponse.json(response, { status: 400 });
    }
}
