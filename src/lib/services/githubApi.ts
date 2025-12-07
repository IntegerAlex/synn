import type {
  RepoInfo,
  Branch,
  BranchesResponse,
  Commit,
  CommitDetails,
  GraphData,
  GraphNode,
  GraphEdge,
  FileChange,
} from '@/types/git';

// Color palette for branch visualization
const BRANCH_COLORS = [
  '#22c55e', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#14b8a6', // Teal
];

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
  parents: Array<{ sha: string }>;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

interface GitHubCommitDetail extends GitHubCommit {
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
  stats: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export class GitHubApiService {
  private accessToken: string;
  private repoFullName: string;
  private owner: string;
  private repo: string;
  private defaultBranch: string = 'main';
  private lastRateLimitInfo: {
    remaining: number | null;
    limit: number | null;
    reset: number | null;
  } = { remaining: null, limit: null, reset: null };

  constructor(accessToken: string, repoFullName: string, defaultBranch?: string) {
    if (!accessToken) {
      throw new Error('GitHub access token is required');
    }
    if (!repoFullName || !repoFullName.includes('/')) {
      throw new Error('Invalid repository format. Expected: owner/repo');
    }
    
    this.accessToken = accessToken;
    this.repoFullName = repoFullName;
    const [owner, repo] = repoFullName.split('/');
    
    if (!owner || !repo) {
      throw new Error('Invalid repository format. Expected: owner/repo');
    }
    
    this.owner = owner;
    this.repo = repo;
    if (defaultBranch) {
      this.defaultBranch = defaultBranch;
    }
  }

  private async fetchGitHub<T>(endpoint: string): Promise<T> {
    const url = `https://api.github.com/repos/${this.repoFullName}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    // Always track rate limit info
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitLimit = response.headers.get('x-ratelimit-limit');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');
    const rateLimitUsed = response.headers.get('x-ratelimit-used');
    
    // Store rate limit info
    this.lastRateLimitInfo = {
      remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
      limit: rateLimitLimit ? parseInt(rateLimitLimit) : null,
      reset: rateLimitReset ? parseInt(rateLimitReset) : null,
    };

    if (!response.ok) {
      
      // Handle rate limiting (403 or 429)
      if (response.status === 403 || response.status === 429) {
        const remaining = rateLimitRemaining ? parseInt(rateLimitRemaining) : 0;
        if (remaining === 0 || response.status === 429) {
          const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : null;
          const timeUntilReset = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60) : null;
          throw new Error(
            `GitHub API rate limit exceeded. ${rateLimitUsed}/${rateLimitLimit} requests used. ${resetTime ? `Resets in ${timeUntilReset} minutes (${resetTime.toLocaleString()})` : 'Please try again later.'}`
          );
        }
      }
      
      // Handle not found
      if (response.status === 404) {
        // Check if it's actually a rate limit issue (sometimes GitHub returns 404 for rate limits)
        if (rateLimitRemaining === '0') {
          const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : null;
          const timeUntilReset = resetTime ? Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60) : null;
          throw new Error(
            `GitHub API rate limit exceeded (returned as 404). ${rateLimitUsed}/${rateLimitLimit} requests used. Resets in ${timeUntilReset} minutes (${resetTime?.toLocaleString()}).`
          );
        }
        
        // Try to get more details from the response
        let errorMessage = `Repository not found or access denied: ${this.repoFullName}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = `${errorData.message}. The repository may be private or not exist.`;
          }
        } catch {
          // If response body is not JSON, use default message
        }
        
