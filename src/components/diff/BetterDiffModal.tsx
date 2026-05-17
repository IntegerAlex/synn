"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlignJustify,
  Columns2,
  Expand,
  Keyboard,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DIFF_SHORTCUTS, useDiffNavigation } from "@/hooks/useDiffNavigation";
import {
  type GroupedFileDiff,
  groupChanges,
  mergeSmallGroups,
} from "@/lib/diff/changeGrouper";
import { createSideBySideData, parseUnifiedDiff } from "@/lib/diff/diffParser";
import { ChangeNavigator } from "./ChangeNavigator";
import { SideBySideDiff } from "./SideBySideDiff";
import { SmartFileTabs } from "./SmartFileTabs";
import { UnifiedDiffView } from "./UnifiedDiffView";

type DiffViewMode = "split" | "unified";

interface BetterDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: string;
  commitMessage?: string;
  commitHash?: string;
  files?: Array<{
    path: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

export function BetterDiffModal({
  isOpen,
  onClose,
  diff,
  commitMessage,
  commitHash,
  files,
}: BetterDiffModalProps) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [viewMode, setViewMode] = useState<DiffViewMode>("split");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [expandAllContext, setExpandAllContext] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse the diff - no side effects inside useMemo
  const parsedDiff = useMemo(() => {
    if (!diff) return null;
    return parseUnifiedDiff(diff);
  }, [diff]);

  // Get grouped changes for current file
  const groupedFile = useMemo((): GroupedFileDiff | null => {
    if (!parsedDiff || parsedDiff.files.length === 0) return null;

    const file = parsedDiff.files[selectedFileIndex];
    if (!file) return null;

    const sideBySideData = createSideBySideData(file.hunks);
    const grouped = groupChanges(sideBySideData, file.newPath);

    // Merge small groups for cleaner display
    grouped.groups = mergeSmallGroups(grouped.groups, 2);

    return grouped;
  }, [parsedDiff, selectedFileIndex]);

  // Count total changes
  const totalChanges = useMemo(() => {
    return groupedFile?.groups.length || 0;
  }, [groupedFile]);

  // Navigation
  const navigation = useDiffNavigation({
    totalChanges,
    totalFiles: parsedDiff?.files.length || 0,
    onClose,
    onFileChange: (direction) => {
      if (!parsedDiff) return;
      if (direction === "next") {
        setSelectedFileIndex((prev) =>
          Math.min(prev + 1, parsedDiff.files.length - 1),
        );
      } else {
        setSelectedFileIndex((prev) => Math.max(prev - 1, 0));
      }
    },
    onToggleSearch: () => {
      setIsSearchVisible((prev) => !prev);
    },
    enabled: isOpen,
  });

  // Reset file index when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFileIndex(0);
      navigation.setCurrentChangeIndex(0);
      setSearchQuery("");
      setIsSearchVisible(false);
    }
  }, [isOpen, navigation.setCurrentChangeIndex]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Focus search input when search becomes visible
  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);

  // Handle file selection
  const handleFileSelect = useCallback(
    (index: number) => {
      setSelectedFileIndex(index);
      navigation.setCurrentChangeIndex(0);
    },
    [navigation],
  );

  if (!isOpen) return null;

  const currentFile = parsedDiff?.files[selectedFileIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-[95vw] h-[90vh] max-w-7xl bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden min-h-0"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Diff View"
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">Better Diff</h2>
            {commitHash && (
              <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs font-mono text-[#ef4444]">
                {commitHash.slice(0, 7)}
              </span>
            )}
            {commitMessage && (
              <span className="text-sm text-gray-400 truncate max-w-md">
                {commitMessage}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Stats */}
            {parsedDiff && (
              <div className="flex items-center gap-3 text-sm mr-4">
                <span className="text-[#3fb950]">
                  +{parsedDiff.totalAdditions}
                </span>
                <span className="text-[#f85149]">
                  -{parsedDiff.totalDeletions}
                </span>
                <span className="text-gray-400">
                  {parsedDiff.totalFiles} files
                </span>
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex items-center gap-0.5 bg-[#21262d] rounded border border-[#30363d]">
              <button
                onClick={() => setViewMode("split")}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-l transition-colors ${
                  viewMode === "split"
                    ? "bg-[#30363d] text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                title="Split view"
              >
                <Columns2 className="w-3.5 h-3.5" />
                Split
              </button>
              <button
                onClick={() => setViewMode("unified")}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded-r transition-colors ${
                  viewMode === "unified"
                    ? "bg-[#30363d] text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                title="Unified view"
              >
                <AlignJustify className="w-3.5 h-3.5" />
                Unified
              </button>
            </div>

            {/* Expand all context */}
            <button
              onClick={() => setExpandAllContext((prev) => !prev)}
              className={`p-2 rounded transition-colors ${
                expandAllContext
                  ? "text-[#79c0ff] bg-[#21262d]"
                  : "text-gray-400 hover:text-white hover:bg-[#21262d]"
              }`}
              title="Expand all context"
            >
              <Expand className="w-4 h-4" />
            </button>

            {/* Search button */}
            <button
              onClick={() => setIsSearchVisible((prev) => !prev)}
              className={`p-2 rounded transition-colors ${
                isSearchVisible
                  ? "text-[#79c0ff] bg-[#21262d]"
                  : "text-gray-400 hover:text-white hover:bg-[#21262d]"
              }`}
              title="Search in diff (/)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Shortcuts button */}
            <button
              onClick={() => navigation.setShowShortcuts(true)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Search bar */}
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-b border-[#30363d] bg-[#161b22]"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in diff..."
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-sm text-gray-200 placeholder-gray-500 focus:border-[#1f6feb] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsSearchVisible(false);
                      setSearchQuery("");
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-gray-400 hover:text-gray-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart File tabs */}
        {parsedDiff && parsedDiff.files.length > 0 && (
          <SmartFileTabs
            files={parsedDiff.files}
            selectedFileIndex={selectedFileIndex}
            onFileSelect={handleFileSelect}
          />
        )}

        {/* Change navigator */}
        {groupedFile && groupedFile.groups.length > 0 && (
          <ChangeNavigator
            currentIndex={navigation.currentChangeIndex}
            totalChanges={totalChanges}
            onPrevious={navigation.goToPrevChange}
            onNext={navigation.goToNextChange}
            onJumpTo={navigation.setCurrentChangeIndex}
            groups={groupedFile.groups}
          />
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {groupedFile ? (
            <div className="h-full overflow-hidden">
              {viewMode === "split" ? (
                <SideBySideDiff
                  groupedFile={groupedFile}
                  currentChangeIndex={navigation.currentChangeIndex}
                  onChangeSelect={navigation.setCurrentChangeIndex}
                />
              ) : (
                <UnifiedDiffView
                  groupedFile={groupedFile}
                  currentChangeIndex={navigation.currentChangeIndex}
                  onChangeSelect={navigation.setCurrentChangeIndex}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No diff to display
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between px-4 py-2 border-t border-[#30363d] bg-[#161b22]/50 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded border border-[#30363d]">
                ?
              </kbd>{" "}
              for keyboard shortcuts
            </span>
          </div>

          {currentFile && (
            <div className="flex items-center gap-2">
              {currentFile.isNew && (
                <span
                  className="px-1.5 py-0.5 bg-[#238636]/20 text-[#3fb950] rounded text-[10px] font-medium"
                  role="status"
                  aria-label="New file"
                >
                  NEW
                </span>
              )}
              {currentFile.isDeleted && (
                <span
                  className="px-1.5 py-0.5 bg-[#da3633]/20 text-[#f85149] rounded text-[10px] font-medium"
                  role="status"
                  aria-label="Deleted file"
                >
                  DELETED
                </span>
              )}
              {currentFile.isRenamed && (
                <span
                  className="px-1.5 py-0.5 bg-[#1f6feb]/20 text-[#79c0ff] rounded text-[10px] font-medium"
                  role="status"
                  aria-label="Renamed file"
                >
                  RENAMED
                </span>
              )}
              <span className="font-mono">{currentFile.newPath}</span>
            </div>
          )}
        </footer>

        {/* Keyboard shortcuts overlay */}
        <AnimatePresence>
          {navigation.showShortcuts && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
              onClick={() => navigation.setShowShortcuts(false)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-[#ef4444]" />
                  Keyboard Shortcuts
                </h3>
                <div className="space-y-2">
                  {DIFF_SHORTCUTS.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="text-gray-400">
                        {shortcut.description}
                      </span>
                      <kbd className="px-2 py-1 bg-[#21262d] rounded border border-[#30363d] text-sm font-mono text-gray-200">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigation.setShowShortcuts(false)}
                  className="mt-4 w-full py-2 bg-[#21262d] border border-[#30363d] rounded text-sm text-gray-300 hover:bg-[#30363d] transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
