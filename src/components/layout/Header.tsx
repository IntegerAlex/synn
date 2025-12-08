'use client';

import { useAppStore } from '@/store/useAppStore';
import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';

export function Header() {
    const repoInfo = useAppStore((state) => state.repoInfo);
    const closeRepo = useAppStore((state) => state.closeRepo);

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
                {repoInfo && (
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
                {/* Profile link */}
                <Link
                    href="/profile"
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                    title="Profile"
                >
                    <User className="w-4 h-4" />
                </Link>
                
                {/* Close repo button */}
                {repoInfo && (
                    <button
                        onClick={() => closeRepo()}
                        className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                    >
                        Close Repo
                    </button>
                )}
            </div>
        </header>
    );
}
