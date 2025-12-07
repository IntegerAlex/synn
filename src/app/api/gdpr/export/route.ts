import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { usersTable, reposTable, fingerprintsTable, activityLogsTable, apiRequestsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GDPR Data Portability - Export all user data
 * GET /api/gdpr/export
 * 
 * Returns all user data in a JSON format that can be downloaded
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user from database
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found in database' } },
        { status: 404 }
      );
    }

    const user = users[0];
    const userId = user.id;

    // Collect all user data
    const exportData: Record<string, any> = {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        id: user.id,
        clerkUserId: user.clerkUserId,
        name: user.name,
        email: user.email,
        githubId: user.githubId,
        githubUsername: user.githubUsername,
        // Note: GitHub tokens are intentionally excluded for security
        oauthMetadata: user.oauthMetadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      repositories: [],
      fingerprints: [],
      activityLogs: [],
      apiRequests: [],
    };

    // Get repositories
    try {
      const repos = await db
        .select({
          id: reposTable.id,
          githubRepoId: reposTable.githubRepoId,
          name: reposTable.name,
          fullName: reposTable.fullName,
          isPrivate: reposTable.isPrivate,
          ownerLogin: reposTable.ownerLogin,
          ownerType: reposTable.ownerType,
          description: reposTable.description,
          defaultBranch: reposTable.defaultBranch,
          language: reposTable.language,
          htmlUrl: reposTable.htmlUrl,
          starsCount: reposTable.starsCount,
          forksCount: reposTable.forksCount,
          createdAt: reposTable.createdAt,
          updatedAt: reposTable.updatedAt,
          syncedAt: reposTable.syncedAt,
        })
        .from(reposTable)
        .where(eq(reposTable.userId, userId));
      exportData.repositories = repos;
    } catch (error) {
      console.warn('Could not export repositories:', error);
    }

    // Get fingerprints
    try {
      const fingerprints = await db
        .select({
          id: fingerprintsTable.id,
          visitorId: fingerprintsTable.visitorId,
          fingerprintData: fingerprintsTable.fingerprintData,
          browser: fingerprintsTable.browser,
          os: fingerprintsTable.os,
          device: fingerprintsTable.device,
          ipAddress: fingerprintsTable.ipAddress,
          country: fingerprintsTable.country,
          city: fingerprintsTable.city,
          createdAt: fingerprintsTable.createdAt,
          lastSeenAt: fingerprintsTable.lastSeenAt,
        })
        .from(fingerprintsTable)
        .where(eq(fingerprintsTable.userId, userId));
      exportData.fingerprints = fingerprints;
    } catch (error) {
      console.warn('Could not export fingerprints (table may not exist):', error);
    }

    // Get activity logs
    try {
      const activityLogs = await db
        .select({
          id: activityLogsTable.id,
          activityType: activityLogsTable.activityType,
          category: activityLogsTable.category,
          description: activityLogsTable.description,
          repoFullName: activityLogsTable.repoFullName,
          requestMethod: activityLogsTable.requestMethod,
          requestPath: activityLogsTable.requestPath,
          responseStatus: activityLogsTable.responseStatus,
          responseTime: activityLogsTable.responseTime,
          errorCode: activityLogsTable.errorCode,
          errorMessage: activityLogsTable.errorMessage,
          metadata: activityLogsTable.metadata,
          ipAddress: activityLogsTable.ipAddress,
          userAgent: activityLogsTable.userAgent,
          createdAt: activityLogsTable.createdAt,
        })
        .from(activityLogsTable)
        .where(eq(activityLogsTable.userId, userId));
      exportData.activityLogs = activityLogs;
    } catch (error) {
      console.warn('Could not export activity logs (table may not exist):', error);
    }

    // Get API requests
    try {
      const apiRequests = await db
        .select({
          id: apiRequestsTable.id,
          method: apiRequestsTable.method,
          path: apiRequestsTable.path,
          queryParams: apiRequestsTable.queryParams,
          statusCode: apiRequestsTable.statusCode,
          responseTime: apiRequestsTable.responseTime,
          errorCode: apiRequestsTable.errorCode,
          errorMessage: apiRequestsTable.errorMessage,
          metadata: apiRequestsTable.metadata,
          ipAddress: apiRequestsTable.ipAddress,
          userAgent: apiRequestsTable.userAgent,
          createdAt: apiRequestsTable.createdAt,
        })
        .from(apiRequestsTable)
        .where(eq(apiRequestsTable.userId, userId));
      exportData.apiRequests = apiRequests;
    } catch (error) {
      console.warn('Could not export API requests (table may not exist):', error);
    }

    // Add summary
    exportData.summary = {
      totalRepositories: exportData.repositories.length,
      totalFingerprints: exportData.fingerprints.length,
      totalActivityLogs: exportData.activityLogs.length,
      totalApiRequests: exportData.apiRequests.length,
    };

    exportData.notes = {
      encryptedFields: 'Some fields (ipAddress, userAgent, metadata) may be encrypted. Use the /api/admin/decrypt endpoint with your private key to decrypt.',
      excludedData: 'GitHub access tokens and refresh tokens are excluded for security reasons.',
      dataRetention: 'See our privacy policy for information about data retention periods.',
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="synn-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('GDPR export error:', error);
    return NextResponse.json(
      { error: { code: 'EXPORT_ERROR', message: 'Failed to export user data' } },
      { status: 500 }
    );
  }
}

