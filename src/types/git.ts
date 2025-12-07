// Shared types for Git Visualizer

// ============ Repository Types ============

export interface RepoInfo {
    path: string;
    name: string;
    currentBranch: string;
    isClean: boolean;
    ahead: number;
    behind: number;
    remotes: string[];
}

// ============ Branch Types ============

export interface Branch {
    name: string;
    commit: string;
    isCurrent: boolean;
    isRemote: boolean;
    upstream?: string;
    lastCommitDate?: string;
    tracking?: string;
    ahead?: number;
    behind?: number;
}

export interface BranchesResponse {
    local: Branch[];
    remote: Branch[];
    current: string;
}

// ============ Commit Types ============

export interface Author {
    name: string;
    email: string;
}

export interface Commit {
    hash: string;
    shortHash: string;
    message: string;
    body?: string;
    author: Author;
    committer: Author;
    date: string;
    parents: string[];
    refs: string[];
}

export interface FileChange {
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    additions: number;
    deletions: number;
    oldPath?: string;
}

export interface CommitStats {
    totalFiles: number;
    additions: number;
    deletions: number;
}

export interface CommitDetails extends Commit {
    files: FileChange[];
    stats: CommitStats;
    diff?: string;
}

// ============ Graph Types ============

export interface GraphNode {
    id: string;
    hash: string;
    shortHash: string;
    message: string;
    author: string;
    date: string;
    column: number;
    row: number;
    refs: string[];
    color: string;
    parentHashes?: string[];
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    type: 'normal' | 'merge';
    color: string;
    sourceColumn?: number;
    targetColumn?: number;
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    columns: number;
    branches: string[];
    currentBranch: string;
}

// ============ Search Types ============

export interface SearchResult {
    type: 'commit' | 'branch' | 'tag';
    id: string;
    label: string;
    description?: string;
}

export interface SearchResponse {
    query: string;
    results: SearchResult[];
    totalCount: number;
}

// ============ API Types ============

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    data?: T;
    error?: ApiError;
}

// ============ Additional Feature Types ============

export interface BlameInfo {
    hash: string;
    author: string;
    date: string;
    message: string;
    lineNumber: number;
    content: string;
}

export interface FileHistoryEntry {
    hash: string;
    shortHash: string;
    author: { name: string; email: string };
    date: string;
    message: string;
}

export interface BranchCompare {
    base: string;
    compare: string;
    ahead: number;
    behind: number;
    commits: { hash: string; message: string }[];
    files: { path: string; status: string }[];
    stats: { filesChanged: number; additions: number; deletions: number };
}

export interface HotspotFile {
    path: string;
    changeCount: number;
}

// ============ UI State Types ============

export type Theme = 'light' | 'dark' | 'system' | 'github-dark' | 'solarized-light' | 'monokai';
