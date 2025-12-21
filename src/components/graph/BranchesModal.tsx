'use client';

import { useState, useMemo } from 'react';
import { X, Search, GitBranch, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBranches } from '@/hooks/useGitData';
import { useAppStore } from '@/store/useAppStore';
import { useCheckoutBranch } from '@/hooks/useGitData';
import type { Branch } from '@/types/git';

interface BranchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalBranches: number;
}

export function BranchesModal({ isOpen, onClose, totalBranches }: BranchesModalProps) {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const currentBranch = useAppStore((state) => state.repoInfo?.currentBranch);
  const { data: branchesData } = useBranches();
  const checkoutBranch = useCheckoutBranch();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedBranch, setCopiedBranch] = useState<string | null>(null);

  const branches = useMemo(() => {
    if (!branchesData?.local) return [];
    return branchesData.local;
  }, [branchesData]);

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const query = searchQuery.toLowerCase();
    return branches.filter((branch) => branch.name.toLowerCase().includes(query));
  }, [branches, searchQuery]);

  const handleBranchClick = async (branchName: string) => {
    if (branchName === currentBranch) {
      onClose();
      return;
    }
    try {
      await checkoutBranch.mutateAsync(branchName);
      onClose();
    } catch (error) {
      console.error('Failed to checkout branch:', error);
    }
  };

  const copyBranchName = async (branchName: string) => {
    try {
      await navigator.clipboard.writeText(branchName);
      setCopiedBranch(branchName);
      setTimeout(() => setCopiedBranch(null), 2000);
    } catch {
      // Ignore
    }
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
            aria-label="Branches List"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-white">
                  Branches ({totalBranches.toLocaleString()})
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
                  placeholder="Search branches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:border-transparent"
                />
              </div>
              {searchQuery && (
                <p className="text-xs text-gray-400 mt-2">
                  Showing {filteredBranches.length} of {branches.length} branches
                </p>
              )}
            </div>

            {/* Branches List */}
            <div className="flex-1 overflow-auto min-h-0">
              {filteredBranches.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">
                      {searchQuery ? 'No branches found' : 'No branches available'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#21262d]">
                  {filteredBranches.map((branch) => {
                    const isCurrent = branch.name === currentBranch;
                    return (
                      <motion.div
                        key={branch.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`px-4 py-3 hover:bg-[#161b22] transition-colors cursor-pointer group ${
                          isCurrent ? 'bg-[#238636]/10' : ''
                        }`}
                        onClick={() => handleBranchClick(branch.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#3b82f6]/20 flex items-center justify-center">
                                <GitBranch className="w-4 h-4 text-[#58a6ff]" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">
                                  {branch.name}
                                </span>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 bg-[#238636]/20 text-[#3fb950] rounded text-xs font-medium shrink-0">
                                    Current
                                  </span>
                                )}
                              </div>
                              {branch.commit && (
                                <code className="text-xs text-gray-400 font-mono mt-1 block truncate">
                                  {branch.commit.substring(0, 7)}
                                </code>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyBranchName(branch.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-[#21262d] rounded shrink-0"
                            title="Copy branch name"
                          >
                            {copiedBranch === branch.name ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
