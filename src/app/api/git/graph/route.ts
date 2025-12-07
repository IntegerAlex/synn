import { NextResponse, type NextRequest } from 'next/server';
import { getGitHubService } from '@/lib/services/githubApiHelper';
import { formatErrorResponse } from '@/lib/utils/errorHandler';
import { logApiRequest, getClientIp, getUserAgent } from '@/lib/services/activityLogger';
import { validateRepoAccess } from '@/lib/services/repoValidator';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { usersTable, fingerprintsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/git/graph - Get graph data
export async function GET(request: NextRequest) {
    const startTime = Date.now();
    let userId: number | undefined;
    let fingerprintId: number | undefined;
    
    try {
        // Get user ID if authenticated
        const { userId: clerkUserId } = await auth();
        if (clerkUserId) {
            const user = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.clerkUserId, clerkUserId))
                .limit(1);
            if (user.length > 0) {
                userId = user[0].id;
            }
        }

        // Get fingerprint ID from header (set by client)
        const visitorId = request.headers.get('x-visitor-id');
        if (visitorId) {
            try {
                const fingerprint = await db
                    .select()
                    .from(fingerprintsTable)
                    .where(eq(fingerprintsTable.visitorId, visitorId))
                    .limit(1);
                if (fingerprint.length > 0) {
                    fingerprintId = fingerprint[0].id;
                }
            } catch (dbError: any) {
                // Table might not exist - just continue without fingerprintId
                if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation')) {
                    // Silently continue - fingerprint tracking is optional
                } else {
                    throw dbError;
                }
            }
        }

        const { searchParams } = new URL(request.url);
        const repoFullName = searchParams.get('repo');
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        
        if (!repoFullName) {
            const responseTime = Date.now() - startTime;
            await logApiRequest({
                userId,
                fingerprintId,
                method: 'GET',
                path: '/api/git/graph',
                queryParams: Object.fromEntries(searchParams),
                statusCode: 400,
                responseTime,
                errorCode: 'REPO_REQUIRED',
                errorMessage: 'Repository name is required',
                ipAddress: getClientIp(request),
                userAgent: getUserAgent(request),
            });
            
            return NextResponse.json(
                { error: { code: 'REPO_REQUIRED', message: 'Repository name is required' } },
                { status: 400 }
            );
        }

        // Validate repository access
        const { userId: clerkUserIdForValidation } = await auth();
        if (clerkUserIdForValidation) {
            const validation = await validateRepoAccess(clerkUserIdForValidation, repoFullName);
            if (!validation.valid) {
                const responseTime = Date.now() - startTime;
                await logApiRequest({
                    userId,
                    fingerprintId,
                    method: 'GET',
                    path: '/api/git/graph',
                    queryParams: Object.fromEntries(searchParams),
                    statusCode: 403,
                    responseTime,
                    errorCode: 'ACCESS_DENIED',
                    errorMessage: validation.error,
                    ipAddress: getClientIp(request),
                    userAgent: getUserAgent(request),
                });
                
                // Note: We log but don't block - GitHub API will enforce actual permissions
                console.warn(`Repository access validation warning: ${validation.error}`);
            }
        }

        const githubService = await getGitHubService(repoFullName);
        const graph = await githubService.getGraph(Math.min(Math.max(limit, 1), 10000));
        
        const responseTime = Date.now() - startTime;
        await logApiRequest({
            userId,
            fingerprintId,
            method: 'GET',
            path: '/api/git/graph',
            queryParams: Object.fromEntries(searchParams),
            statusCode: 200,
            responseTime,
            metadata: { 
                repoFullName,
                limit,
                nodesCount: graph.nodes.length,
                edgesCount: graph.edges.length,
            },
            ipAddress: getClientIp(request),
            userAgent: getUserAgent(request),
        });
        
        return NextResponse.json({ data: graph });
    } catch (error) {
        const responseTime = Date.now() - startTime;
        const response = formatErrorResponse(error);
        
        await logApiRequest({
            userId,
            fingerprintId,
            method: 'GET',
            path: '/api/git/graph',
            statusCode: 400,
            responseTime,
            errorCode: response.error?.code,
            errorMessage: response.error?.message,
            ipAddress: getClientIp(request),
            userAgent: getUserAgent(request),
        });
        
        console.error('[/api/git/graph] Error:', error);
        return NextResponse.json(response, { status: 400 });
    }
}
