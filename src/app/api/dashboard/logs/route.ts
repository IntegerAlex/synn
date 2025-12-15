import { NextResponse } from 'next/server';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { activityLogsTable, apiRequestsTable, usersTable } from '@/db/schema';
import { decryptData } from '@/lib/services/encryption';
import { requireAdmin } from '@/lib/utils/adminAuth';

function orConditions(field: any, values: number[]) {
  if (values.length === 0) return null;
  if (values.length === 1) return eq(field, values[0]);
  return or(...values.map((value) => eq(field, value)));
}

function decryptField(value: any, privateKey: string) {
  if (typeof value !== 'string') return value;
  // Skip short strings that are likely not encrypted packages
  if (value.length < 80) return value;

  try {
    const decrypted = decryptData(value, privateKey);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch {
    // If decryption fails, keep original to avoid blowing up the request
    return value;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    await requireAdmin();

    const userId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!, 10) : null;
    const activityType = searchParams.get('activityType');
    const ipAddress = searchParams.get('ipAddress');
    const method = searchParams.get('method');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const apiOffset = parseInt(searchParams.get('apiOffset') || offset.toString(), 10);
    const privateKey = searchParams.get('privateKey');

    // Activity log conditions
    const activityConditions = [];
    if (userId) activityConditions.push(eq(activityLogsTable.userId, userId));
    if (activityType) activityConditions.push(like(activityLogsTable.activityType, `%${activityType}%`));
    if (startDate) activityConditions.push(gte(activityLogsTable.createdAt, new Date(startDate)));
    if (endDate) activityConditions.push(lte(activityLogsTable.createdAt, new Date(endDate)));

    const activityQuery = db
      .select()
      .from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit)
      .offset(offset);
    if (activityConditions.length > 0) {
      activityQuery.where(and(...activityConditions));
    }
    let activityLogs: any[] = await activityQuery;

    if (privateKey) {
      try {
        activityLogs = activityLogs.map((log) => {
          const decrypted = { ...log };
          decrypted.ipAddress = decryptField(log.ipAddress, privateKey);
          decrypted.userAgent = decryptField(log.userAgent, privateKey);
          decrypted.metadata = decryptField(log.metadata, privateKey);
          return decrypted;
        });
      } catch {
        // swallow decryption errors per-record
      }
      if (ipAddress) {
        activityLogs = activityLogs.filter((log) => log.ipAddress && String(log.ipAddress).includes(ipAddress));
      }
    } else if (ipAddress) {
      activityLogs = activityLogs.filter((log) => log.ipAddress && String(log.ipAddress).includes(ipAddress));
    }

    // API request conditions
    const apiConditions = [];
    if (userId) apiConditions.push(eq(apiRequestsTable.userId, userId));
    if (method) apiConditions.push(eq(apiRequestsTable.method, method));
    if (status) {
      const statusNumber = parseInt(status, 10);
      if (!Number.isNaN(statusNumber)) apiConditions.push(eq(apiRequestsTable.statusCode, statusNumber));
    }
    if (startDate) apiConditions.push(gte(apiRequestsTable.createdAt, new Date(startDate)));
    if (endDate) apiConditions.push(lte(apiRequestsTable.createdAt, new Date(endDate)));

    const apiQuery = db
      .select()
      .from(apiRequestsTable)
      .orderBy(desc(apiRequestsTable.createdAt))
      .limit(limit)
      .offset(apiOffset);
    if (apiConditions.length > 0) {
      apiQuery.where(and(...apiConditions));
    }
    let apiRequests = await apiQuery;

    if (privateKey) {
      try {
        apiRequests = apiRequests.map((req) => {
          const decrypted = { ...req };
          decrypted.ipAddress = decryptField(req.ipAddress, privateKey);
          decrypted.userAgent = decryptField(req.userAgent, privateKey);
          decrypted.queryParams = decryptField(req.queryParams, privateKey);
          return decrypted;
        });
      } catch {
        // swallow decryption errors per-record
      }
      if (ipAddress) {
        apiRequests = apiRequests.filter((req) => req.ipAddress && String(req.ipAddress).includes(ipAddress));
      }
    } else if (ipAddress) {
      apiRequests = apiRequests.filter((req) => req.ipAddress && String(req.ipAddress).includes(ipAddress));
    }

    // User enrichment
    const userIds = [
      ...new Set([
        ...activityLogs.map((log) => log.userId).filter(Boolean),
        ...apiRequests.map((req) => req.userId).filter(Boolean),
      ]),
    ] as number[];

    const users =
      userIds.length === 0
        ? []
        : await db
            .select()
            .from(usersTable)
            .where(orConditions(usersTable.id, userIds) || undefined);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const activityWithUsers = activityLogs.map((log) => ({ ...log, user: log.userId ? userMap.get(log.userId) : null }));
    const apiWithUsers = apiRequests.map((req) => ({ ...req, user: req.userId ? userMap.get(req.userId) : null }));

    // Counts
    const activityCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogsTable)
      .where(activityConditions.length > 0 ? and(...activityConditions) : undefined);
    const apiCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(apiRequestsTable)
      .where(apiConditions.length > 0 ? and(...apiConditions) : undefined);

    return NextResponse.json(
      {
        activity: {
          data: activityWithUsers,
          pagination: {
            total: activityCountResult[0]?.count || 0,
            limit,
            offset,
            hasMore: offset + limit < (activityCountResult[0]?.count || 0),
          },
        },
        apiRequests: {
          data: apiWithUsers,
          pagination: {
            total: apiCountResult[0]?.count || 0,
            limit,
            offset: apiOffset,
            hasMore: apiOffset + limit < (apiCountResult[0]?.count || 0),
          },
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: 'DASHBOARD_LOGS_ERROR', message: error?.message || 'Failed to fetch logs' } },
      { status: 500 },
    );
  }
}

