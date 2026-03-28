"use client";

import { useState } from "react";
import { useGitHubIssues } from "@/hooks/useGitHubData";
import type { GitHubIssue } from "@/hooks/useGitHubData";
import {
	AlertCircle,
	CheckCircle,
	MessageSquare,
	ChevronLeft,
	ChevronRight,
	Search,
	Tag,
} from "lucide-react";
import { timeAgo } from "@/lib/utils/timeAgo";

function IssueRow({ issue }: { issue: GitHubIssue }) {
	return (
		<div className="flex items-start gap-3 px-4 py-3 hover:bg-[#161b22] border-b border-[#21262d] transition-colors">
			{issue.state === "open" ? (
				<AlertCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
			) : (
				<CheckCircle className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
			)}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium text-gray-200 hover:text-blue-400 cursor-pointer">
						{issue.title}
					</span>
					{issue.labels.map((label) => (
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
					<span>#{issue.number}</span>
					<span>
						opened {timeAgo(issue.created_at)} by {issue.user.login}
					</span>
					{issue.assignees.length > 0 && (
						<span className="flex items-center gap-1">
							{issue.assignees.map((a) => (
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
			{issue.comments > 0 && (
				<div className="flex items-center gap-1 text-xs text-gray-500">
					<MessageSquare className="w-3.5 h-3.5" />
					<span>{issue.comments}</span>
				</div>
			)}
		</div>
	);
}

export function IssuesTab() {
	const [stateFilter, setStateFilter] = useState<"open" | "closed">("open");
	const [page, setPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const { data, isLoading, error } = useGitHubIssues(stateFilter, page);

	const issues = data?.data ?? [];
	const pagination = data?.pagination;

	const filtered = searchQuery
		? issues.filter(
				(i) =>
					i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
					i.number.toString().includes(searchQuery),
			)
		: issues;

	return (
		<div className="h-full flex flex-col bg-[#0d1117]">
			{/* Header bar */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
				<div className="flex items-center gap-2">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
						<input
							type="text"
							placeholder="Filter issues..."
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
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-l-md transition-colors ${
							stateFilter === "open"
								? "bg-[#21262d] text-white"
								: "text-gray-400 hover:text-gray-200"
						}`}
					>
						<AlertCircle className="w-3.5 h-3.5" />
						Open
					</button>
					<button
						type="button"
						onClick={() => {
							setStateFilter("closed");
							setPage(1);
						}}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-r-md transition-colors ${
							stateFilter === "closed"
								? "bg-[#21262d] text-white"
								: "text-gray-400 hover:text-gray-200"
						}`}
					>
						<CheckCircle className="w-3.5 h-3.5" />
						Closed
					</button>
				</div>
			</div>

			{/* Issues list */}
			<div className="flex-1 overflow-y-auto">
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-white rounded-full" />
					</div>
				) : error ? (
					<div className="flex flex-col items-center justify-center py-12 text-gray-500">
						<AlertCircle className="w-8 h-8 mb-2" />
						<p className="text-sm">Failed to load issues</p>
					</div>
				) : filtered.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-gray-500">
						<Tag className="w-8 h-8 mb-2" />
						<p className="text-sm">
							No {stateFilter} issues found
							{searchQuery ? " matching your search" : ""}
						</p>
					</div>
				) : (
					<div>
						{filtered.map((issue) => (
							<IssueRow key={issue.number} issue={issue} />
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
