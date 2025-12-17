export type UserUsageRow = {
  clerkUserId: string | null;
  userId: number | null;
  endpoint: string;
  total: number;
};

export type AggregatedUserUsage = {
  clerkUserId: string;
  userId: number | null;
  total: number;
  endpoints: Array<{ endpoint: string; total: number }>;
};

export function groupUsageByUser(rows: UserUsageRow[]): AggregatedUserUsage[] {
  const map = new Map<string, AggregatedUserUsage>();

  for (const row of rows) {
    const key = row.clerkUserId || row.userId?.toString() || 'unknown';
    const current = map.get(key) || {
      clerkUserId: row.clerkUserId || 'unknown',
      userId: row.userId ?? null,
      total: 0,
      endpoints: [],
    };
    current.total += row.total || 0;
    current.endpoints.push({ endpoint: row.endpoint, total: row.total });
    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}





