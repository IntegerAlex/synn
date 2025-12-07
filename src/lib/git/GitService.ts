import simpleGit, { type SimpleGit, type BranchSummary } from 'simple-git';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, dirname } from 'path';
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
    SearchResponse,
    SearchResult,
    BlameInfo,
    FileHistoryEntry,
    BranchCompare,
    HotspotFile,
} from '@/types/git';
import { Errors } from '@/lib/utils/errorHandler';

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

// File to persist the repo path across module reloads
const REPO_PATH_FILE = '/tmp/synn-repo-path.txt';

function persistRepoPath(path: string): void {
    try {
        const dir = dirname(REPO_PATH_FILE);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(REPO_PATH_FILE, path, 'utf-8');
    } catch (e) {
        console.error('Failed to persist repo path:', e);
    }
}

function loadPersistedRepoPath(): string | null {
    try {
        if (existsSync(REPO_PATH_FILE)) {
            const path = readFileSync(REPO_PATH_FILE, 'utf-8').trim();
            if (path && existsSync(path) && existsSync(join(path, '.git'))) {
                return path;
            }
        }
    } catch (e) {
        console.error('Failed to load persisted repo path:', e);
    }
    return null;
}

// Simple in-memory cache
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class Cache {
    private store = new Map<string, CacheEntry<unknown>>();

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.store.delete(key);
            return null;
        }
        return entry.data as T;
    }

    set<T>(key: string, data: T, ttlMs: number = 5000): void {
        this.store.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    }

    invalidate(): void {
        this.store.clear();
    }
}

class GitService {
    private git: SimpleGit | null = null;
    private repoPath: string | null = null;
    private cache = new Cache();

    constructor() {
        // Try to restore from persisted path on initialization
        const persistedPath = loadPersistedRepoPath();
        if (persistedPath) {
            this.git = simpleGit(persistedPath);
            this.repoPath = persistedPath;
        }
    }

    setRepository(path: string): RepoInfo {
        if (!existsSync(path)) {
            throw Errors.repoNotFound(path);
        }

        const gitDir = join(path, '.git');
        if (!existsSync(gitDir)) {
            throw Errors.notAGitRepo(path);
        }

        this.git = simpleGit(path);
        this.repoPath = path;
        this.cache.invalidate();

        // Persist for future cold starts
        persistRepoPath(path);

        // Return basic info synchronously
        return {
            path,
            name: basename(path),
            currentBranch: '',
            isClean: true,
            ahead: 0,
            behind: 0,
            remotes: [],
        };
    }

    private ensureRepo(): SimpleGit {
        if (!this.git || !this.repoPath) {
            throw Errors.repoNotSet();
        }
        return this.git;
    }

    getRepoPath(): string | null {
        return this.repoPath;
    }

    async getRepoInfo(): Promise<RepoInfo> {
        const git = this.ensureRepo();

        const cached = this.cache.get<RepoInfo>('repoInfo');
        if (cached) return cached;

        const [status, remotes] = await Promise.all([
            git.status(),
            git.getRemotes(true),
        ]);

        const info: RepoInfo = {
            path: this.repoPath!,
            name: basename(this.repoPath!),
            currentBranch: status.current || 'HEAD',
            isClean: status.isClean(),
            ahead: status.ahead,
            behind: status.behind,
            remotes: remotes.map(r => r.name),
        };

        this.cache.set('repoInfo', info, 2000);
        return info;
    }

