'use client';

import { useBranches, useCheckoutBranch } from '@/hooks/useGitData';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedBranch } from '@/store/slices/appSlice';

export function Sidebar() {
    const dispatch = useAppDispatch();
    const { data: branches, isLoading } = useBranches();
    const checkout = useCheckoutBranch();
    const selectedBranch = useAppSelector((state) => state.app.selectedBranch);
    const repoInfo = useAppSelector((state) => state.app.repoInfo);

    const handleBranchClick = (branchName: string) => {
        dispatch(setSelectedBranch(branchName));
    };

    const handleCheckout = async (branchName: string) => {
        try {
            await checkout.mutateAsync(branchName);
        } catch (error) {
            console.error('Checkout failed:', error);
        }
    };

    return (
        <aside className="w-60 h-full bg-[#161b22] border-r border-[#30363d] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#30363d]">
                <h2 className="text-sm font-semibold text-gray-200">Branches</h2>
            </div>

            {/* Branch list */}
            <div className="flex-1 overflow-y-auto py-2">
                {isLoading ? (
                    <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
                ) : branches ? (
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
                            >
                                {branch.isCurrent && (
                                    <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
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
                                    >
                                        {branch.name}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Footer with repo info */}
            {repoInfo && (
                <div className="px-4 py-3 border-t border-[#30363d] text-xs text-gray-500">
                    <div className="truncate font-medium text-gray-400">{repoInfo.name}</div>
                    <div className="truncate">{repoInfo.path}</div>
                </div>
            )}
        </aside>
    );
}
