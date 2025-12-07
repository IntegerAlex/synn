import type {
    RepoInfo,
    BranchesResponse,
    GraphData,
    CommitDetails,
    SearchResponse,
} from '@/types/git';

const API_BASE = '/api/git';

interface ApiResponse<T> {
    data?: T;
    error?: { code: string; message: string };
}

async function handleResponse<T>(response: Response): Promise<T> {
    const json: ApiResponse<T> = await response.json();
    if (!response.ok || json.error) {
        throw new Error(json.error?.message || 'Request failed');
    }
    return json.data as T;
}

// Helper to get repo_full_name from repoInfo (stored in path field)
function getRepoFullName(repoInfo: RepoInfo | null): string {
    if (!repoInfo) throw new Error('Repository not selected');
    // repoInfo.path now stores repo_full_name (owner/repo)
    return repoInfo.path;
}

export const gitApi = {
    // Set repository (now accepts repo_full_name and default_branch)
    setRepo: async (params: { repoFullName: string; defaultBranch?: string }): Promise<RepoInfo> => {
        const response = await fetch(`${API_BASE}/repo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                repo_full_name: params.repoFullName,
                default_branch: params.defaultBranch 
            }),
        });
        return handleResponse(response);
    },

    // Get repository info
    getRepoInfo: async (repoInfo: RepoInfo | null): Promise<RepoInfo> => {
        const repoFullName = getRepoFullName(repoInfo);
        const response = await fetch(`${API_BASE}/repo?repo=${encodeURIComponent(repoFullName)}`);
        return handleResponse(response);
    },

    // Get branches
    getBranches: async (repoInfo: RepoInfo | null): Promise<BranchesResponse> => {
        const repoFullName = getRepoFullName(repoInfo);
        const response = await fetch(`${API_BASE}/branches?repo=${encodeURIComponent(repoFullName)}`);
        return handleResponse(response);
    },

    // Get graph
    getGraph: async (repoInfo: RepoInfo | null, limit = 100): Promise<GraphData> => {
        const repoFullName = getRepoFullName(repoInfo);
        const response = await fetch(`${API_BASE}/graph?repo=${encodeURIComponent(repoFullName)}&limit=${limit}`);
        return handleResponse(response);
    },

    // Get commit details
    getCommitDetails: async (repoInfo: RepoInfo | null, hash: string): Promise<CommitDetails> => {
        const repoFullName = getRepoFullName(repoInfo);
        const response = await fetch(`${API_BASE}/commits/${hash}?repo=${encodeURIComponent(repoFullName)}`);
        return handleResponse(response);
    },

    // Checkout branch
    checkoutBranch: async (repoInfo: RepoInfo | null, branch: string): Promise<RepoInfo> => {
        const repoFullName = getRepoFullName(repoInfo);
        const response = await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                branch,
                repo_full_name: repoFullName 
            }),
        });
        return handleResponse(response);
    },

    // Search
    search: async (repoInfo: RepoInfo | null, query: string): Promise<SearchResponse> => {
        const repoFullName = getRepoFullName(repoInfo);
        const response = await fetch(`${API_BASE}/search?repo=${encodeURIComponent(repoFullName)}&q=${encodeURIComponent(query)}`);
        return handleResponse(response);
    },
};
