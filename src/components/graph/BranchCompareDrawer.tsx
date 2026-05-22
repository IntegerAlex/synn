"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  ChevronDown,
  FileCode,
  GitCommit,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import { useBranchComparison, useGitHubBranches } from "@/hooks/useGitHubData";
import {
  calculateAheadBehindPct,
  calculateDivergence,
} from "@/lib/utils/branchComparison";
import { useAppStore } from "@/store/useAppStore";

interface BranchCompareDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBase?: string;
}

function BranchSelector({
  label,
  value,
  onChange,
  branches,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  branches: string[];
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () => branches.filter((b) => b !== exclude),
    [branches, exclude],
  );

  return (
    <div className="relative flex-1">
      <p className="text-[11px] text-[#8b949e] mb-1">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-[#30363d] bg-[#0d1117] text-sm text-[#c9d1d9] hover:border-[#3b82f6] transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{value || "Select branch"}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#8b949e] shrink-0 ml-2" />
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-1 w-full max-h-52 overflow-y-auto rounded-md border border-[#30363d] bg-[#0d1117] shadow-xl"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#8b949e]">No branches</p>
          ) : (
            filtered.map((b) => (
              <button
                key={b}
                type="button"
                role="option"
                aria-selected={b === value}
                onClick={() => {
                  onChange(b);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#161b22] transition-colors ${
                  b === value ? "text-[#3b82f6]" : "text-[#c9d1d9]"
                }`}
              >
                {b}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const BranchCompareDrawer = memo(function BranchCompareDrawer({
  isOpen,
  onClose,
  defaultBase,
}: BranchCompareDrawerProps) {
  const repoInfo = useAppStore((s) => s.repoInfo);
  const comparisonTarget = useAppStore((s) => s.comparisonTarget);
  const setComparisonTarget = useAppStore((s) => s.setComparisonTarget);

  const currentBranch = repoInfo?.currentBranch ?? "";

  const [base, setBase] = useState<string>(defaultBase ?? currentBranch);
  const [target, setTarget] = useState<string>(comparisonTarget ?? "");

  const { data: branchesData, isLoading: branchesLoading } =
    useGitHubBranches();

  const branchNames = useMemo(() => {
    const list = branchesData?.data?.branches ?? [];
    return list.map((b) => b.name);
  }, [branchesData]);

  const {
    data: compareData,
    isLoading: compareLoading,
    error: compareError,
  } = useBranchComparison(base || null, target || null);

  const result = compareData?.data;

  const handleSwap = () => {
    const tmp = base;
    setBase(target);
    setTarget(tmp);
    setComparisonTarget(tmp);
  };

  const handleTargetChange = (v: string) => {
    setTarget(v);
    setComparisonTarget(v);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-xl bg-[#0d1117] border-l border-[#30363d] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Branch comparison"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#3b82f6]" />
                <h2 className="text-base font-semibold text-[#c9d1d9]">
                  Compare Branches
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded transition-colors"
                aria-label="Close comparison drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Branch selectors */}
            <div className="px-5 py-4 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="flex items-end gap-2">
                <BranchSelector
                  label="Base"
                  value={base}
                  onChange={setBase}
                  branches={branchNames}
                  exclude={target}
                />

                <button
                  type="button"
                  onClick={handleSwap}
                  className="mb-0.5 p-2 rounded-md border border-[#30363d] bg-[#21262d] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#30363d] transition-colors shrink-0"
                  title="Swap base and target"
                  aria-label="Swap base and target branches"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>

                <BranchSelector
                  label="Target"
                  value={target}
                  onChange={handleTargetChange}
                  branches={branchNames}
                  exclude={base}
                />
              </div>

              {branchesLoading && (
                <p className="text-xs text-[#8b949e] mt-2">Loading branches…</p>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {!base || !target ? (
                <div className="flex flex-col items-center justify-center h-full text-[#8b949e] gap-3 p-8">
                  <ArrowLeftRight className="w-10 h-10 opacity-40" />
                  <p className="text-sm text-center">
                    Select a base and target branch to compare.
                  </p>
                </div>
              ) : compareLoading ? (
                <div className="flex items-center justify-center h-full gap-3 text-[#8b949e]">
                  <div className="w-4 h-4 border-2 border-t-transparent border-[#3b82f6] rounded-full animate-spin" />
                  <span className="text-sm">Comparing…</span>
                </div>
              ) : compareError ? (
                <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 p-8">
                  <p className="text-sm text-center">
                    Failed to load comparison. Make sure the repository is
                    connected and both branches exist.
                  </p>
                </div>
              ) : result ? (
                <ComparisonContent
                  result={result}
                  base={base}
                  target={target}
                />
              ) : null}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});

interface CompareResult {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

function ComparisonContent({
  result,
  base,
  target,
}: {
  result: CompareResult;
  base: string;
  target: string;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "files">("overview");

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#30363d] bg-[#161b22] shrink-0">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#238636]/20 text-[#3fb950] text-xs font-medium">
            <Plus className="w-3 h-3" />
            {result.ahead_by} ahead
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-xs font-medium">
            <Minus className="w-3 h-3" />
            {result.behind_by} behind
          </span>
        </div>
        <span className="text-xs text-[#8b949e]">
          {result.total_commits} commit
          {result.total_commits !== 1 ? "s" : ""} · {result.files.length} file
          {result.files.length !== 1 ? "s" : ""} changed
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#30363d] bg-[#161b22] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
            activeTab === "overview"
              ? "border-[#3b82f6] text-[#c9d1d9]"
              : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
          }`}
        >
          <GitCommit className="w-4 h-4" />
          Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors ${
            activeTab === "files"
              ? "border-[#3b82f6] text-[#c9d1d9]"
              : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"
          }`}
        >
          <FileCode className="w-4 h-4" />
          Files{" "}
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-[#21262d] text-[#8b949e]">
            {result.files.length}
          </span>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-5">
        {activeTab === "overview" ? (
          <OverviewTab result={result} base={base} target={target} />
        ) : (
          <FilesTab files={result.files} />
        )}
      </div>
    </div>
  );
}

function OverviewTab({
  result,
  base,
  target,
}: {
  result: CompareResult;
  base: string;
  target: string;
}) {
  const divergence = calculateDivergence(result.ahead_by, result.behind_by);
  const statusColorClass =
    divergence.status === "ahead"
      ? "text-[#3fb950]"
      : divergence.status === "behind"
        ? "text-red-400"
        : divergence.status === "diverged"
          ? "text-yellow-400"
          : "text-[#8b949e]";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
        <h3 className="text-sm font-medium text-[#c9d1d9] mb-2">Comparison</h3>
        <div className="text-xs text-[#8b949e] space-y-1">
          <div className="flex justify-between">
            <span>Base</span>
            <code className="text-[#58a6ff]">{base}</code>
          </div>
          <div className="flex justify-between">
            <span>Target</span>
            <code className="text-[#58a6ff]">{target}</code>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span className={`font-medium ${statusColorClass}`}>
              {divergence.status}
            </span>
          </div>
        </div>
      </div>

      {divergence.status === "identical" ? (
        <p className="text-sm text-[#8b949e] text-center py-4">
          These branches are identical.
        </p>
      ) : (
        <div className="space-y-2">
          <AheadBehindBar
            ahead={result.ahead_by}
            behind={result.behind_by}
            total={result.ahead_by + result.behind_by}
          />
          <p className="text-xs text-[#8b949e]">
            <strong className="text-[#3fb950]">{target}</strong> is{" "}
            {result.ahead_by > 0 && (
              <>
                <strong className="text-[#3fb950]">{result.ahead_by}</strong>{" "}
                commit{result.ahead_by !== 1 ? "s" : ""} ahead
              </>
            )}
            {result.ahead_by > 0 && result.behind_by > 0 && " and "}
            {result.behind_by > 0 && (
              <>
                <strong className="text-red-400">{result.behind_by}</strong>{" "}
                commit{result.behind_by !== 1 ? "s" : ""} behind
              </>
            )}{" "}
            <strong className="text-[#c9d1d9]">{base}</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function AheadBehindBar({
  ahead,
  behind,
  total,
}: {
  ahead: number;
  behind: number;
  total: number;
}) {
  if (total === 0) return null;
  const { aheadPct, behindPct } = calculateAheadBehindPct(ahead, behind);

  return (
    <div
      className="flex h-2 rounded-full overflow-hidden"
      title={`${ahead} ahead / ${behind} behind`}
    >
      {ahead > 0 && (
        <div
          className="bg-[#238636] transition-all"
          style={{ width: `${aheadPct}%` }}
        />
      )}
      {behind > 0 && (
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${behindPct}%` }}
        />
      )}
    </div>
  );
}

