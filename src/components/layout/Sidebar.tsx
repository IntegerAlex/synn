'use client';

import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useBranches, useCheckoutBranch } from '@/hooks/useGitData';
import { useAppStore } from '@/store/useAppStore';
import { FileTree } from '@/components/layout/FileTree';
import { Menu, X, GitBranch, Files } from 'lucide-react';
import type { Branch } from '@/types/git';

export function Sidebar() {
    const setSelectedBranch = useAppStore((state) => state.setSelectedBranch);
    const { data: branches, isLoading } = useBranches();
    const checkout = useCheckoutBranch();
    const selectedBranch = useAppStore((state) => state.selectedBranch);
    const repoInfo = useAppStore((state) => state.repoInfo);
    const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useAppStore((state) => state.toggleSidebar);
    const [tab, setTab] = useState<'branches' | 'files'>('files');

    const handleBranchClick = (branchName: string) => {
        setSelectedBranch(branchName);
    };

    const handleCheckout = async (branchName: string) => {
        try {
            await checkout.mutateAsync(branchName);
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    };

    const shouldVirtualizeBranches =
        (branches?.local.length || 0) + (branches?.remote.length || 0) > 50;

    const branchRows = useMemo(() => {
        if (!branches) return [];
        const rows: Array<
            | { type: 'header'; id: string; label: string }
            | { type: 'branch'; id: string; branch: Branch; isRemote: boolean }
        > = [];
        if (branches.local.length > 0) {
            rows.push({ type: 'header', id: 'h-local', label: 'Local' });
            for (const b of branches.local) {
                rows.push({ type: 'branch', id: `l:${b.name}`, branch: b, isRemote: false });
            }
        }
        if (branches.remote.length > 0) {
            rows.push({ type: 'header', id: 'h-remote', label: 'Remote' });
            for (const b of branches.remote) {
                rows.push({ type: 'branch', id: `r:${b.name}`, branch: b, isRemote: true });
            }
        }
        return rows;
    }, [branches]);

    const branchParentRef = useRef<HTMLDivElement | null>(null);
    const branchVirtualizer = useVirtualizer({
        count: branchRows.length,
        getScrollElement: () => branchParentRef.current,
        estimateSize: (i) => (branchRows[i]?.type === 'header' ? 24 : 34),
        overscan: 8,
    });

    return (
        <aside
            className={`h-full bg-[#161b22] border-r border-[#30363d] flex flex-col transition-all duration-200 ${
                sidebarCollapsed ? 'w-16' : 'w-60'
            }`}
            role="navigation"
            aria-label="Repository sidebar"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#30363d]">
                <div className="flex items-center justify-between">
                    {!sidebarCollapsed && (
                        <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                            {tab === 'branches' ? (
                                <GitBranch className="w-4 h-4" />
                            ) : (
                                <Files className="w-4 h-4" />
                            )}
                            {tab === 'branches' ? 'Branches' : 'Files'}
                        </h2>
                    )}
                    <button
                        aria-label="Toggle sidebar"
                        className="p-2 rounded-lg hover:bg-[#21262d] transition-colors ml-auto"
                        onClick={toggleSidebar}
                    >
                        {sidebarCollapsed ? (
                            <Menu className="w-4 h-4 text-gray-400" />
                        ) : (
                            <X className="w-4 h-4 text-gray-400" />
                        )}
                    </button>
                </div>
                {!sidebarCollapsed && (
                    <div className="mt-3 flex items-center gap-2">
                        {/* <button
                            type="button"
                            onClick={() => setTab('branches')}
                            className={`flex-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                                tab === 'branches'
                                    ? 'border-[#30363d] bg-[#21262d] text-gray-200'
                                    : 'border-[#30363d] bg-transparent text-gray-400 hover:bg-[#21262d]'
                            }`}
                            aria-pressed={tab === 'branches'}
                            aria-label="Show branches"
                        >
                            Branches
                        </button> */}
                        <button
                            type="button"
                            onClick={() => setTab('files')}
                            className={`flex-1 px-2 py-1 rounded-md text-xs border transition-colors ${
                                tab === 'files'
                                    ? 'border-[#30363d] bg-[#21262d] text-gray-200'
                                    : 'border-[#30363d] bg-transparent text-gray-400 hover:bg-[#21262d]'
                            }`}
                            aria-pressed={tab === 'files'}
                            aria-label="Show files"
                        >
                            Files
                        </button>
                    </div>
                )}
            </div>

            {!sidebarCollapsed && tab === 'branches' && (
                <div className="flex-1 overflow-y-auto py-2" ref={branchParentRef} aria-live="polite">
                    {isLoading ? (
                        <div className="px-4 py-2 text-sm text-gray-500">Loading branches…</div>
                    ) : !branches ? null : !shouldVirtualizeBranches ? (
                        <div className="space-y-1">
                            {/* Local branches */}
                            <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">
                                Local
                            </div>
                            {branches.local.map((branch) => (
                                <button
                                    key={branch.name}
                                    onClick={() => handleBranchClick(branch.name)}
                                    onDoubleClick={() => handleCheckout(branch.name)}
                                    className={`w-full px-4 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[#21262d] transition-colors
                                        ${selectedBranch === branch.name ? 'bg-[#21262d] text-white' : 'text-gray-300'}
                                        ${branch.isCurrent ? 'font-medium' : ''}`}
                                    aria-label={`Branch ${branch.name}${branch.isCurrent ? ' (current)' : ''}`}
                                    aria-current={selectedBranch === branch.name ? 'true' : undefined}
                                >
                                    {branch.isCurrent && (
                                        <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                                    )}
                                    <span className="truncate">{branch.name}</span>
                                </button>
                            ))}

                            {/* Remote branches */}
                            {branches.remote.length > 0 && (
                                <>
                                    <div className="px-3 py-1 mt-4 text-xs text-gray-500 uppercase tracking-wider">
                                        Remote
                                    </div>
                                    {branches.remote.map((branch) => (
                                        <button
                                            key={branch.name}
                                            onClick={() => handleBranchClick(branch.name)}
                                            className={`w-full px-4 py-1.5 text-left text-sm truncate hover:bg-[#21262d] transition-colors
                                                ${selectedBranch === branch.name ? 'bg-[#21262d] text-white' : 'text-gray-400'}`}
                                            aria-label={`Remote branch ${branch.name}`}
                                            aria-current={selectedBranch === branch.name ? 'true' : undefined}
                                        >
                                            {branch.name}
                                        </button>
                                    ))}
                                </>
                            )}
                        </div>
                    ) : (
                        <div
                            className="relative w-full"
                            style={{ height: `${branchVirtualizer.getTotalSize()}px` }}
                        >
                            {branchVirtualizer.getVirtualItems().map((virtualRow) => {
                                const row = branchRows[virtualRow.index];
                                if (!row) return null;
                                return (
                                    <div
                                        key={row.id}
                                        className="absolute top-0 left-0 w-full"
                                        style={{
                                            height: `${virtualRow.size}px`,
                                            transform: `translateY(${virtualRow.start}px)`,
                                        }}
                                    >
                                        {row.type === 'header' ? (
                                            <div className="px-3 py-1 text-xs text-gray-500 uppercase tracking-wider">
                                                {row.label}
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleBranchClick(row.branch.name)}
                                                onDoubleClick={
                                                    row.isRemote
                                                        ? undefined
                                                        : () => handleCheckout(row.branch.name)
                                                }
                                                className={`w-full px-4 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-[#21262d] transition-colors
                                                    ${selectedBranch === row.branch.name ? 'bg-[#21262d] text-white' : row.isRemote ? 'text-gray-400' : 'text-gray-300'}
                                                    ${row.branch.isCurrent ? 'font-medium' : ''}`}
                                                aria-label={`${row.isRemote ? 'Remote' : 'Local'} branch ${row.branch.name}${row.branch.isCurrent ? ' (current)' : ''}`}
                                                aria-current={selectedBranch === row.branch.name ? 'true' : undefined}
                                            >
                                                {row.branch.isCurrent && (
                                                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                                                )}
                                                <span className="truncate">{row.branch.name}</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {!sidebarCollapsed && tab === 'files' && (
                <div className="flex-1 overflow-y-auto">
                    <FileTree />
                </div>
            )}

            {/* Footer with repo info */}
            {repoInfo && !sidebarCollapsed && (
                <div className="px-4 py-3 border-t border-[#30363d] text-xs text-gray-500">
                    <div className="truncate font-medium text-gray-400">{repoInfo.name}</div>
                    <div className="truncate">{repoInfo.path}</div>
                </div>
            )}
        </aside>
    );
}
