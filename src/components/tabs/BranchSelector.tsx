"use client";

import { useState, useMemo, useCallback, memo } from "react";
import {
  GitBranch,
  Shield,
  Star,
  Search,
  ChevronDown,
  Loader2,
  GitCompareArrows,
  ArrowLeft,
} from "lucide-react";
import {
  useGitHubBranches,
  useBranchComparison,
} from "@/hooks/useGitHubData";
import type {
  GitHubBranchInfo,
  BranchComparisonResult,
} from "@/hooks/useGitHubData";
import { DiffView } from "./DiffView";

/* ── Branch Item ───────────────────────────────────────── */

const BranchItem = memo(function BranchItem({
  branch,
  isActive,
  onSelect,
}: {
  branch: GitHubBranchInfo;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#21262d] transition-colors ${
        isActive ? "bg-[#21262d] text-white" : "text-gray-300"
      }`}
    >
      <GitBranch className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <span className="text-sm truncate flex-1">{branch.name}</span>
      <span className="flex items-center gap-1 flex-shrink-0">
        {branch.isDefault && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded bg-blue-500/15 text-blue-400 border border-blue-500/30"
            title="Default branch"
          >
            <Star className="w-3 h-3" />
            default
          </span>
        )}
        {branch.protected && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
            title="Protected branch"
          >
            <Shield className="w-3 h-3" />
          </span>
        )}
      </span>
    </button>
  );
});

/* ── Comparison View ───────────────────────────────────── */

function ComparisonView({
  base,
  head,
  onBack,
}: {
  base: string;
  head: string;
  onBack: () => void;
}) {
  const { data, isLoading, error } = useBranchComparison(base, head);
  const comparison = data?.data ?? null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono text-gray-200 px-2 py-0.5 bg-[#0d1117] rounded border border-[#30363d]">
            {base}
          </span>
          <GitCompareArrows className="w-4 h-4 text-gray-500" />
          <span className="font-mono text-gray-200 px-2 py-0.5 bg-[#0d1117] rounded border border-[#30363d]">
            {head}
          </span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center flex-1 text-red-400 text-sm">
          Failed to compare branches. They may not share a common ancestor.
        </div>
      )}

      {comparison && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Stats bar */}
          <div className="px-4 py-2 border-b border-[#30363d] flex items-center gap-4 text-xs text-gray-400">
            <span>Status: {comparison.status}</span>
            <span className="text-green-400">
              {comparison.ahead_by} commit{comparison.ahead_by !== 1 ? "s" : ""} ahead
            </span>
            <span className="text-red-400">
              {comparison.behind_by} commit{comparison.behind_by !== 1 ? "s" : ""} behind
            </span>
            <span>
              {comparison.files.length} file{comparison.files.length !== 1 ? "s" : ""} changed
            </span>
          </div>

          {/* Diff view */}
          <div className="flex-1 min-h-0">
            <DiffView files={comparison.files} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Branch Selector ──────────────────────────────── */

export function BranchSelector() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [compareBranch, setCompareBranch] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const { data: branchesData, isLoading } = useGitHubBranches();

  const branches = branchesData?.data?.branches ?? [];
  const defaultBranch = branchesData?.data?.defaultBranch ?? "main";

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter((b) => b.name.toLowerCase().includes(query));
  }, [branches, searchQuery]);

  // Sort: default first, then protected, then alphabetical
  const sortedBranches = useMemo(() => {
    return [...filteredBranches].sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      if (a.protected && !b.protected) return -1;
      if (!a.protected && b.protected) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filteredBranches]);

  const handleSelectBranch = useCallback(
    (branch: GitHubBranchInfo) => {
      if (compareMode) {
        if (!selectedBranch) {
          setSelectedBranch(branch.name);
        } else {
          setCompareBranch(branch.name);
          setShowCompare(true);
        }
      } else {
        setSelectedBranch(
          selectedBranch === branch.name ? null : branch.name,
        );
      }
    },
    [compareMode, selectedBranch],
  );

  const handleBackFromCompare = useCallback(() => {
    setShowCompare(false);
    setCompareBranch(null);
    setSelectedBranch(null);
    setCompareMode(false);
  }, []);

  // Show comparison view
  if (showCompare && selectedBranch && compareBranch) {
    return (
      <ComparisonView
        base={selectedBranch}
        head={compareBranch}
        onBack={handleBackFromCompare}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-200">
            Branches ({branches.length})
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setCompareMode(!compareMode);
            setSelectedBranch(null);
            setCompareBranch(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            compareMode
              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
              : "text-gray-400 border-[#30363d] hover:text-gray-200 hover:border-[#484f58]"
          }`}
        >
          <GitCompareArrows className="w-3.5 h-3.5" />
          Compare
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-[#30363d]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filter branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#0d1117] border border-[#30363d] rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {compareMode && (
          <div className="mt-2 text-xs text-blue-400">
            {!selectedBranch
              ? "Select the base branch to compare from"
              : `Base: ${selectedBranch} — Now select the branch to compare to`}
          </div>
        )}
      </div>

      {/* Branch list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : sortedBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <GitBranch className="w-8 h-8 mb-2" />
            <p className="text-sm">
              {searchQuery ? "No branches match your search" : "No branches found"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d]">
            {sortedBranches.map((branch) => (
              <BranchItem
                key={branch.name}
                branch={branch}
                isActive={
                  selectedBranch === branch.name ||
                  compareBranch === branch.name
                }
                onSelect={() => handleSelectBranch(branch)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
