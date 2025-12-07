'use client';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setTheme, setRepoInfo } from '@/store/slices/appSlice';
import type { Theme } from '@/types/git';

export function Header() {
    const dispatch = useAppDispatch();
    const repoInfo = useAppSelector((state) => state.app.repoInfo);
    const theme = useAppSelector((state) => state.app.theme);

    const themes: { value: Theme; label: string }[] = [
        { value: 'github-dark', label: 'GitHub Dark' },
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'monokai', label: 'Monokai' },
    ];

    return (
        <header className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4">
            {/* Left: App name and repo */}
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-white">GitVis</h1>
                {repoInfo && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">{repoInfo.name}</span>
                        <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs text-[#58a6ff]">
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
                {/* Theme selector */}
                <select
                    value={theme}
                    onChange={(e) => dispatch(setTheme(e.target.value as Theme))}
                    className="px-2 py-1 bg-[#21262d] border border-[#30363d] rounded text-xs text-gray-300
                             focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                >
                    {themes.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                {/* Close repo button */}
                {repoInfo && (
                    <button
                        onClick={() => dispatch(setRepoInfo(null))}
                        className="px-3 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                    >
                        Close Repo
                    </button>
                )}
            </div>
        </header>
    );
}
