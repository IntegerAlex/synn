'use client';

import { useAppStore } from '@/store/useAppStore';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { User, ChevronLeft } from 'lucide-react';

export function Header() {
    const repoInfo = useAppStore((state) => state.repoInfo);
    const closeRepo = useAppStore((state) => state.closeRepo);
    const pathname = usePathname();
    
    // Hide repo info on profile page
    const isProfilePage = pathname === '/profile';
    const showRepoInfo = repoInfo && !isProfilePage;

    return (
        <header className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4">
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
                    {/* <span className="text-lg font-bold text-white hover:text-[#ef4444] transition-colors">
                        Synn
                    </span> */}
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
                        onClick={() => closeRepo()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-[#21262d] rounded-lg border border-[#30363d] hover:border-[#ef4444]/50 bg-[#0d1117]/50 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#ef4444]/10"
                    >
                        Close Repo
                    </button>
                )}
            </div>
        </header>
    );
}
