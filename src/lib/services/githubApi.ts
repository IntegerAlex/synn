import { recordGitHubUsage } from "@/lib/services/githubUsage";
import type {
  Branch,
  BranchesResponse,
  Commit,
  CommitDetails,
  FileChange,
  GraphData,
  GraphEdge,
  GraphNode,
  RepoInfo,
} from "@/types/git";

// Color palette for branch visualization
const BRANCH_COLORS = [
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#f59e0b", // Orange
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#ef4444", // Red
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
  "#14b8a6", // Teal
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
  private defaultBranch: string = "main";
  private clerkUserId?: string;
  private userId?: number;
  private lastRateLimitInfo: {
    remaining: number | null;
    limit: number | null;
    reset: number | null;
  } | null = null;

  constructor(
    accessToken: string,
    repoFullName: string,
    defaultBranch?: string,
    options?: { clerkUserId?: string; userId?: number },
  ) {
    if (!accessToken) {
      throw new Error("GitHub access token is required");
    }
    if (!repoFullName?.includes("/")) {
      throw new Error("Invalid repository format. Expected: owner/repo");
    }

    this.accessToken = accessToken;
    this.repoFullName = repoFullName;
    const [owner, repo] = repoFullName.split("/");

    if (!owner || !repo) {
      throw new Error("Invalid repository format. Expected: owner/repo");
    }

    this.owner = owner;
    this.repo = repo;
    if (defaultBranch) {
      this.defaultBranch = defaultBranch;
    }
    this.clerkUserId = options?.clerkUserId;
    this.userId = options?.userId;
  }

  private async trackUsage(endpoint: string, statusCode: number) {
    try {
      await recordGitHubUsage({
        clerkUserId: this.clerkUserId,
        userId: this.userId,
        endpoint,
        statusCode,
      });
    } catch (err) {
      // Do not block GitHub calls on usage tracking failures
      console.warn("Failed to record GitHub usage", err);
    }
  }

  private async fetchGitHub<T>(endpoint: string): Promise<T> {
    const url = `https://api.github.com/repos/${this.repoFullName}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    // Record usage for this endpoint
    await this.trackUsage(endpoint || "/", response.status);

    // Always track rate limit info
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const rateLimitLimit = response.headers.get("x-ratelimit-limit");
    const rateLimitReset = response.headers.get("x-ratelimit-reset");
    const rateLimitUsed = response.headers.get("x-ratelimit-used");

    // Store rate limit info
    this.lastRateLimitInfo = {
      remaining: rateLimitRemaining ? parseInt(rateLimitRemaining, 10) : null,
      limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
      reset: rateLimitReset ? parseInt(rateLimitReset, 10) : null,
    };

    if (!response.ok) {
      // Handle rate limiting (403 or 429)
      if (response.status === 403 || response.status === 429) {
        const remaining = rateLimitRemaining
          ? parseInt(rateLimitRemaining, 10)
          : 0;
        if (remaining === 0 || response.status === 429) {
          const resetTime = rateLimitReset
            ? new Date(parseInt(rateLimitReset, 10) * 1000)
            : null;
          const timeUntilReset = resetTime
            ? Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60)
            : null;
          throw new Error(
            `GitHub API rate limit exceeded. ${rateLimitUsed}/${rateLimitLimit} requests used. ${resetTime ? `Resets in ${timeUntilReset} minutes (${resetTime.toLocaleString()})` : "Please try again later."}`,
          );
        }
      }

      // Handle not found
      if (response.status === 404) {
        // Check if it's actually a rate limit issue (sometimes GitHub returns 404 for rate limits)
        if (rateLimitRemaining === "0") {
          const resetTime = rateLimitReset
            ? new Date(parseInt(rateLimitReset, 10) * 1000)
            : null;
          const timeUntilReset = resetTime
            ? Math.ceil((resetTime.getTime() - Date.now()) / 1000 / 60)
            : null;
          throw new Error(
            `GitHub API rate limit exceeded (returned as 404). ${rateLimitUsed}/${rateLimitLimit} requests used. Resets in ${timeUntilReset} minutes (${resetTime?.toLocaleString()}).`,
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
        if (rateLimitRemaining && parseInt(rateLimitRemaining, 10) < 10) {
          errorMessage += ` (Rate limit: ${rateLimitRemaining}/${rateLimitLimit} remaining)`;
        }

        throw new Error(errorMessage);
      }

      // Handle unauthorized
      if (response.status === 401) {
        throw new Error(
          "GitHub authentication failed. Please reconnect your GitHub account.",
        );
      }

      // For other errors, include rate limit info
      const errorText = await response.text().catch(() => response.statusText);
      let errorMessage = `GitHub API error (${response.status}): ${errorText}`;
      if (rateLimitRemaining && parseInt(rateLimitRemaining, 10) < 10) {
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
    }>("");

    this.defaultBranch = repo.default_branch;

    return {
      path: this.repoFullName,
      name: repo.name,
      currentBranch: repo.default_branch,
      isClean: true, // GitHub repos are always "clean"
      ahead: 0,
      behind: 0,
      remotes: ["origin"],
    };
  }

  async getBranches(): Promise<BranchesResponse> {
    const branches = await this.fetchGitHub<GitHubBranch[]>(
      "/branches?per_page=100",
    );

    if (!Array.isArray(branches)) {
      return {
        local: [],
        remote: [],
        current: this.defaultBranch,
      };
    }

    const branchList: Branch[] = branches.map((branch) => ({
      name: branch.name.replace("refs/heads/", ""),
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

  async getFiles(ref?: string): Promise<string[]> {
    const branch = ref || this.defaultBranch;
    // Fetch branch to get tree SHA
    const branchInfo = await this.fetchGitHub<any>(
      `/branches/${encodeURIComponent(branch)}`,
    );

    const treeSha: string | undefined =
      branchInfo?.commit?.commit?.tree?.sha || branchInfo?.commit?.sha;

    if (!treeSha) return [];

    const tree = await this.fetchGitHub<any>(
      `/git/trees/${treeSha}?recursive=1`,
    );
    const entries: Array<{ path: string; type: string }> = Array.isArray(
      tree?.tree,
    )
      ? tree.tree
      : [];

    return entries
      .filter((e) => e.type === "blob" && typeof e.path === "string")
      .map((e) => e.path)
      .filter(Boolean);
  }

  async getFileHistory(
    filePath: string,
    ref?: string,
    limit: number = 50,
  ): Promise<
    Array<{
      hash: string;
      shortHash: string;
      author: { name: string; email: string };
      date: string;
      message: string;
    }>
  > {
    const sha = ref || this.defaultBranch;
    const perPage = Math.max(1, Math.min(100, limit));
    const commits = await this.fetchGitHub<any[]>(
      `/commits?sha=${encodeURIComponent(sha)}&path=${encodeURIComponent(filePath)}&per_page=${perPage}`,
    );

    if (!Array.isArray(commits)) return [];

    return commits.map((c: any) => ({
      hash: c.sha,
      shortHash: String(c.sha).substring(0, 7),
      author: {
        name: c?.commit?.author?.name || "Unknown",
        email: c?.commit?.author?.email || "",
      },
      date: c?.commit?.author?.date || "",
      message: String(c?.commit?.message || "").split("\n")[0],
    }));
  }

  async getFileContents(
    filePath: string,
    ref?: string,
  ): Promise<{ content: string; encoding: string; size: number }> {
    // Use ref if provided and valid, otherwise fall back to default branch
    // GitHub API accepts branch names, tags, or commit SHAs
    let sha = ref || this.defaultBranch;

    // If ref looks like it might be invalid (contains slashes that aren't part of a valid branch name),
    // try the default branch first
    if (
      ref?.includes("/") &&
      !ref.match(/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/)
    ) {
      // This might be a malformed ref, try default branch
      sha = this.defaultBranch;
    }

    try {
      const response = await this.fetchGitHub<any>(
        `/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(sha)}`,
      );

      if (!response) {
        throw new Error(`File not found: ${filePath} on ${sha}`);
      }

      // GitHub API returns base64 encoded content
      const content = response.content || "";
      const encoding = response.encoding || "base64";

      // Decode base64 content
      let decodedContent = "";
      if (encoding === "base64") {
        try {
          decodedContent = Buffer.from(content, "base64").toString("utf-8");
        } catch {
          decodedContent = content;
        }
      } else {
        decodedContent = content;
      }

      return {
        content: decodedContent,
        encoding: response.encoding || "utf-8",
        size: response.size || 0,
      };
    } catch (error: any) {
      // If the file wasn't found on the specified ref, try default branch as fallback
      if (
        (ref && ref !== this.defaultBranch && error.message?.includes("404")) ||
        error.message?.includes("Not Found")
      ) {
        try {
          const fallbackResponse = await this.fetchGitHub<any>(
            `/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(this.defaultBranch)}`,
          );

          if (fallbackResponse) {
            const content = fallbackResponse.content || "";
            const encoding = fallbackResponse.encoding || "base64";

            let decodedContent = "";
            if (encoding === "base64") {
              try {
                decodedContent = Buffer.from(content, "base64").toString(
                  "utf-8",
                );
              } catch {
                decodedContent = content;
              }
            } else {
              decodedContent = content;
            }

            return {
              content: decodedContent,
              encoding: fallbackResponse.encoding || "utf-8",
              size: fallbackResponse.size || 0,
            };
          }
        } catch {
          // Fallback also failed, throw original error
        }
      }
      throw error;
    }
  }

  async getBlame(
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
  > {
    const sha = ref || this.defaultBranch;

    // Get file contents first to determine line count - this MUST succeed for blame to work
    let fileContents;
    let lines: string[] = [];

    try {
      fileContents = await this.getFileContents(filePath, ref);
      lines = fileContents.content.split("\n");
    } catch (_fileError) {
      return []; // Can't provide blame without file contents
    }

    // If file is empty, return empty array
    if (lines.length === 0) {
      return [];
    }

    // Strategy: Reconstruct blame by analyzing commit patches (optimized - no file content fetches)
    // Process commits from newest to oldest, tracking which lines each commit modified
    const blameInfo: Array<{
      hash: string;
      author: string;
      date: string;
      message: string;
      lineNumber: number;
      content: string;
    }> = [];

    try {
      // Initialize blame array - we'll fill it as we process commits
      const lineBlame: Array<{
        hash: string;
        author: string;
        date: string;
        message: string;
      } | null> = new Array(lines.length).fill(null);

      // Get commits that touched this file (most recent first, limit to 15 for performance)
      // Processing fewer commits reduces API calls significantly while still covering recent changes
      const commitsResponse = await this.fetchGitHub<any[]>(
        `/commits?sha=${encodeURIComponent(sha)}&path=${encodeURIComponent(filePath)}&per_page=15`,
      );

      if (!Array.isArray(commitsResponse) || commitsResponse.length === 0) {
        throw new Error("No commits found");
      }

      // Process commits from newest to oldest
      // Track line content to commit mapping to avoid fetching file contents
      const lineContentToCommit = new Map<
        string,
        { hash: string; author: string; date: string; message: string }
      >();

      for (const commit of commitsResponse) {
        if (!commit.sha) continue;

        try {
          // Get commit details with patch (includes patch in response, no extra call needed)
          const commitDetail = await this.fetchGitHub<any>(
            `/commits/${commit.sha}`,
          );

          if (!commitDetail.files) continue;

          // Find the file in this commit
          const fileChange = commitDetail.files.find(
            (f: any) =>
              f.filename === filePath || f.filename.endsWith(`/${filePath}`),
          );

          if (!fileChange?.patch) continue;

          // Get commit metadata
          const author =
            commitDetail.commit?.author?.name ||
            commitDetail.author?.login ||
            commit.commit?.author?.name ||
            commit.author?.login ||
            "Unknown";
          const date =
            commitDetail.commit?.author?.date ||
            commit.commit?.author?.date ||
            new Date().toISOString();
          const message =
            commitDetail.commit?.message?.split("\n")[0] ||
            commit.commit?.message?.split("\n")[0] ||
            "No message";

          const commitInfo = { hash: commit.sha, author, date, message };

          // Parse the patch to extract added/modified lines with their content
          const patch = fileChange.patch;
          const patchLines = patch.split("\n");

          let newFileLine = 0; // Line number in the file after this commit (1-based)
          const addedLines: Array<{ lineNum: number; content: string }> = [];

          for (const patchLine of patchLines) {
            // Parse unified diff format: @@ -old_start,old_count +new_start,new_count @@
            const hunkMatch = patchLine.match(
              /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/,
            );
            if (hunkMatch) {
              const newStart = parseInt(hunkMatch[3], 10);
              newFileLine = newStart; // Start counting from this line (1-based)
              continue;
            }

            // Track added/modified lines with their content
            if (patchLine.startsWith("+") && !patchLine.startsWith("+++")) {
              // This line was added/modified in this commit
              const lineContent = patchLine.substring(1); // Remove the '+' prefix
              addedLines.push({ lineNum: newFileLine, content: lineContent });
              newFileLine++;
            } else if (
              patchLine.startsWith("-") &&
              !patchLine.startsWith("---")
            ) {
              // This line was deleted - don't increment newFileLine
            } else if (!patchLine.startsWith("\\") && patchLine.trim() !== "") {
              // Context line (exists in both old and new) - increment
              newFileLine++;
            }
          }

          // For each added line, try to find it in the final file and assign blame
          // Use content matching with position hints from the patch
          for (const addedLine of addedLines) {
            const lineContent = addedLine.content;

            // First, try exact position match (if line numbers haven't shifted much)
            const approximateIndex = addedLine.lineNum - 1;
            if (
              approximateIndex >= 0 &&
              approximateIndex < lines.length &&
              lineBlame[approximateIndex] === null &&
              lines[approximateIndex] === lineContent
            ) {
              lineBlame[approximateIndex] = commitInfo;
              lineContentToCommit.set(lineContent, commitInfo);
              continue;
            }

            // If exact position doesn't match, search nearby (within ±5 lines for better performance)
            const searchStart = Math.max(0, approximateIndex - 5);
            const searchEnd = Math.min(lines.length, approximateIndex + 6);
            let found = false;

            for (let i = searchStart; i < searchEnd; i++) {
              if (lineBlame[i] === null && lines[i] === lineContent) {
                lineBlame[i] = commitInfo;
                lineContentToCommit.set(lineContent, commitInfo);
                found = true;
                break;
              }
            }

            // If still not found and we haven't seen this content before, mark it for later
            if (!found && !lineContentToCommit.has(lineContent)) {
              lineContentToCommit.set(lineContent, commitInfo);
            }
          }
        } catch (_commitDetailError) {}
      }

      // Fill in any remaining unassigned lines by matching content
      for (let i = 0; i < lines.length; i++) {
        if (lineBlame[i] === null) {
          const lineContent = lines[i];
          const matchingCommit = lineContentToCommit.get(lineContent);
          if (matchingCommit) {
            lineBlame[i] = matchingCommit;
          }
        }
      }

      // Fill in any remaining null lines with the oldest commit (or most recent if no commits processed)
      const fallbackCommit =
        commitsResponse[commitsResponse.length - 1] || commitsResponse[0];
      const fallbackAuthor =
        fallbackCommit?.commit?.author?.name ||
        fallbackCommit?.author?.login ||
        "Unknown";
      const fallbackDate =
        fallbackCommit?.commit?.author?.date || new Date().toISOString();
      const fallbackMessage =
        fallbackCommit?.commit?.message?.split("\n")[0] || "No message";
      const fallbackHash = fallbackCommit?.sha || "unknown";

      // Build final blame info
      for (let i = 0; i < lines.length; i++) {
        const blame = lineBlame[i];
        if (blame) {
          blameInfo.push({
            ...blame,
            lineNumber: i + 1,
            content: lines[i] || "",
          });
        } else {
          // Fallback for unassigned lines
          blameInfo.push({
            hash: fallbackHash,
            author: fallbackAuthor,
            date: fallbackDate,
            message: fallbackMessage,
            lineNumber: i + 1,
            content: lines[i] || "",
          });
        }
      }

      return blameInfo;
    } catch (_error) {
      // Fallback: Use the most recent commit for all lines
      try {
        const commitsResponse = await this.fetchGitHub<any[]>(
          `/commits?sha=${encodeURIComponent(sha)}&path=${encodeURIComponent(filePath)}&per_page=1`,
        );

        if (Array.isArray(commitsResponse) && commitsResponse.length > 0) {
          const mostRecentCommit = commitsResponse[0];

          if (mostRecentCommit?.sha) {
            for (let i = 0; i < lines.length; i++) {
              blameInfo.push({
                hash: mostRecentCommit.sha,
                author:
                  mostRecentCommit.commit?.author?.name ||
                  mostRecentCommit.author?.login ||
                  "Unknown",
                date:
                  mostRecentCommit.commit?.author?.date ||
                  mostRecentCommit.commit?.committer?.date ||
                  new Date().toISOString(),
                message:
                  mostRecentCommit.commit?.message?.split("\n")[0] ||
                  "No message",
                lineNumber: i + 1,
                content: lines[i] || "",
              });
            }
            return blameInfo;
          }
        }
      } catch (_fallbackError) {
        // Fallback failed, will use placeholder data
      }
    }

    // Strategy 3: Last resort - use placeholder data
    for (let i = 0; i < lines.length; i++) {
      blameInfo.push({
        hash: "unknown",
        author: "Unknown",
        date: new Date().toISOString(),
        message:
          "Blame information unavailable - file exists but commit history could not be retrieved",
        lineNumber: i + 1,
        content: lines[i] || "",
      });
    }

    return blameInfo;
  }

  async getCommits(branch?: string, limit: number = 100): Promise<Commit[]> {
    try {
      const sha = branch || this.defaultBranch;
      const allCommits: GitHubCommit[] = [];
      const perPage = 100; // GitHub API max per page
      const totalPages = Math.ceil(limit / perPage);

      // Fetch all pages needed to get the requested limit
      for (
        let page = 1;
        page <= totalPages && allCommits.length < limit;
        page++
      ) {
        const url = `https://api.github.com/repos/${this.repoFullName}/commits?sha=${sha}&per_page=${perPage}&page=${page}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        });

        // Track rate limit info
        const rateLimitRemaining = response.headers.get(
          "x-ratelimit-remaining",
        );
        const rateLimitLimit = response.headers.get("x-ratelimit-limit");
        const rateLimitReset = response.headers.get("x-ratelimit-reset");

        this.lastRateLimitInfo = {
          remaining: rateLimitRemaining
            ? parseInt(rateLimitRemaining, 10)
            : null,
          limit: rateLimitLimit ? parseInt(rateLimitLimit, 10) : null,
          reset: rateLimitReset ? parseInt(rateLimitReset, 10) : null,
        };

        // Track usage for commits endpoint (paginated)
        await this.trackUsage("/commits", response.status);

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(
              `No commits found for ${this.repoFullName}${branch ? ` on branch ${branch}` : ""} - repository may be empty or branch doesn't exist`,
            );
            return [];
          }
          throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`,
          );
        }

        const pageCommits: GitHubCommit[] = await response.json();

        if (!Array.isArray(pageCommits) || pageCommits.length === 0) {
          // No more commits available
          break;
        }

        allCommits.push(...pageCommits);

        // If we got fewer than perPage, we've reached the end
        if (pageCommits.length < perPage) {
          break;
        }
      }

      // Limit to the requested amount
      const commits = allCommits.slice(0, limit);

      return commits.map((commit) => ({
        hash: commit.sha,
        shortHash: commit.sha.substring(0, 7),
        message: commit.commit.message.split("\n")[0],
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
      if (
        error.message?.includes("Not Found") ||
        error.message?.includes("404")
      ) {
        console.warn(
          `No commits found for ${this.repoFullName}${branch ? ` on branch ${branch}` : ""} - repository may be empty or branch doesn't exist`,
        );
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getGraph(limit: number = 100, offset: number = 0): Promise<GraphData> {
    // Always respect repo's real default branch
    const repoInfo = await this.getRepoInfo();
    const actualDefaultBranch = repoInfo.currentBranch || this.defaultBranch;
    this.defaultBranch = actualDefaultBranch;

    const branches = await this.getBranches();
    const effectiveLimit = Math.min(Math.max(limit, 1), 10000);
    const effectiveOffset = Math.max(0, offset);
    const effectiveWindow = Math.min(
      Math.max(effectiveLimit + effectiveOffset, 1),
      10000,
    );

    // Prioritize default branch, then alphabetical for determinism
    const branchNames = branches.local
      .map((b) => b.name)
      .sort((a, b) => {
        if (a === actualDefaultBranch) return -1;
        if (b === actualDefaultBranch) return 1;
        return a.localeCompare(b);
      });

    // Collect commits across all branch heads so divergent branches appear.
    const commitMap = new Map<string, Commit>();
    const commitToBranches = new Map<string, Set<string>>();

    // Fetch commits for all branches in parallel to avoid slow sequential requests.
    const branchCommitResults = await Promise.all(
      branchNames.map(async (branchName) => ({
        branchName,
        commits: await this.getCommits(branchName, effectiveWindow),
      })),
    );

    // Preserve deterministic ordering by iterating in the same branch order.
    for (const { branchName, commits: branchCommits } of branchCommitResults) {
      if (commitMap.size >= effectiveWindow) break;

      for (const commit of branchCommits) {
        if (!commitMap.has(commit.hash)) {
          commitMap.set(commit.hash, commit);
        }
        const refs = commitToBranches.get(commit.hash) ?? new Set<string>();
        refs.add(branchName);
        commitToBranches.set(commit.hash, refs);

        if (commitMap.size >= effectiveWindow) break;
      }
    }

    // Sort newest → oldest and apply window (offset/limit)
    const allCommits = Array.from(commitMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, effectiveWindow);

    const commits = allCommits.slice(
      effectiveOffset,
      effectiveOffset + effectiveLimit,
    );
    const hasMore = commitMap.size >= effectiveWindow;

    // Handle empty repository case
    if (!commits || commits.length === 0) {
      return {
        nodes: [],
        edges: [],
        columns: 0,
        branches: branches.local.map((b) => b.name),
        currentBranch: actualDefaultBranch,
        branchHeads: Object.fromEntries(
          branches.local.map((b) => [b.name, b.commit]),
        ),
        hasMore,
        offset: effectiveOffset,
        limit: effectiveLimit,
      };
    }

    // Build column assignment for proper branching visualization
    const hashToColumn = new Map<string, number>();
    const activeColumns: (string | null)[] = [];

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];

      let column = -1;
      for (let c = 0; c < activeColumns.length; c++) {
        if (activeColumns[c] === commit.hash) {
          column = c;
          activeColumns[c] = null;
          break;
        }
      }

      if (column === -1) {
        column = activeColumns.indexOf(null);
        if (column === -1) {
          column = activeColumns.length;
          activeColumns.push(null);
        }
      }

      hashToColumn.set(commit.hash, column);

      if (commit.parents.length > 0) {
        activeColumns[column] = commit.parents[0];
        for (let p = 1; p < commit.parents.length; p++) {
          const parentHash = commit.parents[p];
          if (!hashToColumn.has(parentHash)) {
            let newCol = activeColumns.indexOf(null);
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

    const maxColumn = Math.max(...hashToColumn.values(), 0);

    const nodes: GraphNode[] = commits.map((commit, idx) => {
      const branchRefs = Array.from(commitToBranches.get(commit.hash) || []);
      return {
        id: commit.hash,
        hash: commit.hash,
        shortHash: commit.shortHash,
        message: commit.message,
        author: commit.author.name,
        date: commit.date,
        column: hashToColumn.get(commit.hash) || 0,
        row: idx,
        refs: branchRefs,
        color:
          BRANCH_COLORS[
            (hashToColumn.get(commit.hash) || 0) % BRANCH_COLORS.length
          ],
        parentHashes: commit.parents,
      };
    });

    const edges: GraphEdge[] = [];
    const hashToNode = new Map(nodes.map((n) => [n.hash, n]));

    for (const commit of commits) {
      for (let pIdx = 0; pIdx < commit.parents.length; pIdx++) {
        const parentHash = commit.parents[pIdx];
        if (!hashToNode.has(parentHash)) continue; // Parent outside current window

        const childColumn = hashToColumn.get(commit.hash) || 0;
        const parentColumn = hashToColumn.get(parentHash) || 0;

        edges.push({
          id: `${commit.hash}-${parentHash}`,
          source: commit.hash,
          target: parentHash,
          type: commit.parents.length > 1 && pIdx > 0 ? "merge" : "normal",
          color: BRANCH_COLORS[childColumn % BRANCH_COLORS.length],
          sourceColumn: childColumn,
          targetColumn: parentColumn,
        });
      }
    }

    return {
      nodes,
      edges,
      columns: maxColumn + 1,
      branches: branches.local.map((b) => b.name),
      currentBranch: actualDefaultBranch,
      branchHeads: Object.fromEntries(
        branches.local.map((b) => [b.name, b.commit]),
      ),
      hasMore,
      offset: effectiveOffset,
      limit: effectiveLimit,
    };
  }

  async getCommitDetails(hash: string): Promise<CommitDetails> {
    const commit = await this.fetchGitHub<GitHubCommitDetail>(
      `/commits/${hash}`,
    );

    const files: FileChange[] = (commit.files || []).map((file) => ({
      path: file.filename,
      status: file.status as "added" | "modified" | "deleted" | "renamed",
      additions: file.additions,
      deletions: file.deletions,
    }));

    // Get diff by fetching the commit with diff format
    let diff = "";
    try {
      const diffResponse = await fetch(
        `https://api.github.com/repos/${this.repoFullName}/commits/${hash}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/vnd.github.v3.diff",
          },
        },
      );
      if (diffResponse.ok) {
        diff = await diffResponse.text();
      }
    } catch (error) {
      console.error("Failed to fetch diff:", error);
    }

    return {
      hash: commit.sha,
      shortHash: commit.sha.substring(0, 7),
      message: commit.commit.message.split("\n")[0],
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

  async search(
    query: string,
  ): Promise<{ query: string; results: any[]; totalCount: number }> {
    // Use GitHub's search API
    const response = await fetch(
      `https://api.github.com/search/commits?q=repo:${this.repoFullName}+${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/vnd.github.cloak-preview+json",
        },
      },
    );

    await this.trackUsage("/search/commits", response.status);

    if (!response.ok) {
      return { query, results: [], totalCount: 0 };
    }

    const data = await response.json();
    const results = (data.items || []).slice(0, 20).map((item: any) => ({
      type: "commit",
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