function FilesTab({ files }: { files: CompareResult["files"] }) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-[#8b949e] text-center py-8">
        No files changed.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <FileEntry key={file.filename} file={file} />
      ))}
    </div>
  );
}

function FileEntry({ file }: { file: CompareResult["files"][number] }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor: Record<string, string> = {
    added: "text-[#3fb950]",
    removed: "text-red-400",
    modified: "text-yellow-400",
    renamed: "text-[#58a6ff]",
    changed: "text-yellow-400",
  };
  const statusLabel: Record<string, string> = {
    added: "A",
    removed: "D",
    modified: "M",
    renamed: "R",
    changed: "M",
  };

  // Pre-process patch lines into stable objects so the key comes from a
  // property (line number) rather than a .map() callback index.
  const patchLines = useMemo(() => {
    if (!file.patch) return [];
    return file.patch.split("\n").map((content, n) => ({
      id: `${file.filename}-L${n + 1}`,
      content,
    }));
  }, [file.filename, file.patch]);

  return (
    <div className="rounded-md border border-[#30363d] bg-[#161b22] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[#21262d] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs font-mono font-bold w-4 shrink-0 ${statusColor[file.status] ?? "text-[#8b949e]"}`}
            title={file.status}
          >
            {statusLabel[file.status] ?? "?"}
          </span>
          <code className="text-xs text-[#c9d1d9] truncate">
            {file.filename}
          </code>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {file.additions > 0 && (
            <span className="text-xs text-[#3fb950]">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-xs text-red-400">-{file.deletions}</span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#8b949e] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && patchLines.length > 0 && (
        <div className="border-t border-[#30363d] overflow-x-auto">
          <pre className="text-[11px] font-mono leading-5 p-3 whitespace-pre-wrap break-all">
            {patchLines.map(({ id, content }) => (
              <span
                key={id}
                className={`block ${
                  content.startsWith("+")
                    ? "text-[#3fb950] bg-[#238636]/10"
                    : content.startsWith("-")
                      ? "text-red-400 bg-red-500/10"
                      : content.startsWith("@@")
                        ? "text-[#58a6ff]"
                        : "text-[#8b949e]"
                }`}
              >
                {content}
              </span>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
