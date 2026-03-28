import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useAppStore } from "@/store/useAppStore";

// Types for GitHub data
export interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: Array<{ name: string; color: string }>;
  user: { login: string; avatar_url: string };
  comments: number;
  body: string | null;
  assignees: Array<{ login: string; avatar_url: string }>;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  merged_at: string | null;
  labels: Array<{ name: string; color: string }>;
  user: { login: string; avatar_url: string };
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  comments?: number;
  review_comments?: number;
  commits?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  body: string | null;
  assignees: Array<{ login: string; avatar_url: string }>;
  requested_reviewers: Array<{ login: string; avatar_url: string }>;
}

export interface RepoInsights {
  repo: {
    name: string;
    full_name: string;
    description: string | null;
    stars: number;
    forks: number;
    watchers: number;
    open_issues: number;
    size: number;
    default_branch: string;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    license: string | null;
    topics: string[];
    visibility: string;
    has_issues: boolean;
    has_wiki: boolean;
    archived: boolean;
    network_count: number;
    subscribers_count: number;
  };
  languages: Array<{ name: string; bytes: number; percentage: number }>;
  contributors: Array<{
    login: string;
    avatar_url: string;
    contributions: number;
  }>;
  recent_commits: Array<{
    sha: string;
    date: string;
    author: string;
  }>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    has_next: boolean;
    total_count?: number;
  };
}

// Helper to get repo full name from store
function useRepoFullName(): string | null {
  const repoInfo = useAppStore((state) => state.repoInfo);
  return repoInfo?.path ?? null;
}

// Issues hook
export function useGitHubIssues(state: "open" | "closed" = "open", page = 1) {
  const repoFullName = useRepoFullName();

  return useQuery<PaginatedResponse<GitHubIssue>>({
    queryKey: ["github-issues", repoFullName, state, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFullName!,
        state,
        page: page.toString(),
        per_page: "30",
      });
      const res = await fetch(`/api/github/issues?${params}`);
      if (!res.ok) throw new Error("Failed to fetch issues");
      return res.json();
    },
    enabled: !!repoFullName,
    placeholderData: keepPreviousData,
  });
}

// Pull Requests hook
export function useGitHubPulls(
  state: "open" | "closed" | "all" = "open",
  page = 1,
) {
  const repoFullName = useRepoFullName();

  return useQuery<PaginatedResponse<GitHubPullRequest>>({
    queryKey: ["github-pulls", repoFullName, state, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFullName!,
        state,
        page: page.toString(),
        per_page: "30",
      });
      const res = await fetch(`/api/github/pulls?${params}`);
      if (!res.ok) throw new Error("Failed to fetch pull requests");
      return res.json();
    },
    enabled: !!repoFullName,
    placeholderData: keepPreviousData,
  });
}

