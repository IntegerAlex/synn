import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { usersTable, activityLogsTable, apiRequestsTable, fingerprintsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decryptData } from '@/lib/services/encryption';
import { z } from 'zod';

const DecryptRequestSchema = z.object({
  privateKey: z.string().min(1, 'Private key is required'),
  dataType: z.enum(['activity_logs', 'api_requests', 'fingerprints', 'all']).default('all'),
  limit: z.number().min(1).max(1000).default(100),
});

/**
 * Decrypt encrypted activity logs and other data
 * POST /api/admin/decrypt
 * 
 * This endpoint requires the private key to decrypt data
 * Only decrypts data belonging to the authenticated user
 */
export async function POST(request: Request) {
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
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Parse and validate request body
    const body = await request.json();
    const parsed = DecryptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { privateKey, dataType, limit } = parsed.data;

    // Helper function to decrypt fields
    const decryptFields = <T extends Record<string, any>>(
      records: T[],
      fieldsToDecrypt: (keyof T)[]
    ): T[] => {
      return records.map(record => {
        const decrypted = { ...record };
        for (const field of fieldsToDecrypt) {
          const value = record[field];
          if (typeof value === 'string' && value.length > 100) {
            // Likely encrypted (base64 encoded package is always long)
            try {
              const decryptedValue = decryptData(value, privateKey);
              try {
                (decrypted as any)[field] = JSON.parse(decryptedValue);
              } catch {
                (decrypted as any)[field] = decryptedValue;
              }
            } catch (error) {
              // Field might not be encrypted or decryption failed
              // Keep original value
            }
          }
        }
        return decrypted;
      });
    };

    const result: Record<string, any> = {
      decryptedAt: new Date().toISOString(),
      userId,
    };

    // Decrypt activity logs
    if (dataType === 'activity_logs' || dataType === 'all') {
      try {
        const logs = await db
          .select()
          .from(activityLogsTable)
          .where(eq(activityLogsTable.userId, userId))
          .limit(limit);

        result.activityLogs = decryptFields(logs, ['ipAddress', 'userAgent', 'metadata']);
        result.activityLogsCount = logs.length;
      } catch (error) {
        result.activityLogsError = 'Could not fetch activity logs';
      }
    }

    // Decrypt API requests
    if (dataType === 'api_requests' || dataType === 'all') {
      try {
        const requests = await db
          .select()
          .from(apiRequestsTable)
          .where(eq(apiRequestsTable.userId, userId))
          .limit(limit);

        result.apiRequests = decryptFields(requests, ['ipAddress', 'userAgent', 'queryParams', 'metadata']);
        result.apiRequestsCount = requests.length;
      } catch (error) {
        result.apiRequestsError = 'Could not fetch API requests';
      }
    }

    // Decrypt fingerprints
    if (dataType === 'fingerprints' || dataType === 'all') {
      try {
        const fingerprints = await db
          .select()
          .from(fingerprintsTable)
          .where(eq(fingerprintsTable.userId, userId))
          .limit(limit);

        result.fingerprints = decryptFields(fingerprints, ['fingerprintData', 'ipAddress', 'userAgent']);
        result.fingerprintsCount = fingerprints.length;
      } catch (error) {
        result.fingerprintsError = 'Could not fetch fingerprints';
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Decryption error:', error);
    
    if (error instanceof Error && error.message.includes('decrypt')) {
      return NextResponse.json(
        { error: { code: 'DECRYPTION_FAILED', message: 'Invalid private key or corrupted data' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'ERROR', message: 'An error occurred during decryption' } },
      { status: 500 }
    );
  }
}