    async getBranches(): Promise<BranchesResponse> {
        const git = this.ensureRepo();

        const cached = this.cache.get<BranchesResponse>('branches');
        if (cached) return cached;

        const [localBranches, remoteBranches] = await Promise.all([
            git.branchLocal(),
            git.branch(['-r']).catch(() => ({ all: [], branches: {}, detached: false, current: '' }) as BranchSummary),
        ]);

        const local: Branch[] = localBranches.all.map(name => ({
            name,
            commit: localBranches.branches[name]?.commit || '',
            isCurrent: name === localBranches.current,
            isRemote: false,
            lastCommitDate: localBranches.branches[name]?.label || undefined,
        }));

        const remote: Branch[] = remoteBranches.all.map(name => ({
            name,
            commit: remoteBranches.branches[name]?.commit || '',
            isCurrent: false,
            isRemote: true,
        }));

        const response: BranchesResponse = {
            local,
            remote,
            current: localBranches.current || '',
        };

        this.cache.set('branches', response, 5000);
        return response;
    }

    async getCommits(branch?: string, limit: number = 100): Promise<Commit[]> {
        const git = this.ensureRepo();

        const cacheKey = `commits:${branch || 'all'}:${limit}`;
        const cached = this.cache.get<Commit[]>(cacheKey);
        if (cached) return cached;

        const options = ['--all', '--date=iso', `--max-count=${limit}`];
        if (branch) {
            options.push(branch);
        }

        const log = await git.log(options);

        const commits: Commit[] = log.all.map(entry => ({
            hash: entry.hash,
            shortHash: entry.hash.substring(0, 7),
            message: entry.message,
            body: entry.body,
            author: {
                name: entry.author_name,
                email: entry.author_email,
            },
            committer: {
                name: entry.author_name,
                email: entry.author_email,
            },
            date: entry.date,
            parents: [],
            refs: entry.refs ? entry.refs.split(', ').filter(Boolean) : [],
        }));

        this.cache.set(cacheKey, commits, 10000);
        return commits;
    }

    async getGraph(limit: number = 100): Promise<GraphData> {
        const git = this.ensureRepo();

        // Get commits with parent information using raw git log
        const logOutput = await git.raw([
            'log',
            '--all',
            '--date=iso',
            `--max-count=${limit}`,
            '--format=%H|%P|%an|%ae|%ad|%s|%D'
        ]);

        const branches = await this.getBranches();

        // Parse commits with parents
        const commits: Array<{
            hash: string;
            parents: string[];
            author: string;
            email: string;
            date: string;
            message: string;
            refs: string;
        }> = [];

        const lines = logOutput.trim().split('\n').filter(line => line.trim());
        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length >= 6) {
                commits.push({
                    hash: parts[0],
                    parents: parts[1] ? parts[1].split(' ').filter(p => p) : [],
                    author: parts[2],
                    email: parts[3],
                    date: parts[4],
                    message: parts[5],
                    refs: parts[6] || '',
                });
            }
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
                column = activeColumns.findIndex(c => c === null);
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
                        let newCol = activeColumns.findIndex(c => c === null);
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

        const maxColumn = Math.max(...Array.from(hashToColumn.values()), 0);

        // Create nodes with proper columns and parent info
        const nodes: GraphNode[] = commits.map((commit, idx) => ({
            id: commit.hash,
            hash: commit.hash,
            shortHash: commit.hash.substring(0, 7),
            message: commit.message,
            author: commit.author,
            date: commit.date,
            column: hashToColumn.get(commit.hash) || 0,
            row: idx,
            refs: commit.refs ? commit.refs.split(', ').filter(r => r.trim()) : [],
            color: BRANCH_COLORS[(hashToColumn.get(commit.hash) || 0) % BRANCH_COLORS.length],
            parentHashes: commit.parents,
        }));

