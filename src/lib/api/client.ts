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

export const gitApi = {
  // Set repository (now accepts repo_full_name and default_branch)
  setRepo: async (params: {
    repoFullName: string;
    defaultBranch?: string;
  }): Promise<RepoInfo> => {
    const response = await fetch(`${API_BASE}/repo`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        repo_full_name: params.repoFullName,
        default_branch: params.defaultBranch,
      }),
    });
    return handleResponse(response);
  },

  // Get repository info
  getRepoInfo: async (repoInfo: RepoInfo | null): Promise<RepoInfo> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/repo?repo=${encodeURIComponent(repoFullName)}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

  // Get branches
  getBranches: async (repoInfo: RepoInfo | null): Promise<BranchesResponse> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/branches?repo=${encodeURIComponent(repoFullName)}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

  // Get graph
  getGraph: async (
    repoInfo: RepoInfo | null,
    limit = 100,
    offset = 0,
    shareId?: string,
  ): Promise<GraphData> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/graph?repo=${encodeURIComponent(repoFullName)}&limit=${limit}&offset=${offset}`,
      {
        headers: getHeaders(shareId),
      },
    );
    return handleResponse(response);
  },

  // Get commit details
  getCommitDetails: async (
    repoInfo: RepoInfo | null,
    hash: string,
  ): Promise<CommitDetails> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/commits/${hash}?repo=${encodeURIComponent(repoFullName)}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

  // Checkout branch
  checkoutBranch: async (
    repoInfo: RepoInfo | null,
    branch: string,
  ): Promise<RepoInfo> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(`${API_BASE}/checkout`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        branch,
        repo_full_name: repoFullName,
      }),
    });
    return handleResponse(response);
  },

  // Search
  search: async (
    repoInfo: RepoInfo | null,
    query: string,
  ): Promise<SearchResponse> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/search?repo=${encodeURIComponent(repoFullName)}&q=${encodeURIComponent(query)}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

  // List files
  getFiles: async (
    repoInfo: RepoInfo | null,
    ref?: string,
  ): Promise<string[]> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/files?repo=${encodeURIComponent(repoFullName)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

  // Get file contents
  getFileContents: async (
    repoInfo: RepoInfo | null,
    filePath: string,
    ref?: string,
  ): Promise<{ content: string; encoding: string; size: number }> => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/file-contents?repo=${encodeURIComponent(repoFullName)}&filepath=${encodeURIComponent(filePath)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

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
  > => {
    const repoFullName = getRepoFullName(repoInfo);
    const response = await fetch(
      `${API_BASE}/blame?repo=${encodeURIComponent(repoFullName)}&filepath=${encodeURIComponent(filePath)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },

  // File history
  getFileHistory: async (
    repoInfo: RepoInfo | null,
    filepath: string,
    options?: { ref?: string; limit?: number },
  ): Promise<FileHistoryEntry[]> => {
    const repoFullName = getRepoFullName(repoInfo);
    const ref = options?.ref;
    const limit = options?.limit;
    const response = await fetch(
      `${API_BASE}/file-history?repo=${encodeURIComponent(repoFullName)}&filepath=${encodeURIComponent(filepath)}${
        ref ? `&ref=${encodeURIComponent(ref)}` : ""
      }${typeof limit === "number" ? `&limit=${encodeURIComponent(String(limit))}` : ""}`,
      {
        headers: getHeaders(),
      },
    );
    return handleResponse(response);
  },
};
