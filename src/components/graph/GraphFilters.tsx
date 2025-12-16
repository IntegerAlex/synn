'use client';

import { useMemo, useState } from 'react';
import { Check, Filter, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

function normalizeBranchLabel(branch: string): string {
  return branch
    .replace('HEAD -> ', '')
    .replace('origin/', '')
    .replace('remote/', '')
    .trim();
}

export function GraphFilters({
  branches,
  currentBranch,
}: {
  branches: string[];
  currentBranch: string;
}) {
  const showMergeCommits = useAppStore((s) => s.graphFilters.showMergeCommits);
  const showTags = useAppStore((s) => s.graphFilters.showTags);
  const highlightedBranches = useAppStore((s) => s.graphFilters.highlightedBranches);
  const toggleShowMergeCommits = useAppStore((s) => s.toggleShowMergeCommits);
  const toggleShowTags = useAppStore((s) => s.toggleShowTags);
  const toggleBranchHighlight = useAppStore((s) => s.toggleBranchHighlight);
  const clearBranchHighlights = useAppStore((s) => s.clearBranchHighlights);

  const [open, setOpen] = useState(false);

  const branchOptions = useMemo(() => {
    const uniq = new Set<string>();
    for (const b of branches) uniq.add(normalizeBranchLabel(b));
    uniq.add(normalizeBranchLabel(currentBranch));
    return Array.from(uniq).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [branches, currentBranch]);

  const highlightedCount = highlightedBranches.size;

  return (
    <div className="flex items-center gap-2 relative">
      <button
        type="button"
        onClick={toggleShowMergeCommits}
        className={`px-2 py-1 rounded-md text-xs border transition-colors ${
          showMergeCommits
            ? 'border-[#30363d] bg-[#21262d] text-gray-200'
            : 'border-[#30363d] bg-transparent text-gray-400 hover:bg-[#21262d]'
        }`}
        title="Toggle merge commits"
        aria-pressed={showMergeCommits}
      >
        Merge
      </button>

      <button
        type="button"
        onClick={toggleShowTags}
        className={`px-2 py-1 rounded-md text-xs border transition-colors ${
          showTags
            ? 'border-[#30363d] bg-[#21262d] text-gray-200'
            : 'border-[#30363d] bg-transparent text-gray-400 hover:bg-[#21262d]'
        }`}
        title="Show/hide tags"
        aria-pressed={showTags}
      >
        Tags
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 rounded-md text-xs border transition-colors flex items-center gap-1 ${
          highlightedCount > 0
            ? 'border-[#1f6feb]/60 bg-[#1f6feb]/10 text-[#8ab4ff]'
            : 'border-[#30363d] bg-transparent text-gray-400 hover:bg-[#21262d]'
        }`}
        title="Highlight branches"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Filter className="w-3.5 h-3.5" />
        Highlight{highlightedCount > 0 ? ` (${highlightedCount})` : ''}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-[#30363d] bg-[#0d1117] shadow-xl z-30 overflow-hidden"
          role="menu"
          aria-label="Branch highlight filters"
        >
          <div className="px-3 py-2 border-b border-[#30363d] flex items-center justify-between">
            <div className="text-xs text-gray-400">Highlight branches</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-[#21262d]"
              aria-label="Close branch filter menu"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {branchOptions.map((b) => {
              const checked = highlightedBranches.has(b);
              const isCurrent = b === normalizeBranchLabel(currentBranch);
              return (
                <button
                  type="button"
                  key={b}
                  onClick={() => toggleBranchHighlight(b)}
                  className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#161b22]"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                        checked
                          ? 'border-[#1f6feb] bg-[#1f6feb]/20'
                          : 'border-[#30363d] bg-transparent'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5 text-[#8ab4ff]" />}
                    </span>
                    <span className="truncate text-gray-200">
                      {b}
                      {isCurrent ? (
                        <span className="ml-2 text-[10px] text-[#3fb950]">current</span>
                      ) : null}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-[#30363d] flex items-center justify-between">
            <button
              type="button"
              onClick={clearBranchHighlights}
              className="text-xs text-gray-400 hover:text-gray-200"
              disabled={highlightedCount === 0}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-[#ef4444] hover:text-[#f87171]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

