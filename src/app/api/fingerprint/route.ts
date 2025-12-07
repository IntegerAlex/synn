import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { usersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { storeFingerprint, getClientIp, getUserAgent } from '@/lib/services/activityLogger';
import { z } from 'zod';

const FingerprintSchema = z.object({
  visitorId: z.string().min(1),
  fingerprintData: z.any(), // Accept any structure from fingerprint-oss
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate basic structure
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: 'Invalid request body' } },
        { status: 400 }
      );
    }
    
    if (!body.visitorId || typeof body.visitorId !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_VISITOR_ID', message: 'visitorId is required and must be a string' } },
        { status: 400 }
      );
    }
    
    const { visitorId, fingerprintData } = body;

    // Get user ID if authenticated
    let userId: number | undefined;
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

    // Store fingerprint (don't fail if table doesn't exist - just log)
    try {
      const fingerprintId = await storeFingerprint({
        visitorId,
        userId,
        fingerprintData,
        ipAddress: getClientIp(request),
        userAgent: getUserAgent(request),
      });

      return NextResponse.json({
        success: true,
        fingerprintId,
      });
    } catch (storageError: any) {
      // If table doesn't exist, return success but log warning
      if (storageError.message?.includes('does not exist') || storageError.message?.includes('Database table')) {
        console.warn('⚠️ Fingerprints table not found. Run: pnpm db:push');
        return NextResponse.json({
          success: true,
          warning: 'Fingerprint table not found. Please run database migration.',
          fingerprintId: null,
        });
      }
      throw storageError;
    }
  } catch (error) {
    console.error('Error storing fingerprint:', error);
    return NextResponse.json(
      {
        error: {
          code: 'FINGERPRINT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to store fingerprint',
        },
      },
      { status: 400 }
    );
  }
}

