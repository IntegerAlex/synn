"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Database,
  Download,
  Filter,
  LayoutGrid,
  Loader2,
  Menu,
  Network,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  TableProperties,
  X,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import type {
  ActivityLog,
  SuspiciousActivity,
} from "@/lib/utils/suspiciousActivity";

type ApiRequestLog = {
  id: number;
  userId: number | null;
  method: string;
  path: string;
  statusCode: number;
  responseTime: number | null;
  requestSize: number | null;
  responseSize: number | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  user?: { email?: string | null; name?: string | null } | null;
};

type Pagination = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

type DashboardLogsResponse = {
  activity: { data: ActivityLog[]; pagination: Pagination };
  apiRequests: { data: ApiRequestLog[]; pagination: Pagination };
};

type UsageResponse = {
  filters: {
    userId?: string | null;
    clerkUserId?: string | null;
    start: string;
    end: string;
  };
  summary: {
    totalCalls: number;
    endpoints: number;
  };
  endpoints: { endpoint: string; total: number }[];
  users: {
    clerkUserId: string | null;
    userId: number | null;
    endpoint: string;
    total: number;
  }[];
};

type AlertsResponse = {
  alerts: SuspiciousActivity[];
  summary: {
    recentLogs: number;
    unauthorized: number;
    errors: number;
    exports: number;
  };
};

type Filters = {
  userId: string;
  activityType: string;
  ipAddress: string;
  method: string;
  status: string;
  start: string;
  end: string;
  privateKey: string;
};

const PAGE_SIZE = 50;
type SectionKey = "overview" | "logs" | "api" | "users" | "alerts" | "controls";

