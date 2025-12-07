import { db } from '@/db';
import { activityLogsTable, apiRequestsTable, fingerprintsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface LogActivityParams {
  userId?: number;
  fingerprintId?: number;
  activityType: string;
  category?: string;
  description?: string;
  repoFullName?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
  responseTime?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

interface LogApiRequestParams {
  userId?: number;
  fingerprintId?: number;
  method: string;
  path: string;
  queryParams?: Record<string, unknown>;
  statusCode: number;
  responseTime?: number;
  requestSize?: number;
  responseSize?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log user activity to the database
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      userId: params.userId,
      fingerprintId: params.fingerprintId,
      activityType: params.activityType,
      category: params.category,
      description: params.description,
      repoFullName: params.repoFullName,
      requestMethod: params.requestMethod,
      requestPath: params.requestPath,
      responseStatus: params.responseStatus,
      responseTime: params.responseTime,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log API request to the database
 */
export async function logApiRequest(params: LogApiRequestParams): Promise<void> {
  try {
    await db.insert(apiRequestsTable).values({
      userId: params.userId,
      fingerprintId: params.fingerprintId,
      method: params.method,
      path: params.path,
      queryParams: params.queryParams,
      statusCode: params.statusCode,
      responseTime: params.responseTime,
      requestSize: params.requestSize,
      responseSize: params.responseSize,
      errorCode: params.errorCode,
      errorMessage: params.errorMessage,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to log API request:', error);
  }
}

/**
 * Store or update fingerprint data
 */
export async function storeFingerprint(params: {
  visitorId: string;
  userId?: number;
  fingerprintData: any; // Accept any structure
  ipAddress?: string;
  userAgent?: string;
}): Promise<number> {
  try {
    // Check if fingerprint already exists
    let existing: any[] = [];
    try {
      existing = await db
        .select()
        .from(fingerprintsTable)
        .where(eq(fingerprintsTable.visitorId, params.visitorId))
        .limit(1);
    } catch (dbError: any) {
      // Table might not exist yet - log and return 0
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('fingerprints')) {
        console.warn('Fingerprints table does not exist. Run: pnpm db:push');
        throw new Error('Database table "fingerprints" does not exist. Please run: pnpm db:push');
      }
      throw dbError;
    }

    // Safely extract data from fingerprint-oss response
    // Structure: { hash, systemInfo: { browser, os, device, ... }, geolocation: { country, city, ... }, ... }
    const fingerprintData = params.fingerprintData || {};
    const systemInfo = fingerprintData.systemInfo || {};
    const geolocation = fingerprintData.geolocation || {};
    
    const fingerprintRecord: any = {
      visitorId: params.visitorId,
      userId: params.userId || null,
      fingerprintData: fingerprintData, // Store the entire response
      browser: systemInfo.browser?.name || systemInfo.browser || null,
      os: systemInfo.os?.name || systemInfo.os || null,
      device: systemInfo.device?.type || systemInfo.device || null,
      ipAddress: geolocation.ip || params.ipAddress || null,
      country: geolocation.country?.name || geolocation.country || null,
      city: geolocation.city || null,
      userAgent: systemInfo.userAgent || params.userAgent || null,
      lastSeenAt: new Date(),
    };

    if (existing.length > 0) {
      // Update existing fingerprint
      await db
        .update(fingerprintsTable)
        .set(fingerprintRecord)
        .where(eq(fingerprintsTable.visitorId, params.visitorId));
      return existing[0].id;
    } else {
      // Insert new fingerprint
      const result = await db
        .insert(fingerprintsTable)
        .values(fingerprintRecord)
        .returning();
      return result[0].id;
    }
  } catch (error) {
    console.error('Failed to store fingerprint:', error);
    throw error;
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return undefined;
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

