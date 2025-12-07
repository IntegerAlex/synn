'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter, AlertTriangle, Search, Calendar, User, Activity } from 'lucide-react';
import { detectSuspiciousActivity, type ActivityLog, type SuspiciousActivity } from '@/lib/utils/suspiciousActivity';

interface LogFilters {
  userId: string;
  activityType: string;
  ipAddress: string;
  startDate: string;
  endDate: string;
  privateKey: string;
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState<LogFilters>({
    userId: '',
    activityType: '',
    ipAddress: '',
    startDate: '',
    endDate: '',
    privateKey: '',
  });
  const [showPrivateKeyInput, setShowPrivateKeyInput] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 100;

  // Build query params
  const queryParams = new URLSearchParams();
  if (filters.userId) queryParams.set('userId', filters.userId);
  if (filters.activityType) queryParams.set('activityType', filters.activityType);
  if (filters.ipAddress) queryParams.set('ipAddress', filters.ipAddress);
  if (filters.startDate) queryParams.set('startDate', filters.startDate);
  if (filters.endDate) queryParams.set('endDate', filters.endDate);
  if (filters.privateKey) queryParams.set('privateKey', filters.privateKey);
  queryParams.set('dataType', 'activity_logs');
  queryParams.set('limit', limit.toString());
  queryParams.set('offset', (page * limit).toString());

  // Fetch logs
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-logs', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/admin/logs?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch logs');
      }
      return response.json();
    },
    enabled: true,
  });

  const logs: ActivityLog[] = data?.data || [];
  const suspicious = detectSuspiciousActivity(logs);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (logs.length === 0) return;

    const headers = ['ID', 'Timestamp', 'User ID', 'User Email', 'Activity Type', 'Category', 'IP Address', 'User Agent', 'Repo', 'Status', 'Error'];
    const rows = logs.map(log => [
      log.id,
      new Date(log.createdAt).toISOString(),
      log.userId || '',
      (log as any).user?.email || '',
      log.activityType,
      log.category || '',
      log.ipAddress || '',
      log.userAgent || '',
      log.repoFullName || '',
      log.responseStatus || '',
      log.errorCode || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [logs]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p>{error instanceof Error ? error.message : 'Failed to load audit logs'}</p>
            <p className="text-sm text-gray-400 mt-2">
              {error instanceof Error && error.message.includes('Admin access required') 
                ? 'You need admin access to view this page. Set ADMIN_USER_IDS environment variable with your Clerk user ID.'
                : 'Please check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Audit Log Explorer</h1>
          <p className="text-gray-400">View and analyze system activity logs</p>
        </div>

        {/* Suspicious Activity Alerts */}
        {suspicious.length > 0 && (
          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Suspicious Activity Detected
            </h2>
            {suspicious.map((activity, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 ${getSeverityColor(activity.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold mb-1">{activity.type.replace(/_/g, ' ').toUpperCase()}</div>
                    <div className="text-sm">{activity.description}</div>
                    <div className="text-xs mt-1 opacity-75">
                      Affected logs: {activity.count} | Log IDs: {activity.logIds.slice(0, 5).join(', ')}
                      {activity.logIds.length > 5 && ` +${activity.logIds.length - 5} more`}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(activity.severity)}`}>
                    {activity.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">User ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                placeholder="Filter by user ID"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Activity Type</label>
              <input
                type="text"
                value={filters.activityType}
                onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                placeholder="e.g., repo_selected"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">IP Address</label>
              <input
                type="text"
                value={filters.ipAddress}
                onChange={(e) => setFilters({ ...filters, ipAddress: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
                placeholder="Filter by IP"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Private Key (for decryption)
                <button
                  onClick={() => setShowPrivateKeyInput(!showPrivateKeyInput)}
                  className="ml-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  {showPrivateKeyInput ? 'Hide' : 'Show'}
                </button>
              </label>
              {showPrivateKeyInput && (
                <textarea
                  value={filters.privateKey}
                  onChange={(e) => setFilters({ ...filters, privateKey: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded text-white font-mono text-xs"
                  placeholder="-----BEGIN PRIVATE KEY-----..."
                  rows={3}
                />
              )}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilters({
                userId: '',
                activityType: '',
                ipAddress: '',
                startDate: '',
                endDate: '',
                privateKey: '',
              })}
              className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded hover:bg-[#30363d] transition-colors"
            >
              Clear Filters
            </button>
            <button
              onClick={exportToCSV}
              disabled={logs.length === 0}
              className="px-4 py-2 bg-[#238636] hover:bg-[#2ea043] rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Logs ({data?.pagination?.total || 0})
            </h2>
            {isLoading && <div className="text-sm text-gray-400">Loading...</div>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0d1117]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">User</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Activity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">IP Address</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Repo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-[#30363d] hover:bg-[#0d1117]/50">
                    <td className="px-4 py-3 text-sm">{log.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {(log as any).user?.email || `User ${log.userId || 'N/A'}`}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{log.activityType}</div>
                      {log.category && (
                        <div className="text-xs text-gray-400">{log.category}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">
                      {log.ipAddress || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {log.repoFullName || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.responseStatus ? (
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.responseStatus >= 400
                            ? 'bg-red-900/20 text-red-400'
                            : log.responseStatus >= 300
                            ? 'bg-yellow-900/20 text-yellow-400'
                            : 'bg-green-900/20 text-green-400'
                        }`}>
                          {log.responseStatus}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && !isLoading && (
            <div className="p-8 text-center text-gray-400">
              No logs found. Try adjusting your filters.
            </div>
          )}
          {/* Pagination */}
          {data?.pagination && (
            <div className="p-4 border-t border-[#30363d] flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {page * limit + 1} - {Math.min((page + 1) * limit, data.pagination.total)} of {data.pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded hover:bg-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.pagination.hasMore}
                  className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded hover:bg-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

