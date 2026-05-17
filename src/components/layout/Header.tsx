"use client";

import { UserButton } from "@clerk/nextjs";
import {
  AlertCircle,
  BarChart3,
  ChevronLeft,
  Code,
  GitPullRequest,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppTab } from "@/store/useAppStore";
import { useAppStore } from "@/store/useAppStore";

const TABS: Array<{ id: AppTab; label: string; icon: any }> = [
  { id: "code", label: "Code", icon: Code },
  { id: "issues", label: "Issues", icon: AlertCircle },
  { id: "pulls", label: "Pull Requests", icon: GitPullRequest },
  { id: "insights", label: "Insights", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Header() {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const closeRepo = useAppStore((state) => state.closeRepo);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);
  const pathname = usePathname();

  // Hide repo info on profile page or selection page
  const isProfilePage = pathname === "/profile";
  const showRepoInfo = repoInfo && !isProfilePage;

  return (
    <header
      className="bg-bg-card border-b border-border-main flex flex-col z-40"
      aria-label="Application header"
    >
      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-6">
        {/* Left: App name and repo */}
        <div className="flex items-center gap-6">
          <Link
            href="/app"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/logo.png"
              alt="Synn Logo"
              width={32}
              height={32}
              priority
              className="object-contain"
            />
            <span className="text-xl font-bold tracking-tight text-text-main hidden sm:block">
              Synn
            </span>
          </Link>

          {showRepoInfo ? (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-4 w-px bg-border-main" />
              <span className="text-text-sub font-medium">{repoInfo.name}</span>
              <span className="px-2 py-0.5 bg-accent-main/10 border border-accent-main/20 rounded text-[10px] font-bold text-accent-main uppercase tracking-wider">
                {repoInfo.currentBranch}
              </span>
              {!repoInfo.isClean && (
                <span
                  className="w-2 h-2 rounded-full bg-[#d29922] shadow-[0_0_8px_rgba(210,153,34,0.4)]"
                  title="Uncommitted changes"
                />
              )}
            </div>
          ) : (
            !isProfilePage && (
              <div className="flex items-center gap-3 text-sm">
                <div className="h-4 w-px bg-border-main" />
                <span className="text-text-sub font-medium">
                  Repository Dashboard
                </span>
              </div>
            )
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Command palette trigger */}
          {showRepoInfo && (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", metaKey: true }),
                );
              }}
              className="hidden lg:inline-flex items-center gap-2 px-4 py-2 text-sm text-text-sub bg-bg-main border border-border-main rounded-xl hover:border-gray-500 transition-all duration-200"
              aria-label="Open command palette"
            >
              <Search className="w-4 h-4" />
              <span>Search or jump to...</span>
              <kbd className="ml-4 px-1.5 py-0.5 text-[10px] bg-bg-hover rounded border border-border-main text-text-main font-mono">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            {isProfilePage && (
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-sub hover:text-text-main hover:bg-bg-hover rounded-xl border border-border-main transition-all duration-200 group"
              >
                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                <span>Back to Dashboard</span>
              </Link>
            )}

            {!isProfilePage && (
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-sub hover:text-text-main hover:bg-bg-hover rounded-xl border border-border-main transition-all duration-200 group"
                title="View Profile"
              >
                <User className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
            )}

            {showRepoInfo && (
              <button
                type="button"
                onClick={closeRepo}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-sub hover:text-text-main hover:bg-bg-hover rounded-xl border border-border-main transition-all duration-200"
                aria-label="Close repository"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Close</span>
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-border-main mx-1" />
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      {/* Tab navigation - only show when repo is selected */}
      {showRepoInfo && (
        <nav
          className="flex items-center gap-1 px-6 -mb-px overflow-x-auto no-scrollbar"
          aria-label="Repository navigation"
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-all duration-200 whitespace-nowrap ${
                activeTab === id
                  ? "border-accent-main text-text-main font-semibold"
                  : "border-transparent text-text-sub hover:text-text-main hover:border-border-main"
              }`}
              aria-current={activeTab === id ? "page" : undefined}
            >
              <Icon
                className={`w-4 h-4 ${activeTab === id ? "text-accent-main" : ""}`}
              />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}
