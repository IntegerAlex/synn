'use client';

import { useState } from 'react';
import { Share2, Copy, X } from 'lucide-react';
import { useShareView } from '@/hooks/useShareView';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/useToast';

interface ShareButtonProps {
  graphLimit?: number;
}

export function ShareButton({ graphLimit = 500 }: ShareButtonProps) {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  const selectedCommitHash = useAppStore((state) => state.selectedCommitHash);
  const graphFilters = useAppStore((state) => state.graphFilters);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const shareMutation = useShareView();
  const toast = useToast();

  const handleShare = async () => {
    if (!repoInfo) return;

    try {
      const result = await shareMutation.mutateAsync({
        repoFullName: repoInfo.path,
        branch: selectedBranch || repoInfo.currentBranch,
        selectedCommit: selectedCommitHash,
        graphFilters: {
          showMergeCommits: graphFilters.showMergeCommits,
          showTags: graphFilters.showTags,
          highlightedBranches: Array.from(graphFilters.highlightedBranches),
        },
        graphLimit,
      });

      setShareUrl(result.url);
      setIsOpen(true);
    } catch (error) {
      toast.showError('Failed to create share link');
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.showSuccess('Link copied to clipboard!');
    } catch {
      toast.showError('Failed to copy');
    }
  };

  if (!repoInfo) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={shareMutation.isPending}
        className="px-2 py-1 rounded-md text-xs border border-[#30363d] hover:bg-[#21262d] text-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        title="Share this view"
      >
        <Share2 className="w-3.5 h-3.5" />
        {shareMutation.isPending ? 'Sharing...' : 'Share'}
      </button>

      {isOpen && shareUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="share-view-title" aria-describedby="share-view-desc">
          <div className="w-full max-w-md rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-200" id="share-view-title">Share View</div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded hover:bg-[#21262d]"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div className="text-xs text-gray-400" id="share-view-desc">
                Anyone with this link can view the graph (read-only)
              </div>
              <div className="text-xs text-yellow-400">
                ⏱️ This link expires in 1 hour
              </div>

              <div className="flex items-center gap-2 p-2 bg-[#161b22] border border-[#30363d] rounded">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs text-gray-200 outline-none"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="p-1.5 rounded hover:bg-[#21262d] transition-colors"
                  aria-label="Copy link"
                >
                  <Copy className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-md text-xs border border-[#30363d] hover:bg-[#21262d] text-gray-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
