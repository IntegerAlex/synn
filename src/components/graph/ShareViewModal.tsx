'use client';

import { useState, useCallback } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { generateShareUrl, getCurrentViewState } from '@/lib/utils/shareView';
import { Toast } from '@/components/ui/Toast';

export function ShareViewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  const selectedCommit = useAppStore((state) => state.selectedCommitHash);
  const graphFilters = useAppStore((state) => state.graphFilters);
  const graphLimit = useAppStore((state) => {
    // We need to get graphLimit from CytoscapeGraph, but for now use default
    return 500;
  });

  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const viewState = getCurrentViewState(
    repoInfo,
    selectedBranch,
    selectedCommit,
    graphFilters,
    graphLimit
  );

  const shareUrl = viewState ? generateShareUrl(viewState) : '';

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setToast('Link copied to clipboard');
      setTimeout(() => {
        setCopied(false);
        setToast(null);
      }, 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setToast('Link copied to clipboard');
        setTimeout(() => {
          setCopied(false);
          setToast(null);
        }, 2000);
      } catch {
        setToast('Failed to copy link');
      }
      document.body.removeChild(textarea);
    }
  }, [shareUrl]);

  const handleOpen = useCallback(() => {
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  }, [shareUrl]);

  if (!isOpen) return null;

  if (!repoInfo) {
    return (
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Share View</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">Please select a repository first.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-2xl w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <ExternalLink className="w-5 h-5 text-[#ef4444]" />
              Share Graph View
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-400 text-sm mb-4">
              Share this graph view with your team. Anyone with the link can view the graph (read-only).
            </p>

            {/* Share URL */}
            <div className="mb-4">
              <label className="block text-xs text-gray-500 mb-2">Shareable Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#1f6feb]/40"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors flex items-center gap-2 text-sm text-gray-200"
                  title="Copy link"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#3fb950]" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleOpen}
                  className="px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] transition-colors flex items-center gap-2 text-sm text-gray-200"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* View Details */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-4 space-y-2">
              <div className="text-xs text-gray-500">View includes:</div>
              <div className="text-sm text-gray-300 space-y-1">
                <div>• Repository: {repoInfo.name}</div>
                {selectedBranch && <div>• Branch: {selectedBranch}</div>}
                {selectedCommit && <div>• Selected commit: {selectedCommit.substring(0, 7)}</div>}
                {graphFilters.highlightedBranches.size > 0 && (
                  <div>
                    • Highlighted branches: {Array.from(graphFilters.highlightedBranches).join(', ')}
                  </div>
                )}
                {!graphFilters.showMergeCommits && <div>• Merge commits hidden</div>}
                {!graphFilters.showTags && <div>• Tags hidden</div>}
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Note: Shared views are read-only. Recipients can view but not modify the graph.
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60]">
          <Toast message={toast} onClose={() => setToast(null)} />
        </div>
      )}
    </>
  );
}
