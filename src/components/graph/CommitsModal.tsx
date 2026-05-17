"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  Copy,
  GitCommit,
  Search,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BetterDiffModal } from "@/components/diff/BetterDiffModal";
import { useCommitDetails, useGraph } from "@/hooks/useGitData";
import { useAppStore } from "@/store/useAppStore";
import type { GraphNode } from "@/types/git";

interface CommitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalCommits: number;
}

export function CommitsModal({
  isOpen,
  onClose,
  totalCommits,
}: CommitsModalProps) {
  const _repoInfo = useAppStore((state) => state.repoInfo);
  const { data: graphData } = useGraph(10000, 0); // Get all commits
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(
    null,
  );
  const [isBetterDiffOpen, setIsBetterDiffOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: commitDetails } = useCommitDetails(selectedCommitHash);

  // Debounce search input
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 150); // 150ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  const commits = useMemo(() => {
    if (!graphData?.nodes) return [];
    return graphData.nodes;
  }, [graphData]);

  // Memoize filtered commits with useMemo for performance
  const filteredCommits = useMemo(() => {
    if (!searchQuery.trim()) return commits;
    const query = searchQuery.toLowerCase();

    // Use a more efficient filtering approach
    const results: GraphNode[] = [];
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      if (
        commit.hash.toLowerCase().includes(query) ||
        commit.message.toLowerCase().includes(query) ||
        commit.author.toLowerCase().includes(query)
      ) {
        results.push(commit);
      }
    }
    return results;
  }, [commits, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      // Ignore
    }
  };

  const handleCommitClick = (commit: GraphNode) => {
    setSelectedCommitHash(commit.hash);
    setIsBetterDiffOpen(true);
  };

  const handleCloseBetterDiff = () => {
    setIsBetterDiffOpen(false);
    setSelectedCommitHash(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-[90vw] h-[85vh] max-w-4xl bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Commits List"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="flex items-center gap-3">
                <GitCommit className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-white">
                  Commits ({totalCommits.toLocaleString()})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Search */}
            <div className="px-4 py-3 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search commits by hash, message, or author..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                />
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-2">
                  Showing {filteredCommits.length} of {commits.length} commits
                </p>
              )}
            </div>

            {/* Commits List */}
            <div className="flex-1 overflow-auto min-h-0">
              {filteredCommits.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {searchQuery
                        ? "No commits found"
                        : "No commits available"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#21262d]">
                  {filteredCommits.map((commit) => (
                    <motion.div
                      key={commit.hash}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => handleCommitClick(commit)}
                      className="px-4 py-3 hover:bg-[#161b22] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          <div className="w-8 h-8 rounded-full bg-[#238636]/20 flex items-center justify-center">
                            <GitCommit className="w-4 h-4 text-[#3fb950]" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-xs text-[#58a6ff] font-mono">
                              {commit.shortHash}
                            </code>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyHash(commit.hash);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#21262d] rounded"
                              title="Copy full hash"
                            >
                              {copiedHash === commit.hash ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-gray-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-white mb-2 line-clamp-2">
                            {commit.message}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              <span>{commit.author}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(commit.date)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Better Diff Modal */}
      {commitDetails && (
        <BetterDiffModal
          isOpen={isBetterDiffOpen}
          onClose={handleCloseBetterDiff}
          diff={commitDetails.diff || ""}
          commitMessage={commitDetails.message}
          commitHash={selectedCommitHash || undefined}
          files={commitDetails.files}
        />
      )}
    </AnimatePresence>
  );
}
