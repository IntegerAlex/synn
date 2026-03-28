'use client';

import { useAppStore } from '@/store/useAppStore';
import type { AppTab } from '@/store/useAppStore';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { User, ChevronLeft, Code, AlertCircle, GitPullRequest, BarChart3, Settings, Search } from 'lucide-react';

const TABS: Array<{ id: AppTab; label: string; icon: any }> = [
    { id: 'code', label: 'Code', icon: Code },
    { id: 'issues', label: 'Issues', icon: AlertCircle },
    { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export function Header() {
    const repoInfo = useAppStore((state) => state.repoInfo);
    const closeRepo = useAppStore((state) => state.closeRepo);
    const activeTab = useAppStore((state) => state.activeTab);
    const setActiveTab = useAppStore((state) => state.setActiveTab);
    const pathname = usePathname();
    
    // Hide repo info on profile page
    const isProfilePage = pathname === '/profile';
    const showRepoInfo = repoInfo && !isProfilePage;

    return (
        <header className="bg-[#161b22] border-b border-[#30363d] flex flex-col" role="banner" aria-label="Application header">
            {/* Top bar */}
            <div className="h-12 flex items-center justify-between px-4">
                {/* Left: App name and repo */}
                <div className="flex items-center gap-4">
                    <Link href="/app" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Image
                            src="/logo.png"
                            alt="Synn Logo"
                            width={84}
                            height={84}
                            className="object-contain"
                        />
                    </Link>
                    {showRepoInfo && (
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">{repoInfo.name}</span>
                            <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs text-[#ef4444]">
                                {repoInfo.currentBranch}
                            </span>
                            {!repoInfo.isClean && (
                                <span className="w-2 h-2 rounded-full bg-[#d29922]" title="Uncommitted changes" />
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3">
                    {/* Command palette trigger */}
                    {showRepoInfo && (
                        <button
                            type="button"
                            onClick={() => {
                                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
                            }}
                            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-[#484f58] transition-colors"
                            aria-label="Open command palette"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Search or jump to...</span>
                            <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-[#21262d] rounded border border-[#30363d]">⌘K</kbd>
                        </button>
                    )}

                    {/* Back to App button - show on profile page */}
                    {isProfilePage && (
                        <Link
                            href="/app"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#21262d] rounded-lg border border-[#30363d] hover:border-[#ef4444]/50 bg-[#0d1117]/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#ef4444]/10 group"
                        >
                            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                            <span>Back to App</span>
                        </Link>
                    )}
                    
                    {/* Profile link - hide on profile page */}
                    {!isProfilePage && (
                        <Link
                            href="/profile"
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#21262d] rounded-lg border border-[#30363d] hover:border-[#ef4444]/50 bg-[#0d1117]/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#ef4444]/10 group"
                            title="View Profile"
                        >
                            <User className="w-4 h-4 transition-transform group-hover:scale-110" />
                            <span>Profile</span>
                        </Link>
                    )}
                    
                    {/* Close repo button */}
                    {showRepoInfo && (
                        <button
                            type="button"
                            onClick={closeRepo}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#21262d] rounded-lg border border-[#30363d] hover:border-[#ef4444]/50 bg-[#0d1117]/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#ef4444]/10"
                            aria-label="Close repository"
                        >
                            Close Repo
                        </button>
                    )}
                </div>
            </div>

            {/* Tab navigation - only show when repo is selected */}
            {showRepoInfo && (
                <nav className="flex items-center gap-0 px-4 -mb-px" aria-label="Repository navigation">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors ${
                                activeTab === id
                                    ? 'border-[#ef4444] text-white font-medium'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-[#30363d]'
                            }`}
                            aria-current={activeTab === id ? 'page' : undefined}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
            )}
        </header>
    );
}
