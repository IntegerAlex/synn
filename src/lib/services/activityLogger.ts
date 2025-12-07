import { db } from '@/db';
import { activityLogsTable, apiRequestsTable, fingerprintsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encryptData, isEncryptionAvailable } from './encryption';

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

// Fields that should be encrypted for privacy
const SENSITIVE_ACTIVITY_FIELDS = ['ipAddress', 'userAgent', 'metadata'] as const;
const SENSITIVE_API_FIELDS = ['ipAddress', 'userAgent', 'queryParams', 'metadata'] as const;

/**
 * Encrypt sensitive data if encryption is available
 */
function encryptSensitiveData<T extends Record<string, any>>(
  data: T,
  sensitiveFields: readonly string[]
): T {
  if (!isEncryptionAvailable()) {
    return data;
  }

  const result = { ...data };
  
  for (const field of sensitiveFields) {
    const value = result[field as keyof T];
    if (value !== undefined && value !== null) {
      try {
        if (typeof value === 'string') {
          (result as any)[field] = encryptData(value);
        } else if (typeof value === 'object') {
          (result as any)[field] = encryptData(JSON.stringify(value));
        }
      } catch (error) {
        // If encryption fails, continue with unencrypted data
        console.warn(`Failed to encrypt field ${field}:`, error);
      }
    }
  }
  
  return result;
}

/**
 * Log user activity to the database with encrypted sensitive fields
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    // Encrypt sensitive fields
    const encryptedParams = encryptSensitiveData(params, SENSITIVE_ACTIVITY_FIELDS);
    
    await db.insert(activityLogsTable).values({
      userId: encryptedParams.userId,
      fingerprintId: encryptedParams.fingerprintId,
      activityType: encryptedParams.activityType,
      category: encryptedParams.category,
      description: encryptedParams.description,
      repoFullName: encryptedParams.repoFullName,
      requestMethod: encryptedParams.requestMethod,
      requestPath: encryptedParams.requestPath,
      responseStatus: encryptedParams.responseStatus,
      responseTime: encryptedParams.responseTime,
      errorCode: encryptedParams.errorCode,
      errorMessage: encryptedParams.errorMessage,
      metadata: encryptedParams.metadata,
      ipAddress: encryptedParams.ipAddress,
      userAgent: encryptedParams.userAgent,
    });
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to log activity:', error);
  }
}

/**
 * Log API request to the database with encrypted sensitive fields
 */
export async function logApiRequest(params: LogApiRequestParams): Promise<void> {
  try {
    // Encrypt sensitive fields
    const encryptedParams = encryptSensitiveData(params, SENSITIVE_API_FIELDS);
    
    await db.insert(apiRequestsTable).values({
      userId: encryptedParams.userId,
      fingerprintId: encryptedParams.fingerprintId,
      method: encryptedParams.method,
      path: encryptedParams.path,
      queryParams: encryptedParams.queryParams,
      statusCode: encryptedParams.statusCode,
      responseTime: encryptedParams.responseTime,
      requestSize: encryptedParams.requestSize,
      responseSize: encryptedParams.responseSize,
      errorCode: encryptedParams.errorCode,
      errorMessage: encryptedParams.errorMessage,
      metadata: encryptedParams.metadata,
      ipAddress: encryptedParams.ipAddress,
      userAgent: encryptedParams.userAgent,
    });
  } catch (error) {
    // Don't throw - logging should never break the application
    console.error('Failed to log API request:', error);
  }
}

/**
 * Store or update fingerprint data with encrypted sensitive fields
 */
export async function storeFingerprint(params: {
  visitorId: string;
  userId?: number;
  fingerprintData: any;
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
      if (dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('fingerprints')) {
        console.warn('Fingerprints table does not exist. Run: pnpm db:push');
        throw new Error('Database table "fingerprints" does not exist. Please run: pnpm db:push');
      }
      throw dbError;
    }

    // Safely extract data from fingerprint-oss response
    const fingerprintData = params.fingerprintData || {};
    const systemInfo = fingerprintData.systemInfo || {};
    const geolocation = fingerprintData.geolocation || {};
    
    // Encrypt sensitive fingerprint data
    let encryptedFingerprintData = fingerprintData;
    let encryptedIpAddress = geolocation.ip || params.ipAddress || null;
    let encryptedUserAgent = systemInfo.userAgent || params.userAgent || null;
    
    if (isEncryptionAvailable()) {
      try {
        encryptedFingerprintData = encryptData(JSON.stringify(fingerprintData));
        if (encryptedIpAddress) {
          encryptedIpAddress = encryptData(encryptedIpAddress);
        }
        if (encryptedUserAgent) {
          encryptedUserAgent = encryptData(encryptedUserAgent);
        }
      } catch (error) {
        console.warn('Failed to encrypt fingerprint data:', error);
      }
    }
    
    const fingerprintRecord: any = {
      visitorId: params.visitorId,
      userId: params.userId || null,
      fingerprintData: encryptedFingerprintData,
      browser: systemInfo.browser?.name || systemInfo.browser || null,
      os: systemInfo.os?.name || systemInfo.os || null,
      device: systemInfo.device?.type || systemInfo.device || null,
      ipAddress: encryptedIpAddress,
      country: geolocation.country?.name || geolocation.country || null,
      city: geolocation.city || null,
      userAgent: encryptedUserAgent,
      lastSeenAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(fingerprintsTable)
        .set(fingerprintRecord)
        .where(eq(fingerprintsTable.visitorId, params.visitorId));
      return existing[0].id;
    } else {
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
