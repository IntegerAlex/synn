/**
 * Suspicious activity detection utilities
 */

export interface ActivityLog {
  id: number;
  userId: number | null;
  activityType: string;
  category?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  responseStatus?: number | null;
  errorCode?: string | null;
  createdAt: Date | string;
  repoFullName?: string | null;
  [key: string]: any;
}

export interface SuspiciousActivity {
  type: 'rapid_requests' | 'multiple_errors' | 'unusual_ip' | 'unauthorized_access' | 'data_exfiltration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  logIds: number[];
  count: number;
  details: Record<string, any>;
}

/**
 * Detect suspicious activities in logs
 */
export function detectSuspiciousActivity(logs: ActivityLog[]): SuspiciousActivity[] {
  const suspicious: SuspiciousActivity[] = [];

  // Group logs by user and IP
  const userActivity = new Map<number, ActivityLog[]>();
  const ipActivity = new Map<string, ActivityLog[]>();
  const errorLogs: ActivityLog[] = [];
  const unauthorizedLogs: ActivityLog[] = [];

  for (const log of logs) {
    // Group by user
    if (log.userId) {
      if (!userActivity.has(log.userId)) {
        userActivity.set(log.userId, []);
      }
      userActivity.get(log.userId)!.push(log);
    }

    // Group by IP
    if (log.ipAddress) {
      if (!ipActivity.has(log.ipAddress)) {
        ipActivity.set(log.ipAddress, []);
      }
      ipActivity.get(log.ipAddress)!.push(log);
    }

    // Collect errors
    if (log.errorCode || (log.responseStatus && log.responseStatus >= 400)) {
      errorLogs.push(log);
    }

    // Collect unauthorized access
    if (log.responseStatus === 401 || log.responseStatus === 403) {
      unauthorizedLogs.push(log);
    }
  }

  // 1. Rapid requests from same IP (potential DDoS or scraping)
  for (const [ip, ipLogs] of ipActivity) {
    if (ipLogs.length > 100) {
      // Check time window (last hour)
      const recentLogs = ipLogs.filter(log => {
        const logTime = new Date(log.createdAt).getTime();
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        return logTime > oneHourAgo;
      });

      if (recentLogs.length > 50) {
        suspicious.push({
          type: 'rapid_requests',
          severity: recentLogs.length > 200 ? 'critical' : recentLogs.length > 100 ? 'high' : 'medium',
          description: `Rapid requests detected from IP ${ip}: ${recentLogs.length} requests in the last hour`,
          logIds: recentLogs.map(l => l.id),
          count: recentLogs.length,
          details: { ip, timeWindow: '1 hour' },
        });
      }
    }
  }

  // 2. Multiple errors from same user/IP
  const errorByUser = new Map<number, ActivityLog[]>();
  const errorByIP = new Map<string, ActivityLog[]>();

  for (const log of errorLogs) {
    if (log.userId) {
      if (!errorByUser.has(log.userId)) {
        errorByUser.set(log.userId, []);
      }
      errorByUser.get(log.userId)!.push(log);
    }
    if (log.ipAddress) {
      if (!errorByIP.has(log.ipAddress)) {
        errorByIP.set(log.ipAddress, []);
      }
      errorByIP.get(log.ipAddress)!.push(log);
    }
  }

  for (const [userId, userErrors] of errorByUser) {
    if (userErrors.length > 10) {
      suspicious.push({
        type: 'multiple_errors',
        severity: userErrors.length > 50 ? 'high' : 'medium',
        description: `User ${userId} has ${userErrors.length} errors`,
        logIds: userErrors.map(l => l.id),
        count: userErrors.length,
        details: { userId },
      });
    }
  }

  // 3. Unauthorized access attempts
  if (unauthorizedLogs.length > 5) {
    const unauthorizedByIP = new Map<string, ActivityLog[]>();
    for (const log of unauthorizedLogs) {
      if (log.ipAddress) {
        if (!unauthorizedByIP.has(log.ipAddress)) {
          unauthorizedByIP.set(log.ipAddress, []);
        }
        unauthorizedByIP.get(log.ipAddress)!.push(log);
      }
    }

    for (const [ip, ipUnauthorized] of unauthorizedByIP) {
      if (ipUnauthorized.length > 3) {
        suspicious.push({
          type: 'unauthorized_access',
          severity: ipUnauthorized.length > 10 ? 'high' : 'medium',
          description: `Multiple unauthorized access attempts from IP ${ip}: ${ipUnauthorized.length} attempts`,
          logIds: ipUnauthorized.map(l => l.id),
          count: ipUnauthorized.length,
          details: { ip },
        });
      }
    }
  }

  // 4. Unusual IP patterns (multiple users from same IP)
  const ipToUsers = new Map<string, Set<number>>();
  for (const log of logs) {
    if (log.ipAddress && log.userId) {
      if (!ipToUsers.has(log.ipAddress)) {
        ipToUsers.set(log.ipAddress, new Set());
      }
      ipToUsers.get(log.ipAddress)!.add(log.userId);
    }
  }

  for (const [ip, users] of ipToUsers) {
    if (users.size > 5) {
      suspicious.push({
        type: 'unusual_ip',
        severity: users.size > 20 ? 'high' : 'medium',
        description: `Unusual IP pattern: ${users.size} different users from IP ${ip}`,
        logIds: logs.filter(l => l.ipAddress === ip).map(l => l.id),
        count: users.size,
        details: { ip, uniqueUsers: users.size },
      });
    }
  }

  // 5. Data exfiltration patterns (rapid API calls to export endpoints)
  const exportLogs = logs.filter(log => 
    log.requestPath?.includes('/export') || 
    log.requestPath?.includes('/gdpr/export') ||
    log.activityType?.includes('export')
  );

  if (exportLogs.length > 0) {
    const exportByUser = new Map<number, ActivityLog[]>();
    for (const log of exportLogs) {
      if (log.userId) {
        if (!exportByUser.has(log.userId)) {
          exportByUser.set(log.userId, []);
        }
        exportByUser.get(log.userId)!.push(log);
      }
    }

    for (const [userId, userExports] of exportByUser) {
      if (userExports.length > 3) {
        suspicious.push({
          type: 'data_exfiltration',
          severity: 'high',
          description: `User ${userId} has ${userExports.length} data export requests`,
          logIds: userExports.map(l => l.id),
          count: userExports.length,
          details: { userId },
        });
      }
    }
  }

  return suspicious;
}