export function DashboardClient() {
  const [filters, setFilters] = useState<Filters>({
    userId: "",
    activityType: "",
    ipAddress: "",
    method: "",
    status: "",
    start: "",
    end: "",
    privateKey: "",
  });
  const [activityPage, setActivityPage] = useState(0);
  const [apiPage, setApiPage] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [_chartFocus, setChartFocus] = useState<{
    endpoint?: string;
    user?: string;
  } | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const buildSearchParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.userId) params.set("userId", filters.userId);
    if (filters.activityType) params.set("activityType", filters.activityType);
    if (filters.ipAddress) params.set("ipAddress", filters.ipAddress);
    if (filters.start) params.set("startDate", filters.start);
    if (filters.end) params.set("endDate", filters.end);
    if (filters.privateKey) params.set("privateKey", filters.privateKey);
    if (filters.method) params.set("method", filters.method);
    if (filters.status) params.set("status", filters.status);
    params.set("limit", PAGE_SIZE.toString());
    params.set("offset", (activityPage * PAGE_SIZE).toString());
    params.set("apiOffset", (apiPage * PAGE_SIZE).toString());
    params.set("source", "all");
    return params;
  }, [filters, activityPage, apiPage]);

  const logsQuery = useQuery<DashboardLogsResponse>({
    queryKey: ["dashboard-logs", filters, activityPage, apiPage],
    queryFn: async () => {
      const params = buildSearchParams();
      const response = await fetch(`/api/dashboard/logs?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Failed to load logs");
      }
      return response.json();
    },
    enabled: activeSection === "logs" || activeSection === "api",
  });

  const usageQuery = useQuery<UsageResponse>({
    queryKey: ["dashboard-usage"],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/usage`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Failed to load usage");
      }
      return response.json();
    },
  });

  const alertsQuery = useQuery<AlertsResponse>({
    queryKey: ["dashboard-alerts"],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/alerts`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Failed to load alerts");
      }
      return response.json();
    },
    enabled: activeSection === "alerts",
  });

  const usersQuery = useQuery<{
    users: {
      id: number;
      clerkUserId: string | null;
      email: string | null;
      name: string | null;
      githubUsername: string | null;
      createdAt: string | null;
      repoCount: number;
      repos: {
        id: number;
        userId: number;
        fullName: string | null;
        isPrivate: boolean | null;
        starsCount: number | null;
        forksCount: number | null;
        updatedAt: string | null;
      }[];
    }[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>({
    queryKey: ["dashboard-users", userSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      const response = await fetch(
        `/api/dashboard/users?${params.toString()}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || "Failed to load users");
      }
      return response.json();
    },
    enabled: activeSection === "users",
  });

  const activityLogs = logsQuery.data?.activity.data ?? [];
  const apiRequests = logsQuery.data?.apiRequests.data ?? [];
  const suspicious =
    activeSection === "alerts" ? (alertsQuery.data?.alerts ?? []) : [];

  const totalActivity = logsQuery.data?.activity.pagination.total ?? 0;
  const totalApiRequests = logsQuery.data?.apiRequests.pagination.total ?? 0;
  const totalCalls = usageQuery.data?.summary.totalCalls ?? 0;
  const uniqueEndpoints = usageQuery.data?.summary.endpoints ?? 0;
  const endpointUsage = usageQuery.data?.endpoints ?? [];
  const userUsage = useMemo(() => {
    if (!usageQuery.data?.users) return [];
    const grouped = new Map<string, { label: string; total: number }>();
    for (const row of usageQuery.data.users) {
      const label = row.clerkUserId || `user-${row.userId ?? "n/a"}`;
      const key = label;
      if (!grouped.has(key)) grouped.set(key, { label, total: 0 });
      grouped.get(key)!.total += row.total;
    }
    return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
  }, [usageQuery.data]);
  const activeUsers = userUsage.length;

  const resetFilters = useCallback(() => {
    setFilters({
      userId: "",
      activityType: "",
      ipAddress: "",
      method: "",
      status: "",
      start: "",
      end: "",
      privateKey: "",
    });
    setActivityPage(0);
    setApiPage(0);
  }, []);

  const exportCsv = useCallback(
    (rows: Record<string, any>[], fileName: string) => {
      if (!rows || rows.length === 0) return;
      const headers = Object.keys(rows[0]);
      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    [],
  );

  const exportActivity = useCallback(() => {
    exportCsv(
      activityLogs.map((log) => ({
        id: log.id,
        timestamp: new Date(log.createdAt).toISOString(),
        user: (log as any).user?.email || log.userId || "n/a",
        activity: log.activityType,
        category: log.category ?? "",
        ip: log.ipAddress ?? "",
        repo: log.repoFullName ?? "",
        status: log.responseStatus ?? "",
      })),
      "activity-logs",
    );
  }, [activityLogs, exportCsv]);

  const exportApiRequests = useCallback(() => {
    exportCsv(
      apiRequests.map((req) => ({
        id: req.id,
        timestamp: new Date(req.createdAt).toISOString(),
        user: req.user?.email || req.userId || "n/a",
        method: req.method,
        path: req.path,
        status: req.statusCode,
        responseTime: req.responseTime ?? "",
        requestSize: req.requestSize ?? "",
        responseSize: req.responseSize ?? "",
        ip: req.ipAddress ?? "",
      })),
      "api-requests",
    );
  }, [apiRequests, exportCsv]);

  const _usageByEndpoint = usageQuery.data?.endpoints ?? [];
  const topUsers = useMemo(() => {
    if (!usageQuery.data?.users) return [];
    const grouped = new Map<
      string,
      {
        clerkUserId: string | null;
        userId: number | null;
        total: number;
        endpoints: { endpoint: string; total: number }[];
      }
    >();
    for (const row of usageQuery.data.users) {
      const key = `${row.clerkUserId || "unknown"}-${row.userId ?? "none"}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          clerkUserId: row.clerkUserId,
          userId: row.userId,
          total: 0,
          endpoints: [],
        });
      }
      const entry = grouped.get(key)!;
      entry.total += row.total;
      entry.endpoints.push({ endpoint: row.endpoint, total: row.total });
    }
    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [usageQuery.data]);

  const isLoadingAny =
    logsQuery.isLoading || usageQuery.isLoading || alertsQuery.isLoading;

  const navItems: { id: SectionKey; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: "logs",
      label: "Access Logs",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: "api",
      label: "API Calls",
      icon: <TableProperties className="w-4 h-4" />,
    },
    { id: "users", label: "Users", icon: <Network className="w-4 h-4" /> },
    {
      id: "alerts",
      label: "Alerts",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "controls",
      label: "Controls",
      icon: <ShieldOff className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-[#0b1020] via-[#0d1117] to-[#0b0f14] text-white flex">
      <aside
        className={`hidden md:flex transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-68"
        } flex-col border-r border-[#1f2a38] bg-[#0a0f1a]/90 backdrop-blur sticky top-0 h-screen`}
      >
        <div className="px-5 py-6 border-b border-[#30363d]">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                Admin
              </div>
            )}
            <button
              aria-label="Toggle sidebar"
              className="p-2 rounded-lg hover:bg-[#111820]"
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              {sidebarCollapsed ? (
                <Menu className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          </div>
          {!sidebarCollapsed && (
            <div className="text-xs text-gray-400 mt-1">Secure overview</div>
          )}
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#111820] text-white"
                    : "text-gray-300 hover:bg-[#111820]"
                }`}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
        {!sidebarCollapsed && (
          <div className="px-5 py-4 border-t border-[#30363d] text-xs text-gray-400 space-y-1">
            Password gated access
          </div>
        )}
      </aside>

      <main className="flex-1">
        <div className="sticky top-0 z-10 backdrop-blur bg-[#0d1117]/85 border-b border-[#1f2a38] px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-300 uppercase tracking-[0.12em]">
                <ShieldCheck className="w-4 h-4" />
                Admin verified
              </div>
              <h1 className="text-2xl font-semibold mt-1">
                Security & Audit Dashboard
              </h1>
              <p className="text-sm text-gray-400">
                Password gated · Live insights · Responsive
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip
                icon={<Network className="w-3.5 h-3.5" />}
                label="Live data"
                tone="neutral"
              />
              <Chip
                icon={<LayoutGrid className="w-3.5 h-3.5" />}
                label={`${totalActivity + totalApiRequests} records`}
                tone="muted"
              />
              <button
                onClick={() => {
                  logsQuery.refetch();
                  alertsQuery.refetch();
                  usageQuery.refetch();
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 px-3 py-2 text-sm font-medium transition-colors shadow-lg shadow-emerald-700/20"
              >
                {isLoadingAny ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Refresh data
              </button>
            </div>
          </div>
          <div className="flex md:hidden mt-3">
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#111820] px-3 py-2 text-sm"
            >
              {sidebarCollapsed ? (
                <Menu className="w-4 h-4" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Toggle menu
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <section
            id="overview"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              title="Activity Logs"
              value={totalActivity}
              icon={<Activity className="w-5 h-5 text-blue-300" />}
              hint="Filtered by your criteria"
            />
            <StatCard
              title="API Requests"
              value={totalApiRequests}
              icon={<TableProperties className="w-5 h-5 text-purple-300" />}
              hint="Trace backend calls"
            />
            <StatCard
              title="Total API Calls"
              value={totalCalls}
              icon={<Database className="w-5 h-5 text-emerald-300" />}
              hint="Last 180 days"
            />
            <StatCard
              title="Active Users"
              value={activeUsers}
              icon={<Network className="w-5 h-5 text-blue-300" />}
              hint="Users with usage entries"
            />
            <StatCard
              title="Unique Endpoints"
              value={uniqueEndpoints}
              icon={<BarChart3 className="w-5 h-5 text-amber-300" />}
              hint="Observed endpoints"
            />
          </section>

          <section id="filters" className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-emerald-300" />
                <h2 className="text-lg font-semibold">Filters</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltersOpen((o) => !o)}
                  className="px-3 py-2 rounded-full border border-[#1f2a38] text-sm hover:bg-[#161c24]"
                >
                  {filtersOpen ? "Hide filters" : "Show filters"}
                </button>
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 rounded-full border border-[#1f2a38] text-sm hover:bg-[#161c24]"
                >
                  Reset
                </button>
                <button
                  onClick={() => {
                    logsQuery.refetch();
                    alertsQuery.refetch();
                    usageQuery.refetch();
                  }}
                  className="px-3 py-2 rounded-full bg-[#238636] hover:bg-[#2ea043] text-sm flex items-center gap-2 shadow-lg shadow-emerald-700/20"
                >
                  <TableProperties className="w-4 h-4" />
                  Apply
                </button>
              </div>
            </div>

            {filtersOpen && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#0f131a]/70 border border-[#1f2a38] rounded-xl p-3 backdrop-blur">
                <InputField
                  label="User ID"
                  placeholder="numeric id"
                  value={filters.userId}
                  onChange={(e) =>
                    setFilters({ ...filters, userId: e.target.value })
                  }
                />
                <InputField
                  label="Activity Type"
                  placeholder="repo_selected"
                  value={filters.activityType}
                  onChange={(e) =>
                    setFilters({ ...filters, activityType: e.target.value })
                  }
                />
                <InputField
                  label="IP Address"
                  placeholder="Decrypt to filter"
                  value={filters.ipAddress}
                  onChange={(e) =>
                    setFilters({ ...filters, ipAddress: e.target.value })
                  }
                />
                <InputField
                  label="Method (API)"
                  placeholder="GET/POST"
                  value={filters.method}
                  onChange={(e) =>
                    setFilters({ ...filters, method: e.target.value })
                  }
                />
                <InputField
                  label="Status (API)"
                  placeholder="200, 401"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                />
                <InputField
                  label="Private Key (PEM)"
                  placeholder="-----BEGIN PRIVATE KEY-----"
                  value={filters.privateKey}
                  onChange={(e) =>
                    setFilters({ ...filters, privateKey: e.target.value })
                  }
                  textarea
                />
                <InputField
                  label="Start"
                  type="datetime-local"
                  value={filters.start}
                  onChange={(e) =>
                    setFilters({ ...filters, start: e.target.value })
                  }
                />
                <InputField
                  label="End"
                  type="datetime-local"
                  value={filters.end}
                  onChange={(e) =>
                    setFilters({ ...filters, end: e.target.value })
                  }
                />
              </div>
            )}
          </section>

          {activeSection === "overview" && (
            <SectionCard id="charts" padded>
              <HeaderRow
                title="Usage Insights"
                subtitle="Endpoint + user distributions"
                action={
                  <span className="text-xs text-gray-400 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {formatNumber(endpointUsage.length)} endpoints
                  </span>
                }
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                <ChartCard
                  title="By endpoint"
                  valueLabel={
                    endpointUsage.length
                      ? `${formatNumber(endpointUsage.length)} endpoints`
                      : "No data"
                  }
                >
                  <DonutChart
                    data={endpointUsage.map((d) => ({
                      label: d.endpoint,
                      total: Number(d.total),
                    }))}
                    onSliceSelect={(endpoint) => {
                      setFilters((prev) => ({
                        ...prev,
                        activityType: "",
                        ipAddress: "",
                        userId: "",
                        method: "",
                        status: "",
                      }));
                      setActiveSection("api");
                      setChartFocus({ endpoint });
                    }}
                  />
                </ChartCard>
                <ChartCard
                  title="By user"
                  valueLabel={
                    activeUsers
                      ? `${formatNumber(activeUsers)} users`
                      : "No data"
                  }
                >
                  <DonutChart
                    data={userUsage.map((u) => ({
                      label: u.label,
                      total: Number(u.total),
                    }))}
                    onSliceSelect={(userLabel) => {
                      setFilters((prev) => ({
                        ...prev,
                        userId: userLabel,
                        activityType: "",
                        ipAddress: "",
                        method: "",
                        status: "",
                      }));
                      setActiveSection("users");
                      setExpandedUserId(null);
                      setUserSearch(userLabel);
                    }}
                  />
                </ChartCard>

                <div className="rounded-xl border border-[#1f2a38] bg-[#0b0f14]/80 p-4 space-y-4 h-full">
                  <h4 className="text-sm font-semibold text-gray-200">
                    Top endpoints
                  </h4>
                  <div className="space-y-2">
                    {endpointUsage.slice(0, 8).map((row, idx) => (
                      <div
                        key={row.endpoint}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: donutColor(idx) }}
                          />
                          <span className="text-gray-300">{row.endpoint}</span>
                        </div>
                        <span className="text-gray-100 font-semibold tabular-nums">
                          {formatNumber(row.total)}
                        </span>
                      </div>
                    ))}
                    {endpointUsage.length === 0 && (
                      <EmptyState message="No usage data yet" />
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-200 pt-2 border-t border-[#1f2a38]">
                    Top users
                  </h4>
                  <div className="space-y-2">
                    {topUsers.slice(0, 8).map((user, idx) => (
                      <div
                        key={`${user.clerkUserId}-${user.userId}-${idx}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: donutColor(idx) }}
                          />
                          <span className="text-gray-300">
                            {user.clerkUserId || `user-${user.userId ?? "n/a"}`}
                          </span>
                        </div>
                        <span className="text-gray-100 font-semibold tabular-nums">
                          {formatNumber(user.total)}
                        </span>
                      </div>
                    ))}
                    {topUsers.length === 0 && (
                      <EmptyState message="No user usage yet" />
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {activeSection === "logs" && (
            <SectionCard id="access">
              <HeaderRow
                title="Access & Activity Logs"
                subtitle="Authentication, repo, and system events"
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={exportActivity}
                      disabled={activityLogs.length === 0}
                      className="px-3 py-2 rounded bg-[#238636] hover:bg-[#2ea043] text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <PaginationControls
                      onPrev={() => setActivityPage((p) => Math.max(0, p - 1))}
                      onNext={() => setActivityPage((p) => p + 1)}
                      disablePrev={activityPage === 0}
                      disableNext={!logsQuery.data?.activity.pagination.hasMore}
                    />
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0b0f14] border-b border-[#1f2a38]">
                    <tr>
                      {["Time", "User", "Activity", "IP", "Repo", "Status"].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left font-semibold text-gray-300"
                          >
                            {col}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-[#161c24] hover:bg-[#111820]/70"
                      >
                        <td className="px-4 py-3 text-gray-300">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {(log as any).user?.email ||
                              `User ${log.userId ?? "n/a"}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {log.category ?? "activity"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold">
                            {log.activityType}
                          </div>
                          {log.requestPath && (
                            <div className="text-xs text-gray-400">
                              {log.requestMethod} {log.requestPath}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">
                          {log.ipAddress || "encrypted"}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {log.repoFullName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          {log.responseStatus ? (
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                log.responseStatus >= 400
                                  ? "bg-red-900/30 text-red-300"
                                  : log.responseStatus >= 300
                                    ? "bg-amber-900/30 text-amber-200"
                                    : "bg-green-900/30 text-green-200"
                              }`}
                            >
                              {log.responseStatus}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={6}
                        >
                          {logsQuery.isLoading ? (
                            <LoadingRow />
                          ) : (
                            <EmptyState message="No activity in this window" />
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {activeSection === "api" && (
            <SectionCard id="api-calls">
              <HeaderRow
                title="API Call Tracing"
                subtitle="Backend request telemetry and statuses"
                action={
                  <div className="flex gap-2">
                    <button
                      onClick={exportApiRequests}
                      disabled={apiRequests.length === 0}
                      className="px-3 py-2 rounded bg-[#238636] hover:bg-[#2ea043] text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </button>
                    <PaginationControls
                      onPrev={() => setApiPage((p) => Math.max(0, p - 1))}
                      onNext={() => setApiPage((p) => p + 1)}
                      disablePrev={apiPage === 0}
                      disableNext={
                        !logsQuery.data?.apiRequests.pagination.hasMore
                      }
                    />
                  </div>
                }
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#0b0f14] border-b border-[#1f2a38]">
                    <tr>
                      {[
                        "Time",
                        "User",
                        "Method",
                        "Path",
                        "Status",
                        "Latency",
                      ].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left font-semibold text-gray-300"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="border-b border-[#161c24] hover:bg-[#111820]/70"
                      >
                        <td className="px-4 py-3 text-gray-300">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {req.user?.email || `User ${req.userId ?? "n/a"}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {req.userId ?? "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {req.method}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{req.path}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              req.statusCode >= 400
                                ? "bg-red-900/30 text-red-300"
                                : req.statusCode >= 300
                                  ? "bg-amber-900/30 text-amber-200"
                                  : "bg-green-900/30 text-green-200"
                            }`}
                          >
                            {req.statusCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {req.responseTime ? `${req.responseTime} ms` : "—"}
                        </td>
                      </tr>
                    ))}
                    {apiRequests.length === 0 && (
                      <tr>
                        <td
                          className="px-4 py-6 text-center text-gray-500"
                          colSpan={6}
                        >
                          {logsQuery.isLoading ? (
                            <LoadingRow />
                          ) : (
                            <EmptyState message="No API calls in this window" />
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {activeSection === "alerts" && (
            <SectionCard id="alerts" padded>
              <HeaderRow
                title="Alerts & Signals"
                subtitle="Automated anomaly detection"
                action={
                  <span className="text-xs text-gray-400 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-300" />
                    {alertsQuery.isLoading
                      ? "Scanning…"
                      : `${suspicious.length} findings`}
                  </span>
                }
              />
              {suspicious.length === 0 ? (
                <EmptyState message="No suspicious activity detected in the recent window." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suspicious.map((alert, idx) => (
                    <div
                      key={`${alert.type}-${idx}`}
                      className="border border-[#1f2a38] rounded-lg p-4 bg-linear-to-br from-[#0b0f14] to-[#0d1117]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-300" />
                          <div className="font-semibold">
                            {alert.type.replace(/_/g, " ")}
                          </div>
                        </div>
                        <SeverityBadge severity={alert.severity} />
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {alert.description}
                      </p>
                      <div className="text-xs text-gray-500 mt-2">
                        Events: {alert.count} · Logs:{" "}
                        {alert.logIds.slice(0, 5).join(", ")}
                        {alert.logIds.length > 5
                          ? ` +${alert.logIds.length - 5}`
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {activeSection === "users" && (
            <SectionCard id="users" padded>
              <HeaderRow
                title="Users"
                subtitle="Open a user to view their repositories"
                action={
                  <div className="flex items-center gap-2">
                    <input
                      className="w-64 rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-gray-500"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="email, name, or clerk ID"
                    />
                  </div>
                }
              />
              <div className="space-y-2">
                {usersQuery.isLoading && <LoadingRow />}
                {usersQuery.data?.users.map((user) => {
                  const isExpanded = expandedUserId === user.id;
                  return (
                    <div
                      key={user.id}
                      className="border border-[#1f2a38] rounded-lg bg-[#0b0f14]/60 p-3"
                    >
                      <button
                        className="w-full flex items-center justify-between text-left"
                        onClick={() =>
                          setExpandedUserId(isExpanded ? null : user.id)
                        }
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-gray-100">
                            {user.email || user.clerkUserId}
                          </span>
                          <span className="text-xs text-gray-400">
                            {user.name || "Unnamed"} · repos:{" "}
                            {formatNumber(user.repoCount)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {isExpanded ? "Hide repos" : "Show repos"}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="mt-3 space-y-1">
                          {user.repos.length === 0 && (
                            <EmptyState message="No repos" />
                          )}
                          {user.repos.map((repo) => (
                            <div
                              key={repo.id}
                              className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-[#0f131a]"
                            >
                              <div className="flex flex-col">
                                <span className="text-gray-100">
                                  {repo.fullName || "unknown"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Stars: {formatNumber(repo.starsCount || 0)} ·
                                  Forks: {formatNumber(repo.forksCount || 0)}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {repo.isPrivate ? "Private" : "Public"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {usersQuery.data?.users.length === 0 &&
                  !usersQuery.isLoading && (
                    <EmptyState message="No users found" />
                  )}
              </div>
            </SectionCard>
          )}

          {activeSection === "controls" && (
            <SectionCard id="controls" padded>
              <HeaderRow
                title="Controls & Exports"
                subtitle="Retention, export, and rate limits"
                action={
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <ShieldOff className="w-4 h-4 text-blue-300" />
                    Password-only access (ADMIN_PASSWORD)
                  </div>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ControlCard
                  title="Retention Guidance"
                  description="Current dashboard queries last 30 days by default. Adjust the date filters to narrow or extend."
                />
                <ControlCard
                  title="CSV Exports"
                  description="Export activity and API call tables directly. Decrypt sensitive fields by providing a private key."
                />
                <ControlCard
                  title="Rate Limits"
                  description="Admin endpoints share a strict limiter (5 requests / 15 min per IP). Headers surface remaining quota."
                />
              </div>
            </SectionCard>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#1f2a38] bg-[#0f131a]/70 p-4 shadow-lg shadow-black/20 backdrop-blur h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm text-gray-400 truncate">{title}</div>
          <div className="text-3xl font-semibold mt-2 tabular-nums">
            {formatNumber(value)}
          </div>
          {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
        </div>
        <div className="shrink-0 mt-1">{icon}</div>
      </div>
    </div>
  );
}

function HeaderRow({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[#1f2a38] gap-2">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function PaginationControls({
  onPrev,
  onNext,
  disablePrev,
  disableNext,
}: {
  onPrev: () => void;
  onNext: () => void;
  disablePrev: boolean;
  disableNext: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={onPrev}
        disabled={disablePrev}
        className="px-3 py-2 rounded border border-[#30363d] hover:bg-[#161c24] disabled:opacity-50"
      >
        Prev
      </button>
      <button
        onClick={onNext}
        disabled={disableNext}
        className="px-3 py-2 rounded border border-[#30363d] hover:bg-[#161c24] disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: SuspiciousActivity["severity"];
}) {
  const style = {
    critical: "bg-red-900/30 text-red-200",
    high: "bg-orange-900/30 text-orange-200",
    medium: "bg-amber-900/30 text-amber-200",
    low: "bg-blue-900/30 text-blue-200",
  }[severity];
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${style}`}>
      {severity}
    </span>
  );
}

function ControlCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-[#1f2a38] bg-linear-to-br from-[#0b0f14] to-[#0d1117] p-4 shadow-lg shadow-black/10">
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-gray-400">{description}</div>
    </div>
  );
}

function SectionCard({
  id,
  children,
  padded = false,
}: {
  id?: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <section
      id={id}
      className={`border border-[#1f2a38] rounded-xl shadow-lg shadow-black/20 bg-[#0f131a]/70 backdrop-blur ${
        padded ? "p-5 space-y-4" : ""
      }`}
    >
      {children}
    </section>
  );
}

function Chip({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "muted";
}) {
  const styles =
    tone === "neutral"
      ? "bg-[#111820] text-gray-200 border border-[#1f2a38]"
      : "bg-[#0f131a] text-gray-300 border border-[#1f2a38]";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${styles}`}
    >
      {icon}
      {label}
    </span>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading…
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
      <LayoutGrid className="w-5 h-5 text-gray-500" />
      <span>{message}</span>
    </div>
  );
}

function DonutChart({
  data,
  onSliceSelect,
}: {
  data: { label: string; total: number }[];
  onSliceSelect?: (label: string) => void;
}) {
  const total = data.reduce((acc, d) => acc + (d.total || 0), 0);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!data.length || total === 0) {
    return (
      <div className="rounded-xl border border-[#1f2a38] bg-[#0b0f14]/80 p-4 flex items-center justify-center">
        <EmptyState message="No usage data to chart" />
      </div>
    );
  }

  let cumulative = 0;
  const segments = data.slice(0, 8).map((d, idx) => {
    const value = d.total || 0;
    const start = (cumulative / total) * 100;
    const end = ((cumulative + value) / total) * 100;
    cumulative += value;
    return { start, end, color: donutColor(idx), label: d.label, value };
  });

  const active = segments[activeIdx] ?? segments[0];
  const activePercent = ((active.value / total) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="w-full flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-48 h-48">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="transparent"
            stroke="#111820"
            strokeWidth="4"
          />
          {segments.map((seg, idx) => {
            const dashArray = `${seg.end - seg.start} ${100 - (seg.end - seg.start)}`;
            return (
              <circle
                key={idx}
                cx="18"
                cy="18"
                r="16"
                fill="transparent"
                stroke={seg.color}
                strokeWidth={idx === activeIdx ? 5 : 4}
                strokeDasharray={dashArray}
                strokeDashoffset={25 - seg.start}
                strokeLinecap="butt"
                className="transition-all duration-150"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => onSliceSelect?.(seg.label)}
                role={onSliceSelect ? "button" : undefined}
              />
            );
          })}
          <circle cx="18" cy="18" r="10" fill="#0b0f14" />
          <text
            x="18"
            y="17"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="5"
            fontWeight="700"
          >
            {formatNumber(active.value)}
          </text>
          <text
            x="18"
            y="22"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#9CA3AF"
            fontSize="2.6"
          >
            {activePercent}%
          </text>
        </svg>
      </div>
      <div className="grid grid-cols-1 gap-2 text-xs text-gray-300">
        {segments.map((seg, idx) => (
          <button
            key={seg.label + idx}
            onMouseEnter={() => setActiveIdx(idx)}
            onFocus={() => setActiveIdx(idx)}
            onClick={() => onSliceSelect?.(seg.label)}
            className={`flex items-center justify-between px-2 py-1 rounded ${
              idx === activeIdx ? "bg-[#111820]" : "hover:bg-[#0f131a]"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate max-w-[180px] text-left">
                {seg.label}
              </span>
            </span>
            <span className="text-gray-100 font-semibold">
              {seg.value} · {((seg.value / total) * 100).toFixed(1)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  valueLabel,
  children,
}: {
  title: string;
  valueLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#1f2a38] bg-[#0b0f14]/80 p-4 space-y-3 h-full">
      <div className="flex items-center justify-between text-sm text-gray-300">
        <span className="font-semibold text-gray-100">{title}</span>
        {valueLabel && (
          <span className="text-xs text-gray-400">{valueLabel}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function formatNumber(value: unknown): string {
  const asNumber = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(asNumber)) return asNumber.toLocaleString();
  return String(value ?? "");
}

function donutColor(idx: number) {
  const palette = [
    "#7C3AED",
    "#22C55E",
    "#FACC15",
    "#38BDF8",
    "#F97316",
    "#E11D48",
    "#14B8A6",
    "#A855F7",
  ];
  return palette[idx % palette.length];
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea,
}: {
  label: string;
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  const common =
    "w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white placeholder:text-gray-500";
  return (
    <label className="flex flex-col gap-2 text-sm text-gray-300">
      {label}
      {textarea ? (
        <textarea
          className={`${common} min-h-[80px]`}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
      ) : (
        <input
          className={common}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          type={type}
        />
      )}
    </label>
  );
}
