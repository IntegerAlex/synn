'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
// import { Keyboard } from 'lucide-react'; // COMMENTED OUT: Keyboard shortcuts disabled
import { motion, AnimatePresence } from 'framer-motion';
import { parseUnifiedDiff, createSideBySideData, type ParsedFileDiff } from '@/lib/diff/diffParser';
import { groupChanges, mergeSmallGroups, type GroupedFileDiff } from '@/lib/diff/changeGrouper';
import { useDiffNavigation } from '@/hooks/useDiffNavigation';
// import { DIFF_SHORTCUTS } from '@/hooks/useDiffNavigation'; // COMMENTED OUT: Keyboard shortcuts disabled
import { SideBySideDiff } from './SideBySideDiff';
import { ChangeNavigator } from './ChangeNavigator';
import { SmartFileTabs } from './SmartFileTabs';

interface BetterDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: string;
  commitMessage?: string;
  commitHash?: string;
  files?: Array<{ path: string; status: string; additions: number; deletions: number }>;
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
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Parse the diff
  const parsedDiff = useMemo(() => {
    if (!diff) return null;
    setIsLoading(true);
    const result = parseUnifiedDiff(diff);
    // Simulate loading for animation
    setTimeout(() => setIsLoading(false), 100);
    return result;
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
      if (direction === 'next') {
        setSelectedFileIndex((prev) => Math.min(prev + 1, parsedDiff.files.length - 1));
      } else {
        setSelectedFileIndex((prev) => Math.max(prev - 1, 0));
      }
    },
    enabled: isOpen,
  });

  // Reset file index when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFileIndex(0);
      navigation.setCurrentChangeIndex(0);
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileSelect = useCallback((index: number) => {
    setSelectedFileIndex(index);
    navigation.setCurrentChangeIndex(0);
  }, [navigation]);

  if (!isOpen) return null;

  const currentFile = parsedDiff?.files[selectedFileIndex];

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
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-[95vw] h-[90vh] max-w-7xl bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden min-h-0"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Better Diff View"
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
                    <span className="text-[#3fb950]">+{parsedDiff.totalAdditions}</span>
                    <span className="text-[#f85149]">-{parsedDiff.totalDeletions}</span>
                    <span className="text-gray-400">{parsedDiff.totalFiles} files</span>
                  </div>
                )}
                
                {/* Shortcuts button - COMMENTED OUT: Keyboard shortcuts disabled */}
                {/* <button
                  onClick={() => navigation.setShowShortcuts(true)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard className="w-4 h-4" />
                </button> */}
                
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
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-t-transparent border-[#1f6feb] rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">Analyzing changes...</span>
                  </div>
                </motion.div>
              ) : groupedFile ? (
                <div className="h-full overflow-hidden">
                  <SideBySideDiff
                    groupedFile={groupedFile}
                    currentChangeIndex={navigation.currentChangeIndex}
                    onChangeSelect={navigation.setCurrentChangeIndex}
                  />
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
                {/* COMMENTED OUT: Keyboard shortcuts disabled */}
                {/* <span>
                  Press <kbd className="px-1.5 py-0.5 bg-[#21262d] rounded border border-[#30363d]">?</kbd> for keyboard shortcuts
                </span> */}
              </div>
              
              {currentFile && (
                <div className="flex items-center gap-2">
                  <span className="font-mono">{currentFile.newPath}</span>
                </div>
              )}
            </footer>

            {/* Keyboard shortcuts overlay - COMMENTED OUT: Keyboard shortcuts disabled */}
            {/* <AnimatePresence>
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
                        <div key={shortcut.key} className="flex items-center justify-between py-1">
                          <span className="text-gray-400">{shortcut.description}</span>
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
            </AnimatePresence> */}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