        // Add rate limit info if available
        if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
          errorMessage += ` (Rate limit: ${rateLimitRemaining}/${rateLimitLimit} remaining)`;
        }
        
        throw new Error(errorMessage);
      }

      // Handle unauthorized
      if (response.status === 401) {
        throw new Error('GitHub authentication failed. Please reconnect your GitHub account.');
      }

      // For other errors, include rate limit info
      const errorText = await response.text().catch(() => response.statusText);
      let errorMessage = `GitHub API error (${response.status}): ${errorText}`;
      if (rateLimitRemaining && parseInt(rateLimitRemaining) < 10) {
        errorMessage += ` [Rate limit: ${rateLimitRemaining}/${rateLimitLimit} remaining]`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async getRepoInfo(): Promise<RepoInfo> {
    const repo = await this.fetchGitHub<{
      name: string;
      default_branch: string;
      private: boolean;
    }>('');

    this.defaultBranch = repo.default_branch;

    return {
      path: this.repoFullName,
      name: repo.name,
      currentBranch: repo.default_branch,
      isClean: true, // GitHub repos are always "clean"
      ahead: 0,
      behind: 0,
      remotes: ['origin'],
    };
  }

  async getBranches(): Promise<BranchesResponse> {
    const branches = await this.fetchGitHub<GitHubBranch[]>('/branches?per_page=100');

    if (!Array.isArray(branches)) {
      return {
        local: [],
        remote: [],
        current: this.defaultBranch,
      };
    }

    const branchList: Branch[] = branches.map((branch) => ({
      name: branch.name.replace('refs/heads/', ''),
      commit: branch.commit.sha,
      isCurrent: branch.name === this.defaultBranch,
      isRemote: false,
    }));

    return {
      local: branchList,
      remote: [], // GitHub API doesn't distinguish local/remote
      current: this.defaultBranch,
    };
  }

  async getCommits(branch?: string, limit: number = 100): Promise<Commit[]> {
    try {
      const sha = branch || this.defaultBranch;
      const commits = await this.fetchGitHub<GitHubCommit[]>(
        `/commits?sha=${sha}&per_page=${Math.min(limit, 100)}`
      );

      if (!Array.isArray(commits)) {
        return [];
      }

      return commits.map((commit) => ({
        hash: commit.sha,
        shortHash: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        body: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
        },
        date: commit.commit.author.date,
        parents: commit.parents.map((p) => p.sha),
        refs: [],
      }));
    } catch (error: any) {
      // Handle empty repository or branch not found gracefully
      if (error.message?.includes('Not Found') || error.message?.includes('404')) {
        console.warn(`No commits found for ${this.repoFullName}${branch ? ` on branch ${branch}` : ''} - repository may be empty or branch doesn't exist`);
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getGraph(limit: number = 100): Promise<GraphData> {
    // First, fetch repo info to get the actual default branch from GitHub
    // This ensures we use the repository's real default branch, not a hardcoded value
    const repoInfo = await this.getRepoInfo();
    const actualDefaultBranch = repoInfo.currentBranch || this.defaultBranch;
    
    // Update our internal defaultBranch to the actual one
    this.defaultBranch = actualDefaultBranch;
    
    // Get branches
    const branches = await this.getBranches();
    
    // Use the actual default branch
    const branchToUse = actualDefaultBranch;
    
    // Get commits for the default branch
    const commits = await this.getCommits(branchToUse, limit);

    // Handle empty repository case
    if (!commits || commits.length === 0) {
      return {
        nodes: [],
        edges: [],
        columns: 0,
        branches: branches.local.map((b) => b.name),
        currentBranch: actualDefaultBranch, // Use the actual default branch from GitHub
      };
    }

    // Build column assignment for proper branching visualization
    const hashToColumn = new Map<string, number>();
    const activeColumns: (string | null)[] = [];

    // Process commits to assign columns
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];

      // Check if any active column ends at this commit (merge target)
      let column = -1;
      for (let c = 0; c < activeColumns.length; c++) {
        if (activeColumns[c] === commit.hash) {
          column = c;
          activeColumns[c] = null;
          break;
        }
      }

      // If no column found, find first empty or create new
      if (column === -1) {
        column = activeColumns.findIndex((c) => c === null);
        if (column === -1) {
          column = activeColumns.length;
          activeColumns.push(null);
        }
      }

      hashToColumn.set(commit.hash, column);

      // Set up columns for parents
      if (commit.parents.length > 0) {
        // First parent continues in same column
        activeColumns[column] = commit.parents[0];

        // Additional parents (merges) get new columns
        for (let p = 1; p < commit.parents.length; p++) {
          const parentHash = commit.parents[p];
          if (!hashToColumn.has(parentHash)) {
            let newCol = activeColumns.findIndex((c) => c === null);
            if (newCol === -1) {
              newCol = activeColumns.length;
              activeColumns.push(parentHash);
            } else {
              activeColumns[newCol] = parentHash;
            }
          }
        }
      }
    }

    const columnValues = Array.from(hashToColumn.values());
    const maxColumn = columnValues.length > 0 ? Math.max(...columnValues) : 0;

    // Create nodes
    const nodes: GraphNode[] = commits.map((commit, idx) => ({
      id: commit.hash,
      hash: commit.hash,
      shortHash: commit.shortHash,
      message: commit.message,
      author: commit.author.name,
      date: commit.date,
      column: hashToColumn.get(commit.hash) || 0,
      row: idx,
      refs: [],
      color: BRANCH_COLORS[(hashToColumn.get(commit.hash) || 0) % BRANCH_COLORS.length],
      parentHashes: commit.parents,
    }));

    // Create edges
    const edges: GraphEdge[] = [];
    const hashToNode = new Map(nodes.map((n) => [n.hash, n]));

    for (const commit of commits) {
      for (let pIdx = 0; pIdx < commit.parents.length; pIdx++) {
        const parentHash = commit.parents[pIdx];
        const parentNode = hashToNode.get(parentHash);
        if (parentNode) {
          const childColumn = hashToColumn.get(commit.hash) || 0;
          const parentColumn = hashToColumn.get(parentHash) || 0;

          edges.push({
            id: `${commit.hash}-${parentHash}`,
            source: commit.hash,
            target: parentHash,
            type: commit.parents.length > 1 && pIdx > 0 ? 'merge' : 'normal',
            color: BRANCH_COLORS[childColumn % BRANCH_COLORS.length],
            sourceColumn: childColumn,
            targetColumn: parentColumn,
          });
        }
      }
    }

    return {
      nodes,
      edges,
      columns: maxColumn + 1,
      branches: branches.local.map((b) => b.name),
      currentBranch: actualDefaultBranch,
    };
  }

  async getCommitDetails(hash: string): Promise<CommitDetails> {
    const commit = await this.fetchGitHub<GitHubCommitDetail>(`/commits/${hash}`);

    const files: FileChange[] = (commit.files || []).map((file) => ({
      path: file.filename,
      status: file.status as 'added' | 'modified' | 'deleted' | 'renamed',
      additions: file.additions,
      deletions: file.deletions,
    }));

    // Get diff by fetching the commit with diff format
    let diff = '';
    try {
      const diffResponse = await fetch(
        `https://api.github.com/repos/${this.repoFullName}/commits/${hash}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/vnd.github.v3.diff',
          },
        }
      );
      if (diffResponse.ok) {
        diff = await diffResponse.text();
      }
    } catch (error) {
      console.error('Failed to fetch diff:', error);
    }

    return {
      hash: commit.sha,
      shortHash: commit.sha.substring(0, 7),
      message: commit.commit.message.split('\n')[0],
      body: commit.commit.message,
      author: {
        name: commit.commit.author.name,
        email: commit.commit.author.email,
      },
      committer: {
        name: commit.commit.committer.name,
        email: commit.commit.committer.email,
      },
      date: commit.commit.author.date,
      parents: commit.parents.map((p) => p.sha),
      refs: [],
      files,
      stats: {
        totalFiles: files.length,
        additions: commit.stats?.additions || 0,
        deletions: commit.stats?.deletions || 0,
      },
      diff,
    };
  }

  async checkoutBranch(branchName: string): Promise<void> {
    // On GitHub, we just update the current branch reference
    this.defaultBranch = branchName;
  }

  async search(query: string): Promise<{ query: string; results: any[]; totalCount: number }> {
    // Use GitHub's search API
    const response = await fetch(
      `https://api.github.com/search/commits?q=repo:${this.repoFullName}+${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/vnd.github.cloak-preview+json',
        },
      }
    );

    if (!response.ok) {
      return { query, results: [], totalCount: 0 };
    }

    const data = await response.json();
    const results = (data.items || []).slice(0, 20).map((item: any) => ({
      type: 'commit',
      id: item.sha,
      label: item.sha.substring(0, 7),
      description: item.commit.message,
    }));

    return {
      query,
      results,
      totalCount: results.length,
    };
  }
}

