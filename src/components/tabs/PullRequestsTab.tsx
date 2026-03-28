"use client";

import { useState } from "react";
import { useGitHubPulls } from "@/hooks/useGitHubData";
import type { GitHubPullRequest } from "@/hooks/useGitHubData";
import {
	GitPullRequest,
	GitMerge,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Search,
	MessageSquare,
	FileText,
	XCircle,
} from "lucide-react";

function timeAgo(dateStr: string): string {
	const now = Date.now();
	const then = new Date(dateStr).getTime();
	const diff = now - then;
	const minutes = Math.floor(diff / 60000);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

function PRIcon({ pr }: { pr: GitHubPullRequest }) {
	if (pr.merged_at) {
		return <GitMerge className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />;
	}
	if (pr.state === "closed") {
		return <XCircle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />;
	}
	if (pr.draft) {
		return <GitPullRequest className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />;
	}
	return <GitPullRequest className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />;
}

function PRRow({ pr }: { pr: GitHubPullRequest }) {
	const isMerged = !!pr.merged_at;

	return (
		<div className="flex items-start gap-3 px-4 py-3 hover:bg-[#161b22] border-b border-[#21262d] transition-colors">
			<PRIcon pr={pr} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium text-gray-200 hover:text-blue-400 cursor-pointer">
						{pr.title}
					</span>
					{pr.draft && (
						<span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-700 text-gray-300 border border-gray-600">
							Draft
						</span>
					)}
					{pr.labels.map((label) => (
						<span
							key={label.name}
							className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border"
							style={{
								backgroundColor: `#${label.color}20`,
								borderColor: `#${label.color}50`,
								color: `#${label.color}`,
							}}
						>
							{label.name}
						</span>
					))}
				</div>
				<div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
					<span>#{pr.number}</span>
					<span>
						{isMerged ? "merged" : pr.state === "closed" ? "closed" : "opened"}{" "}
						{timeAgo(isMerged ? pr.merged_at! : pr.created_at)} by {pr.user.login}
					</span>
					<span className="text-gray-600">
						{pr.head.ref} → {pr.base.ref}
					</span>
					{pr.assignees.length > 0 && (
						<span className="flex items-center gap-1">
							{pr.assignees.map((a) => (
								<img
									key={a.login}
									src={a.avatar_url}
									alt={a.login}
									className="w-4 h-4 rounded-full"
								/>
							))}
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
				{(pr.additions > 0 || pr.deletions > 0) && (
					<span className="flex items-center gap-1">
						<span className="text-green-500">+{pr.additions}</span>
						<span className="text-red-500">-{pr.deletions}</span>
					</span>
				)}
				{pr.changed_files > 0 && (
					<span className="flex items-center gap-1">
						<FileText className="w-3.5 h-3.5" />
						{pr.changed_files}
					</span>
				)}
				{(pr.comments > 0 || pr.review_comments > 0) && (
					<span className="flex items-center gap-1">
						<MessageSquare className="w-3.5 h-3.5" />
						{pr.comments + pr.review_comments}
					</span>
				)}
			</div>
		</div>
	);
}

export function PullRequestsTab() {
	const [stateFilter, setStateFilter] = useState<"open" | "closed" | "all">("open");
	const [page, setPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const { data, isLoading, error } = useGitHubPulls(stateFilter, page);

	const pulls = data?.data ?? [];
	const pagination = data?.pagination;

	const filtered = searchQuery
		? pulls.filter(
				(p) =>
					p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					p.number.toString().includes(searchQuery),
			)
		: pulls;

	return (
		<div className="h-full flex flex-col bg-[#0d1117]">
			{/* Header bar */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
				<div className="flex items-center gap-2">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
						<input
							type="text"
							placeholder="Filter pull requests..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
						/>
					</div>
				</div>
				<div className="flex items-center gap-1 bg-[#161b22] rounded-md border border-[#30363d]">
					<button
						type="button"
						onClick={() => {
							setStateFilter("open");
							setPage(1);
						}}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
							stateFilter === "open"
								? "bg-[#21262d] text-white rounded-l-md"
								: "text-gray-400 hover:text-gray-200"
						}`}
					>
						<GitPullRequest className="w-3.5 h-3.5" />
						Open
					</button>
					<button
						type="button"
						onClick={() => {
							setStateFilter("closed");
							setPage(1);
						}}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
							stateFilter === "closed"
								? "bg-[#21262d] text-white rounded-r-md"
								: "text-gray-400 hover:text-gray-200"
						}`}
					>
						<CheckCircle className="w-3.5 h-3.5" />
						Closed
					</button>
				</div>
			</div>

			{/* Pull Requests list */}
			<div className="flex-1 overflow-y-auto">
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-white rounded-full" />
					</div>
				) : error ? (
					<div className="flex flex-col items-center justify-center py-12 text-gray-500">
						<GitPullRequest className="w-8 h-8 mb-2" />
						<p className="text-sm">Failed to load pull requests</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-gray-500">
						<GitPullRequest className="w-8 h-8 mb-2" />
						<p className="text-sm">
							No {stateFilter} pull requests found
							{searchQuery ? " matching your search" : ""}
						</p>
					</div>
				) : (
					<div>
						{filtered.map((pr) => (
							<PRRow key={pr.number} pr={pr} />
						))}
					</div>
				)}
			</div>

			{/* Pagination */}
			{pagination && (
				<div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-[#30363d]">
					<button
						type="button"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page <= 1}
						className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-[#30363d] rounded-md hover:border-[#484f58] transition-colors"
					>
						<ChevronLeft className="w-4 h-4" />
						Previous
					</button>
					<span className="text-sm text-gray-500">Page {page}</span>
					<button
						type="button"
						onClick={() => setPage((p) => p + 1)}
						disabled={!pagination.has_next}
						className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-[#30363d] rounded-md hover:border-[#484f58] transition-colors"
					>
						Next
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	);
}
