"use client";

import { memo, useCallback, useMemo, useState } from "react";
import {
	useGitHubPulls,
	usePRDetail,
	useIssueComments,
	useAddComment,
	useMergePR,
	useUpdatePRState,
} from "@/hooks/useGitHubData";
import type {
	GitHubPullRequest,
	GitHubComment,
} from "@/hooks/useGitHubData";
import { DiffView } from "./DiffView";
import {
	ArrowLeft,
	CheckCircle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CircleDot,
	FileText,
	GitBranch,
	GitMerge,
	GitPullRequest,
	Loader2,
	MessageSquare,
	Search,
	Send,
	XCircle,
} from "lucide-react";
import { timeAgo } from "@/lib/utils/timeAgo";
import { useToast } from "@/hooks/useToast";

/* ── Body Renderer ─────────────────────────────────────────────── */

function BodyRenderer({ text }: { text: string }) {
	const parts = text.split(/(```[\s\S]*?```)/g);

	return (
		<div className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
			{parts.map((part, i) => {
				if (part.startsWith("```") && part.endsWith("```")) {
					const inner = part.slice(3, -3).replace(/^[a-zA-Z0-9_-]*\n?/, "");
					return (
						<pre
							key={i}
							className="my-2 p-3 rounded-md bg-[#161b22] border border-[#30363d] overflow-x-auto text-xs font-mono text-gray-300"
						>
							{inner}
						</pre>
					);
				}
				return <span key={i}>{part}</span>;
			})}
		</div>
	);
}

/* ── PR Status Icon ────────────────────────────────────────────── */

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

/* ── Status Badge ──────────────────────────────────────────────── */

function PRStatusBadge({ pr }: { pr: GitHubPullRequest }) {
	if (pr.merged_at) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
				<GitMerge className="w-3 h-3" />
				Merged
			</span>
		);
	}
	if (pr.state === "closed") {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
				<XCircle className="w-3 h-3" />
				Closed
			</span>
		);
	}
	if (pr.draft) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/30">
				<GitPullRequest className="w-3 h-3" />
				Draft
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
			<CircleDot className="w-3 h-3" />
			Open
		</span>
	);
}

/* ── Comment Card ──────────────────────────────────────────────── */

const CommentCard = memo(function CommentCard({ comment }: { comment: GitHubComment }) {
	return (
		<div className="border border-[#30363d] rounded-md overflow-hidden">
			<div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
				<img
					src={comment.user.avatar_url}
					alt={comment.user.login}
					className="w-5 h-5 rounded-full"
				/>
				<span className="text-sm font-medium text-gray-200">
					{comment.user.login}
				</span>
				<span className="text-xs text-gray-500">
					commented {timeAgo(comment.created_at)}
				</span>
			</div>
			<div className="px-4 py-3">
				{comment.body ? (
					<BodyRenderer text={comment.body} />
				) : (
					<p className="text-sm text-gray-500 italic">No description provided.</p>
				)}
			</div>
		</div>
	);
});

/* ── File Diff Viewer (delegated to DiffView component) ────────── */

/* ── Merge Button with Method Dropdown ─────────────────────────── */

