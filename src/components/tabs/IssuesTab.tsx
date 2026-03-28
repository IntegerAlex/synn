"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Tag,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { GitHubComment, GitHubIssue } from "@/hooks/useGitHubData";
import {
  useAddComment,
  useCreateIssue,
  useGitHubIssues,
  useIssueComments,
  useUpdateIssueState,
} from "@/hooks/useGitHubData";
import { useToast } from "@/hooks/useToast";
import { timeAgo } from "@/lib/utils/timeAgo";

/* ------------------------------------------------------------------ */
/*  Render issue / comment body as plain text with code block support  */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Single comment                                                     */
/* ------------------------------------------------------------------ */

function CommentCard({ comment }: { comment: GitHubComment }) {
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
          <p className="text-sm text-gray-500 italic">
            No description provided.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Issue detail view                                                  */
/* ------------------------------------------------------------------ */

function IssueDetail({
  issue,
  onBack,
}: {
  issue: GitHubIssue;
  onBack: () => void;
}) {
  const toast = useToast();
  const [commentBody, setCommentBody] = useState("");
  const { data: commentsData, isLoading: commentsLoading } = useIssueComments(
    issue.number,
  );
  const addComment = useAddComment();
  const updateState = useUpdateIssueState();

  const comments = commentsData?.data ?? [];

  const handleAddComment = () => {
    const body = commentBody.trim();
    if (!body) return;
    addComment.mutate(
      { issue_number: issue.number, body },
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
    const nextState = issue.state === "open" ? "closed" : "open";
    updateState.mutate(
      { number: issue.number, state: nextState },
      {
        onSuccess: () => {
          toast.showSuccess(
            nextState === "closed" ? "Issue closed" : "Issue reopened",
          );
          onBack();
        },
        onError: (err) =>
          toast.showError(
            err instanceof Error ? err.message : "Failed to update issue",
          ),
      },
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
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
            {issue.state === "open" ? (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                <CircleDot className="w-3 h-3" />
                Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                <CheckCircle className="w-3 h-3" />
                Closed
              </span>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-200 break-words">
                {issue.title}{" "}
                <span className="text-gray-500 font-normal">
                  #{issue.number}
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>
                  opened {timeAgo(issue.created_at)} by {issue.user.login}
                </span>
                {issue.labels.length > 0 && (
                  <span className="flex items-center gap-1 flex-wrap">
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
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <img
              src={issue.user.avatar_url}
              alt={issue.user.login}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-sm font-medium text-gray-200">
              {issue.user.login}
            </span>
            <span className="text-xs text-gray-500">
              opened {timeAgo(issue.created_at)}
            </span>
          </div>
          <div className="px-4 py-3">
            {issue.body ? (
              <BodyRenderer text={issue.body} />
            ) : (
              <p className="text-sm text-gray-500 italic">
                No description provided.
              </p>
            )}
          </div>
        </div>

        {/* Comments */}
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

        {/* Add comment form */}
        <div className="border border-[#30363d] rounded-md overflow-hidden">
          <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-sm font-medium text-gray-400">
              Add a comment
            </span>
          </div>
          <div className="p-3 space-y-3">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Leave a comment..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleToggleState}
                disabled={updateState.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors disabled:opacity-50 ${
                  issue.state === "open"
                    ? "text-red-400 border-red-500/30 hover:bg-red-500/10"
                    : "text-green-400 border-green-500/30 hover:bg-green-500/10"
                }`}
              >
                {updateState.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : issue.state === "open" ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <CircleDot className="w-3.5 h-3.5" />
                )}
                {issue.state === "open" ? "Close issue" : "Reopen issue"}
              </button>
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
  );
}

/* ------------------------------------------------------------------ */
/*  Create issue form                                                  */
/* ------------------------------------------------------------------ */

function CreateIssueForm({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const createIssue = useCreateIssue();

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    createIssue.mutate(
      { title: trimmedTitle, body: body.trim() || undefined },
      {
        onSuccess: () => {
          toast.showSuccess("Issue created");
          onClose();
        },
        onError: (err) =>
          toast.showError(
            err instanceof Error ? err.message : "Failed to create issue",
          ),
      },
    );
  };

  return (
    <div className="border border-[#30363d] rounded-md mx-4 mt-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <span className="text-sm font-medium text-gray-200">New Issue</span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-200 transition-colors text-xs"
        >
          Cancel
        </button>
      </div>
      <div className="p-4 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a description... (optional)"
          rows={5}
          className="w-full px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!title.trim() || createIssue.isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createIssue.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Submit new issue
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Issue row in the list                                              */
/* ------------------------------------------------------------------ */

function IssueRow({
  issue,
  onClick,
}: {
  issue: GitHubIssue;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-[#161b22] border-b border-[#21262d] transition-colors"
    >
      {issue.state === "open" ? (
        <AlertCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
      ) : (
        <CheckCircle className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-200 hover:text-blue-400">
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
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main tab                                                           */
/* ------------------------------------------------------------------ */

export function IssuesTab() {
  const [stateFilter, setStateFilter] = useState<"open" | "closed">("open");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<GitHubIssue | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
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

  /* When viewing an issue detail, replace the list with the detail panel */
  if (selectedIssue) {
    return (
      <div className="h-full flex flex-col bg-[#0d1117]">
        <IssueDetail
          issue={selectedIssue}
          onBack={() => setSelectedIssue(null)}
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
              placeholder="Filter issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Issue
          </button>
        </div>
      </div>

      {/* Inline create form */}
      {showCreateForm && (
        <CreateIssueForm onClose={() => setShowCreateForm(false)} />
      )}

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
              <IssueRow
                key={issue.number}
                issue={issue}
                onClick={() => setSelectedIssue(issue)}
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
