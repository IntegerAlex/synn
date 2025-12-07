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

export const gitApi = {
    // Set repository path
    setRepo: async (path: string): Promise<RepoInfo> => {
        const response = await fetch(`${API_BASE}/repo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path }),
        });
        return handleResponse(response);
    },

    // Get repository info
    getRepoInfo: async (): Promise<RepoInfo> => {
        const response = await fetch(`${API_BASE}/repo`);
        return handleResponse(response);
    },

    // Get branches
    getBranches: async (): Promise<BranchesResponse> => {
        const response = await fetch(`${API_BASE}/branches`);
        return handleResponse(response);
    },

    // Get graph
    getGraph: async (limit = 100): Promise<GraphData> => {
        const response = await fetch(`${API_BASE}/graph?limit=${limit}`);
        return handleResponse(response);
    },

    // Get commit details
    getCommitDetails: async (hash: string): Promise<CommitDetails> => {
        const response = await fetch(`${API_BASE}/commits/${hash}`);
        return handleResponse(response);
    },

    // Checkout branch
    checkoutBranch: async (branch: string): Promise<RepoInfo> => {
        const response = await fetch(`${API_BASE}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch }),
        });
        return handleResponse(response);
    },

    // Search
    search: async (query: string): Promise<SearchResponse> => {
        const response = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
        return handleResponse(response);
    },
};