function MergeButton({
	prNumber,
	onMerged,
}: {
	prNumber: number;
	onMerged: () => void;
}) {
	const toast = useToast();
	const mergePR = useMergePR();
	const [showDropdown, setShowDropdown] = useState(false);
	const [mergeMethod, setMergeMethod] = useState<"merge" | "squash" | "rebase">("merge");

	const methodLabels: Record<string, string> = {
		merge: "Create a merge commit",
		squash: "Squash and merge",
		rebase: "Rebase and merge",
	};

	const handleMerge = () => {
		mergePR.mutate(
			{ pull_number: prNumber, merge_method: mergeMethod },
			{
				onSuccess: () => {
					toast.showSuccess("Pull request merged successfully");
					onMerged();
				},
				onError: (err) =>
					toast.showError(
						err instanceof Error ? err.message : "Failed to merge pull request",
					),
			},
		);
	};

	return (
		<div className="relative flex">
			<button
				type="button"
				onClick={handleMerge}
				disabled={mergePR.isPending}
				className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-l-md transition-colors disabled:opacity-50"
			>
				{mergePR.isPending ? (
					<Loader2 className="w-3.5 h-3.5 animate-spin" />
				) : (
					<GitMerge className="w-3.5 h-3.5" />
				)}
				{methodLabels[mergeMethod]}
			</button>
			<button
				type="button"
				onClick={() => setShowDropdown((v) => !v)}
				className="flex items-center px-2 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-r-md border-l border-green-700 transition-colors"
			>
				<ChevronDown className="w-3.5 h-3.5" />
			</button>

			{showDropdown && (
				<div className="absolute right-0 bottom-full mb-1 w-56 bg-[#161b22] border border-[#30363d] rounded-md shadow-lg z-10 overflow-hidden">
					{(["merge", "squash", "rebase"] as const).map((method) => (
						<button
							key={method}
							type="button"
							onClick={() => {
								setMergeMethod(method);
								setShowDropdown(false);
							}}
							className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${
								mergeMethod === method
									? "bg-[#21262d] text-white"
									: "text-gray-400 hover:bg-[#21262d] hover:text-gray-200"
							}`}
						>
							{mergeMethod === method && (
								<CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
							)}
							<span className={mergeMethod !== method ? "ml-6" : ""}>
								{methodLabels[method]}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

/* ── PR Detail View ────────────────────────────────────────────── */

function PRDetail({
	prNumber,
	onBack,
}: {
	prNumber: number;
	onBack: () => void;
}) {
	const toast = useToast();
	const [commentBody, setCommentBody] = useState("");
	const { data: detailData, isLoading: detailLoading } = usePRDetail(prNumber);
	const { data: commentsData, isLoading: commentsLoading } = useIssueComments(prNumber);
	const addComment = useAddComment();
	const updateState = useUpdatePRState();

	const pr = detailData?.data ?? null;
	const comments = commentsData?.data ?? [];

	const handleAddComment = () => {
		const body = commentBody.trim();
		if (!body) return;
		addComment.mutate(
			{ issue_number: prNumber, body },
			{
				onSuccess: () => {
					setCommentBody("");
					toast.showSuccess("Comment added");
				},
				onError: (err) =>
					toast.showError(
						err instanceof Error ? err.message : "Failed to add comment",
					),
			},
		);
	};

	const handleToggleState = () => {
		if (!pr) return;
		const nextState = pr.state === "open" ? "closed" : "open";
		updateState.mutate(
			{ number: prNumber, state: nextState },
			{
				onSuccess: () => {
					toast.showSuccess(
						nextState === "closed" ? "Pull request closed" : "Pull request reopened",
					);
					onBack();
				},
				onError: (err) =>
					toast.showError(
						err instanceof Error ? err.message : "Failed to update pull request",
					),
			},
		);
	};

	if (detailLoading || !pr) {
		return (
			<div className="flex flex-col h-full">
				<div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
					<button
						type="button"
						onClick={onBack}
						className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft className="w-4 h-4" />
						Back
					</button>
				</div>
				<div className="flex items-center justify-center flex-1">
					<Loader2 className="w-6 h-6 animate-spin text-gray-500" />
				</div>
			</div>
		);
	}

	const isMerged = !!pr.merged_at || pr.merged;
	const isOpen = pr.state === "open" && !isMerged;

	return (
		<div className="flex flex-col h-full">
			{/* Detail header with back button */}
			<div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Back
				</button>
			</div>

			{/* Scrollable detail body */}
			<div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
				{/* Title & metadata */}
				<div>
					<div className="flex items-start gap-3">
						<div className="mt-1">
							<PRStatusBadge pr={pr} />
						</div>
						<div className="flex-1 min-w-0">
							<h2 className="text-lg font-semibold text-gray-200 break-words">
								{pr.title}{" "}
								<span className="text-gray-500 font-normal">#{pr.number}</span>
							</h2>
							<div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
								<span>
									{isMerged
										? "merged"
										: pr.state === "closed"
											? "closed"
											: "opened"}{" "}
									{timeAgo(isMerged && pr.merged_at ? pr.merged_at : pr.created_at)} by{" "}
									{pr.user.login}
								</span>
								<span className="flex items-center gap-1 font-mono text-gray-400">
									<GitBranch className="w-3 h-3" />
									{pr.head.ref}
									<span className="text-gray-600">→</span>
									{pr.base.ref}
								</span>
								{pr.labels.length > 0 && (
									<span className="flex items-center gap-1 flex-wrap">
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
									</span>
								)}
							</div>

							{/* Stats row */}
							<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
								<span>{pr.commits} commit{pr.commits !== 1 ? "s" : ""}</span>
								<span>{pr.changed_files} file{pr.changed_files !== 1 ? "s" : ""} changed</span>
								<span className="text-green-400">+{pr.additions}</span>
								<span className="text-red-400">-{pr.deletions}</span>
								{pr.requested_reviewers.length > 0 && (
									<span className="flex items-center gap-1">
										Reviewers:{" "}
										{pr.requested_reviewers.map((r) => (
											<img
												key={r.login}
												src={r.avatar_url}
												alt={r.login}
												title={r.login}
												className="w-4 h-4 rounded-full"
											/>
										))}
									</span>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Body section */}
				<div className="border border-[#30363d] rounded-md overflow-hidden">
					<div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
						<img
							src={pr.user.avatar_url}
							alt={pr.user.login}
							className="w-5 h-5 rounded-full"
						/>
						<span className="text-sm font-medium text-gray-200">
							{pr.user.login}
						</span>
						<span className="text-xs text-gray-500">
							opened {timeAgo(pr.created_at)}
						</span>
					</div>
					<div className="px-4 py-3">
						{pr.body ? (
							<BodyRenderer text={pr.body} />
						) : (
							<p className="text-sm text-gray-500 italic">No description provided.</p>
						)}
					</div>
				</div>

				{/* Changed files section with enhanced DiffView */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
						<FileText className="w-4 h-4" />
						Files changed ({pr.files.length})
					</h3>
					<div className="border border-[#30363d] rounded-md overflow-hidden" style={{ height: pr.files.length > 0 ? "auto" : undefined }}>
						<DiffView files={pr.files} />
					</div>
				</div>

				{/* Comments section */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
						<MessageSquare className="w-4 h-4" />
						Comments ({comments.length})
					</h3>

					{commentsLoading ? (
						<div className="flex items-center justify-center py-6">
							<Loader2 className="w-5 h-5 animate-spin text-gray-500" />
						</div>
					) : comments.length === 0 ? (
						<p className="text-sm text-gray-500 py-3">No comments yet.</p>
					) : (
						<div className="space-y-3">
							{comments.map((c) => (
								<CommentCard key={c.id} comment={c} />
							))}
						</div>
					)}
				</div>

				{/* Add comment + actions */}
				<div className="border border-[#30363d] rounded-md overflow-hidden">
					<div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
						<span className="text-sm font-medium text-gray-400">Add a comment</span>
					</div>
					<div className="p-3 space-y-3">
						<textarea
							value={commentBody}
							onChange={(e) => setCommentBody(e.target.value)}
							placeholder="Leave a comment..."
							rows={4}
							className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
						/>
						<div className="flex items-center justify-between flex-wrap gap-2">
							{/* Close / Reopen button */}
							{!isMerged && (
								<button
									type="button"
									onClick={handleToggleState}
									disabled={updateState.isPending}
									className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 ${
										pr.state === "open"
											? "text-red-400 border-red-500/30 hover:bg-red-500/10"
											: "text-green-400 border-green-500/30 hover:bg-green-500/10"
									}`}
								>
									{updateState.isPending ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : pr.state === "open" ? (
										<XCircle className="w-3.5 h-3.5" />
									) : (
										<CircleDot className="w-3.5 h-3.5" />
									)}
									{pr.state === "open" ? "Close pull request" : "Reopen pull request"}
								</button>
							)}
							{isMerged && <div />}

							<div className="flex items-center gap-2">
								{/* Merge button (only for open PRs) */}
								{isOpen && (
									<MergeButton prNumber={pr.number} onMerged={onBack} />
								)}

								{/* Comment button */}
								<button
									type="button"
									onClick={handleAddComment}
									disabled={!commentBody.trim() || addComment.isPending}
									className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{addComment.isPending ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin" />
									) : (
										<Send className="w-3.5 h-3.5" />
									)}
									Comment
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ── PR List Row ───────────────────────────────────────────────── */

const PRRow = memo(function PRRow({
	pr,
	onClick,
}: {
	pr: GitHubPullRequest;
	onClick: () => void;
}) {
	const isMerged = !!pr.merged_at;

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					onClick();
				} else if (e.key === " ") {
					e.preventDefault();
					onClick();
				}
			}}
			className="flex items-start gap-3 px-4 py-3 hover:bg-[#161b22] border-b border-[#21262d] transition-colors cursor-pointer"
		>
			<PRIcon pr={pr} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-sm font-medium text-gray-200 hover:text-blue-400">
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
				{((pr.additions ?? 0) > 0 || (pr.deletions ?? 0) > 0) && (
					<span className="flex items-center gap-1">
						<span className="text-green-500">+{pr.additions ?? 0}</span>
						<span className="text-red-500">-{pr.deletions ?? 0}</span>
					</span>
				)}
				{(pr.changed_files ?? 0) > 0 && (
					<span className="flex items-center gap-1">
						<FileText className="w-3.5 h-3.5" />
						{pr.changed_files ?? 0}
					</span>
				)}
				{((pr.comments ?? 0) > 0 || (pr.review_comments ?? 0) > 0) && (
					<span className="flex items-center gap-1">
						<MessageSquare className="w-3.5 h-3.5" />
						{(pr.comments ?? 0) + (pr.review_comments ?? 0)}
					</span>
				)}
			</div>
		</div>
	);
});

/* ── Main Export ────────────────────────────────────────────────── */

export function PullRequestsTab() {
	const [stateFilter, setStateFilter] = useState<"open" | "closed" | "all">("open");
	const [page, setPage] = useState(1);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedPR, setSelectedPR] = useState<number | null>(null);
	const { data, isLoading, error } = useGitHubPulls(stateFilter, page);

	const pulls = data?.data ?? [];
	const pagination = data?.pagination;

	const filtered = useMemo(
		() =>
			searchQuery
				? pulls.filter(
						(p) =>
							p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
							p.number.toString().includes(searchQuery),
					)
				: pulls,
		[pulls, searchQuery],
	);

	/* Show detail view when a PR is selected */
	if (selectedPR !== null) {
		return (
			<div className="h-full flex flex-col bg-[#0d1117]">
				<PRDetail
					prNumber={selectedPR}
					onBack={() => setSelectedPR(null)}
				/>
			</div>
		);
	}

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
							<PRRow
								key={pr.number}
								pr={pr}
								onClick={() => setSelectedPR(pr.number)}
							/>
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