// Insights hook
export function useRepoInsights() {
  const repoFullName = useRepoFullName();

  return useQuery<{ data: RepoInsights }>({
    queryKey: ["github-insights", repoFullName],
    queryFn: async () => {
      const params = new URLSearchParams({ repo: repoFullName! });
      const res = await fetch(`/api/github/insights?${params}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      return res.json();
    },
    enabled: !!repoFullName,
    staleTime: 5 * 60 * 1000, // insights change less frequently
    placeholderData: keepPreviousData,
  });
}

// ============ Comment Types ============

export interface GitHubComment {
  id: number;
  body: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string };
}

// ============ PR Detail Types ============

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRDetail extends GitHubPullRequest {
  merged: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  files: PRFile[];
}

// ============ Comments Hook ============

export function useIssueComments(issueNumber: number | null) {
  const repoFullName = useRepoFullName();

  return useQuery<{ data: GitHubComment[] }>({
    queryKey: ["github-comments", repoFullName, issueNumber],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFullName!,
        issue_number: issueNumber!.toString(),
      });
      const res = await fetch(`/api/github/issues/comments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
    enabled: !!repoFullName && issueNumber !== null,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ============ PR Detail Hook ============

export function usePRDetail(prNumber: number | null) {
  const repoFullName = useRepoFullName();

  return useQuery<{ data: PRDetail }>({
    queryKey: ["github-pr-detail", repoFullName, prNumber],
    queryFn: async () => {
      const res = await fetch(
        `/api/github/pulls/${prNumber}?repo=${encodeURIComponent(repoFullName!)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch PR details");
      return res.json();
    },
    enabled: !!repoFullName && prNumber !== null,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ============ PR Files Hook (Paginated) ============

export interface PRFileDetailed {
  sha: string;
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  contents_url: string;
}

export function usePullRequestFiles(
  prNumber: number | null,
  page = 1,
  perPage = 30,
) {
  const repoFullName = useRepoFullName();

  return useQuery<{
    data: PRFileDetailed[];
    pagination: { page: number; per_page: number; has_next: boolean };
  }>({
    queryKey: ["github-pr-files", repoFullName, prNumber, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFullName!,
        page: page.toString(),
        per_page: perPage.toString(),
      });
      const res = await fetch(`/api/github/pulls/${prNumber}/files?${params}`);
      if (!res.ok) throw new Error("Failed to fetch PR files");
      return res.json();
    },
    enabled: !!repoFullName && prNumber !== null,
    staleTime: 60 * 1000,
  });
}

// ============ GitHub Branches Hook ============

export interface GitHubBranchInfo {
  name: string;
  sha: string;
  protected: boolean;
  isDefault: boolean;
}

export interface GitHubBranchesResponse {
  branches: GitHubBranchInfo[];
  defaultBranch: string;
}

export function useGitHubBranches(page = 1) {
  const repoFullName = useRepoFullName();

  return useQuery<{
    data: GitHubBranchesResponse;
    pagination: { page: number; per_page: number; has_next: boolean };
  }>({
    queryKey: ["github-branches", repoFullName, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFullName!,
        page: page.toString(),
        per_page: "100",
      });
      const res = await fetch(`/api/github/branches?${params}`);
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
    enabled: !!repoFullName,
    staleTime: 5 * 60 * 1000,
  });
}

// ============ Branch Comparison Hook ============

export interface BranchComparisonResult {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

export function useBranchComparison(base: string | null, head: string | null) {
  const repoFullName = useRepoFullName();

  return useQuery<{ data: BranchComparisonResult }>({
    queryKey: ["github-branch-compare", repoFullName, base, head],
    queryFn: async () => {
      const params = new URLSearchParams({
        repo: repoFullName!,
        base: base!,
        head: head!,
      });
      const res = await fetch(`/api/github/branches/compare?${params}`);
      if (!res.ok) throw new Error("Failed to compare branches");
      return res.json();
    },
    enabled: !!repoFullName && !!base && !!head && base !== head,
    staleTime: 2 * 60 * 1000,
  });
}

// ============ Mutation Hooks ============

/** Create a new issue */
export function useCreateIssue() {
  const queryClient = useQueryClient();
  const repoFullName = useRepoFullName();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      body?: string;
      labels?: string[];
      assignees?: string[];
    }) => {
      const res = await fetch("/api/github/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, ...params }),
      });
      if (!res.ok) {
        const err = await res.json();
        const message =
          err && typeof err.error === "object" && err.error !== null
            ? (err.error.message ?? JSON.stringify(err.error))
            : (err?.error as string | undefined);
        throw new Error(message || "Failed to create issue");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-issues"] });
    },
  });
}

/** Add a comment to an issue or PR */
export function useAddComment() {
  const queryClient = useQueryClient();
  const repoFullName = useRepoFullName();

  return useMutation({
    mutationFn: async (params: { issue_number: number; body: string }) => {
      const res = await fetch("/api/github/issues/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, ...params }),
      });
      if (!res.ok) {
        const err = await res.json();
        const message =
          typeof err?.error === "string"
            ? err.error
            : typeof err?.error?.message === "string"
              ? err.error.message
              : "Failed to add comment";
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["github-comments", repoFullName, variables.issue_number],
      });
    },
  });
}

/** Close or reopen an issue */
export function useUpdateIssueState() {
  const queryClient = useQueryClient();
  const repoFullName = useRepoFullName();

  return useMutation({
    mutationFn: async (params: {
      number: number;
      state: "open" | "closed";
    }) => {
      const res = await fetch(`/api/github/issues/${params.number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, state: params.state }),
      });
      if (!res.ok) {
        const err = await res.json();
        const message =
          typeof err?.error === "string"
            ? err.error
            : typeof err?.error?.message === "string"
              ? err.error.message
              : "Failed to update issue";
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-issues"] });
    },
  });
}

/** Merge a pull request */
export function useMergePR() {
  const queryClient = useQueryClient();
  const repoFullName = useRepoFullName();

  return useMutation({
    mutationFn: async (params: {
      pull_number: number;
      merge_method?: "merge" | "squash" | "rebase";
      commit_title?: string;
    }) => {
      const res = await fetch("/api/github/pulls/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, ...params }),
      });
      if (!res.ok) {
        const err = await res.json();
        const message =
          typeof err?.error === "string"
            ? err.error
            : typeof err?.error?.message === "string"
              ? err.error.message
              : "Failed to merge pull request";
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-pulls"] });
      queryClient.invalidateQueries({ queryKey: ["github-pr-detail"] });
    },
  });
}

/** Close or reopen a pull request */
export function useUpdatePRState() {
  const queryClient = useQueryClient();
  const repoFullName = useRepoFullName();

  return useMutation({
    mutationFn: async (params: {
      number: number;
      state: "open" | "closed";
    }) => {
      const res = await fetch(`/api/github/pulls/${params.number}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoFullName, state: params.state }),
      });
      if (!res.ok) {
        const err = await res.json();
        const message =
          typeof err?.error === "string"
            ? err.error
            : typeof err?.error?.message === "string"
              ? err.error.message
              : "Failed to update PR";
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["github-pulls"] });
      queryClient.invalidateQueries({ queryKey: ["github-pr-detail"] });
    },
  });
}
