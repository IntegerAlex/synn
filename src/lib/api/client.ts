import type {
  BranchesResponse,
  CommitDetails,
  FileHistoryEntry,
  GraphData,
  RepoInfo,
  SearchResponse,
} from "@/types/git";

const API_BASE = "/api/git";

interface ApiResponse<T> {
  data?: T;
  error?: { code: string; message: string };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const json: ApiResponse<T> = await response.json();
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || "Request failed");
  }
  return json.data as T;
}

// Helper to get repo_full_name from repoInfo (stored in path field)
function getRepoFullName(repoInfo: RepoInfo | null): string {
  if (!repoInfo) throw new Error("Repository not selected");
  // repoInfo.path now stores repo_full_name (owner/repo)
  return repoInfo.path;
}

// Helper to get visitor ID from localStorage
function getVisitorId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("visitorId");
  } catch {
    return null;
  }
}

// Helper to create headers with visitor ID and optional share ID
function getHeaders(shareId?: string): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const visitorId = getVisitorId();
  if (visitorId) {
    headers["x-visitor-id"] = visitorId;
  }
  if (shareId) {
    headers["x-share-id"] = shareId;
  }
  return headers;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  shareId?: string,
): Promise<T> {
  return handleResponse(
    await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: getHeaders(shareId),
    }),
  );
}

export const gitApi = {
  // Set repository (now accepts repo_full_name and default_branch)
  setRepo: async (params: {
    repoFullName: string;
    defaultBranch?: string;
  }): Promise<RepoInfo> =>
    request<RepoInfo>("/repo", {
      method: "POST",
      body: JSON.stringify({
        repo_full_name: params.repoFullName,
        default_branch: params.defaultBranch,
      }),
    }),

  // Get repository info
  getRepoInfo: async (repoInfo: RepoInfo | null): Promise<RepoInfo> =>
    request(`/repo?repo=${encodeURIComponent(getRepoFullName(repoInfo))}`),

  // Get branches
  getBranches: async (repoInfo: RepoInfo | null): Promise<BranchesResponse> =>
    request(`/branches?repo=${encodeURIComponent(getRepoFullName(repoInfo))}`),

  // Get graph
  getGraph: async (
    repoInfo: RepoInfo | null,
    limit = 100,
    offset = 0,
    shareId?: string,
  ): Promise<GraphData> =>
    request(
      `/graph?repo=${encodeURIComponent(getRepoFullName(repoInfo))}&limit=${limit}&offset=${offset}`,
      {},
      shareId,
    ),

  // Get commit details
  getCommitDetails: async (
    repoInfo: RepoInfo | null,
    hash: string,
  ): Promise<CommitDetails> =>
    request(
      `/commits/${hash}?repo=${encodeURIComponent(getRepoFullName(repoInfo))}`,
    ),

  // Checkout branch
  checkoutBranch: async (
    repoInfo: RepoInfo | null,
    branch: string,
  ): Promise<RepoInfo> =>
    request<RepoInfo>("/checkout", {
      method: "POST",
      body: JSON.stringify({
        branch,
        repo_full_name: getRepoFullName(repoInfo),
      }),
    }),

  // Search
  search: async (
    repoInfo: RepoInfo | null,
    query: string,
  ): Promise<SearchResponse> =>
    request(
      `/search?repo=${encodeURIComponent(getRepoFullName(repoInfo))}&q=${encodeURIComponent(query)}`,
    ),

  // List files
  getFiles: async (
    repoInfo: RepoInfo | null,
    ref?: string,
  ): Promise<string[]> =>
    request(
      `/files?repo=${encodeURIComponent(getRepoFullName(repoInfo))}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`,
    ),

  // Get file contents
  getFileContents: async (
    repoInfo: RepoInfo | null,
    filePath: string,
    ref?: string,
  ): Promise<{ content: string; encoding: string; size: number }> =>
    request(
      `/file-contents?repo=${encodeURIComponent(getRepoFullName(repoInfo))}&filepath=${encodeURIComponent(filePath)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`,
    ),

  // Get file blame
  getFileBlame: async (
    repoInfo: RepoInfo | null,
    filePath: string,
    ref?: string,
  ): Promise<
    Array<{
      hash: string;
      author: string;
      date: string;
      message: string;
      lineNumber: number;
      content: string;
    }>
  > =>
    request(
      `/blame?repo=${encodeURIComponent(getRepoFullName(repoInfo))}&filepath=${encodeURIComponent(filePath)}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`,
    ),

  // File history
  getFileHistory: async (
    repoInfo: RepoInfo | null,
    filepath: string,
    options?: { ref?: string; limit?: number },
  ): Promise<FileHistoryEntry[]> => {
    const ref = options?.ref;
    const limit = options?.limit;
    return request(
      `/file-history?repo=${encodeURIComponent(getRepoFullName(repoInfo))}&filepath=${encodeURIComponent(filepath)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }${typeof limit === "number" ? `&limit=${encodeURIComponent(String(limit))}` : ""}`,
    );
  },
};