        // Create edges based on actual parent relationships
        const edges: GraphEdge[] = [];
        const hashToNode = new Map(nodes.map(n => [n.hash, n]));

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
            branches: branches.local.map(b => b.name),
            currentBranch: branches.current,
        };
    }

    async getCommitDetails(hash: string): Promise<CommitDetails> {
        const git = this.ensureRepo();

        const [, diffStat] = await Promise.all([
            git.show([hash, '--format=fuller']),
            git.show([hash, '--stat', '--format=']),
        ]);

        // Parse file changes from stat output
        const files: FileChange[] = [];
        const statLines = diffStat.split('\n').filter(line => line.includes('|'));

        for (const line of statLines) {
            const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)/);
            if (match) {
                const [, path] = match;
                const additions = (line.match(/\+/g) || []).length;
                const deletions = (line.match(/-/g) || []).length;
                files.push({
                    path: path.trim(),
                    status: 'modified',
                    additions,
                    deletions,
                });
            }
        }

        // Get the commit info from log
        const log = await git.log([hash, '-1']);
        const commitInfo = log.latest;

        if (!commitInfo) {
            throw Errors.commitNotFound(hash);
        }

        // Get diff
        let diff = '';
        try {
            diff = await git.diff([`${hash}^`, hash]);
        } catch {
            // First commit has no parent
            diff = await git.show([hash, '--format=', '--patch']);
        }

        return {
            hash: commitInfo.hash,
            shortHash: commitInfo.hash.substring(0, 7),
            message: commitInfo.message,
            body: commitInfo.body,
            author: {
                name: commitInfo.author_name,
                email: commitInfo.author_email,
            },
            committer: {
                name: commitInfo.author_name,
                email: commitInfo.author_email,
            },
            date: commitInfo.date,
            parents: [],
            refs: commitInfo.refs ? commitInfo.refs.split(', ').filter(Boolean) : [],
            files,
            stats: {
                totalFiles: files.length,
                additions: files.reduce((sum, f) => sum + f.additions, 0),
                deletions: files.reduce((sum, f) => sum + f.deletions, 0),
            },
            diff,
        };
    }

    async checkoutBranch(branchName: string): Promise<void> {
        const git = this.ensureRepo();
        await git.checkout(branchName);
        this.cache.invalidate();
    }

    async search(query: string): Promise<SearchResponse> {
        const git = this.ensureRepo();

        const [commitResults, branches] = await Promise.all([
            git.log(['--all', `--grep=${query}`, '--regexp-ignore-case', '--max-count=20']),
            this.getBranches(),
        ]);

        const results: SearchResult[] = [];

        // Add matching commits
        for (const commit of commitResults.all) {
            results.push({
                type: 'commit',
                id: commit.hash,
                label: commit.hash.substring(0, 7),
                description: commit.message,
            });
        }

        // Add matching branches
        const queryLower = query.toLowerCase();
        for (const branch of branches.local) {
            if (branch.name.toLowerCase().includes(queryLower)) {
                results.push({
                    type: 'branch',
                    id: branch.name,
                    label: branch.name,
                });
            }
        }

        return {
            query,
            results,
            totalCount: results.length,
        };
    }

    // =========== Pro Features ===========

    async getBlame(filePath: string): Promise<BlameInfo[]> {
        const git = this.ensureRepo();

        try {
            const blameOutput = await git.raw(['blame', '--porcelain', filePath]);
            const lines = blameOutput.split('\n');
            const blameInfo: BlameInfo[] = [];

            let currentCommit: Partial<BlameInfo> = {};
            let lineNumber = 0;

            for (const line of lines) {
                if (line.match(/^[a-f0-9]{40}/)) {
                    const parts = line.split(' ');
                    currentCommit = {
                        hash: parts[0],
                        lineNumber: parseInt(parts[2]) || ++lineNumber,
                    };
                } else if (line.startsWith('author ')) {
                    currentCommit.author = line.substring(7);
                } else if (line.startsWith('author-time ')) {
                    const timestamp = parseInt(line.substring(12));
                    currentCommit.date = new Date(timestamp * 1000).toISOString();
                } else if (line.startsWith('summary ')) {
                    currentCommit.message = line.substring(8);
                } else if (line.startsWith('\t')) {
                    currentCommit.content = line.substring(1);
                    if (currentCommit.hash && currentCommit.author && currentCommit.date) {
                        blameInfo.push(currentCommit as BlameInfo);
                    }
                    currentCommit = {};
                }
            }

            return blameInfo;
        } catch {
            return [];
        }
    }

    async getFileHistory(filePath: string, limit = 50): Promise<FileHistoryEntry[]> {
        const git = this.ensureRepo();

        const logOutput = await git.raw([
            'log',
            '--follow',
            `--max-count=${limit}`,
            '--format=%H|%an|%ae|%ad|%s',
            '--date=iso',
            '--',
            filePath,
        ]);

        const entries: FileHistoryEntry[] = [];
        const lines = logOutput.trim().split('\n').filter(l => l);

        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length >= 5) {
                entries.push({
                    hash: parts[0],
                    shortHash: parts[0].substring(0, 7),
                    author: {
                        name: parts[1],
                        email: parts[2],
                    },
                    date: parts[3],
                    message: parts[4],
                });
            }
        }

        return entries;
    }

    async compareBranches(base: string, compare: string): Promise<BranchCompare> {
        const git = this.ensureRepo();

        // Get commits ahead/behind
        const revListOutput = await git.raw(['rev-list', '--left-right', '--count', `${base}...${compare}`]);
        const [behind, ahead] = revListOutput.trim().split('\t').map(n => parseInt(n) || 0);

        // Get diff stats
        const diffStat = await git.raw(['diff', '--stat', '--shortstat', base, compare]);
        const statMatch = diffStat.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);

        // Get commits
        const commitsOutput = await git.raw([
            'log',
            '--oneline',
            `${base}..${compare}`,
            '--max-count=20',
        ]);

        const commits = commitsOutput.trim().split('\n').filter(l => l).map(line => {
            const [hash, ...messageParts] = line.split(' ');
            return { hash, message: messageParts.join(' ') };
        });

        // Get changed files
        const filesOutput = await git.raw(['diff', '--name-status', base, compare]);
        const files = filesOutput.trim().split('\n').filter(l => l).map(line => {
            const [status, ...pathParts] = line.split('\t');
            const statusMap: Record<string, string> = {
                'A': 'added',
                'M': 'modified',
                'D': 'deleted',
                'R': 'renamed',
            };
            return {
                path: pathParts.join('\t'),
                status: statusMap[status.charAt(0)] || 'modified',
            };
        });

        return {
            base,
            compare,
            ahead,
            behind,
            commits,
            files,
            stats: {
                filesChanged: statMatch ? parseInt(statMatch[1]) : files.length,
                additions: statMatch && statMatch[2] ? parseInt(statMatch[2]) : 0,
                deletions: statMatch && statMatch[3] ? parseInt(statMatch[3]) : 0,
            },
        };
    }

    async getHotspots(limit = 20): Promise<HotspotFile[]> {
        const git = this.ensureRepo();

        const logOutput = await git.raw([
            'log',
            '--all',
            '--format=',
            '--name-only',
            '-n', '500',
        ]);

        const fileCounts = new Map<string, number>();
        const files = logOutput.split('\n').filter(f => f.trim());

        for (const file of files) {
            fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
        }

        return Array.from(fileCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([path, changeCount]) => ({ path, changeCount }));
    }

    async createBranch(name: string, startPoint?: string): Promise<void> {
        const git = this.ensureRepo();
        if (startPoint) {
            await git.checkoutBranch(name, startPoint);
        } else {
            await git.checkoutLocalBranch(name);
        }
        this.cache.invalidate();
    }

    async deleteBranch(name: string, force = false): Promise<void> {
        const git = this.ensureRepo();
        await git.deleteLocalBranch(name, force);
        this.cache.invalidate();
    }

    async renameBranch(oldName: string, newName: string): Promise<void> {
        const git = this.ensureRepo();
        await git.raw(['branch', '-m', oldName, newName]);
        this.cache.invalidate();
    }
}

// Singleton instance
export const gitService = new GitService();
