import { useQuery } from "@tanstack/react-query";
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
	comments: number;
	review_comments: number;
	commits: number;
	additions: number;
	deletions: number;
	changed_files: number;
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
		staleTime: 2 * 60 * 1000,
	});
}

// Pull Requests hook
export function useGitHubPulls(state: "open" | "closed" | "all" = "open", page = 1) {
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
		staleTime: 2 * 60 * 1000,
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
		staleTime: 5 * 60 * 1000,
	});
}
