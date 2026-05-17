"use client";

import { useAppStore } from "@/store/useAppStore";
import type { Theme } from "@/types/git";
import {
	Sun,
	Moon,
	Monitor,
	Palette,
	Layout,
	RotateCcw,
	ChevronRight,
} from "lucide-react";

const THEMES: Array<{ id: Theme; label: string; icon: any; description: string }> = [
	{ id: "light", label: "Light", icon: Sun, description: "Light background with dark text" },
	{ id: "dark", label: "Dark", icon: Moon, description: "Dark background with light text" },
	{ id: "system", label: "System", icon: Monitor, description: "Follow system preference" },
	{
		id: "github-dark",
		label: "GitHub Dark",
		icon: Palette,
		description: "GitHub's dark dimmed theme",
	},
	{
		id: "solarized-light",
		label: "Solarized",
		icon: Sun,
		description: "Solarized light color scheme",
	},
	{
		id: "monokai",
		label: "Monokai",
		icon: Palette,
		description: "Monokai-inspired dark theme",
	},
];

function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-bg-card border border-border-main rounded-xl overflow-hidden shadow-sm">
			<div className="px-4 py-3 border-b border-border-main bg-bg-card/50">
				<h3 className="text-sm font-bold text-text-main tracking-tight uppercase tracking-widest text-[10px]">{title}</h3>
			</div>
			<div className="p-5">{children}</div>
		</div>
	);
}

export function SettingsTab() {
	const theme = useAppStore((state) => state.theme);
	const setTheme = useAppStore((state) => state.setTheme);
	const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
	const toggleSidebar = useAppStore((state) => state.toggleSidebar);
	const graphFilters = useAppStore((state) => state.graphFilters);
	const toggleShowMergeCommits = useAppStore((state) => state.toggleShowMergeCommits);
	const toggleShowTags = useAppStore((state) => state.toggleShowTags);
	const resetLayout = useAppStore((state) => state.resetLayout);
	const repoInfo = useAppStore((state) => state.repoInfo);

	return (
		<div className="h-full overflow-y-auto bg-bg-main p-6 sm:p-8">
			<div className="max-w-3xl mx-auto space-y-8">
                <div className="mb-2">
                    <h1 className="text-2xl font-black text-text-main">Settings</h1>
                    <p className="text-text-sub text-sm">Manage your workspace preferences and theme</p>
                </div>

				{/* Theme Settings */}
				<SettingsSection title="Appearance">
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{THEMES.map(({ id, label, icon: Icon, description }) => (
							<button
								key={id}
								type="button"
								onClick={() => setTheme(id)}
								className={`flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 group ${
									theme === id
										? "border-accent-main bg-accent-main/5 ring-1 ring-accent-main"
										: "border-border-main hover:border-text-sub bg-bg-main"
								}`}
							>
								<div className="flex items-center justify-between w-full">
									<div className="flex items-center gap-2">
										<Icon className={`w-4 h-4 ${theme === id ? "text-accent-main" : "text-text-sub group-hover:text-text-main"}`} />
										<span
											className={`text-sm font-bold ${theme === id ? "text-accent-main" : "text-text-sub group-hover:text-text-main"}`}
										>
											{label}
										</span>
									</div>
									{theme === id && <div className="w-1.5 h-1.5 rounded-full bg-accent-main animate-pulse" />}
								</div>
								<span className="text-[10px] text-text-sub font-medium leading-tight">{description}</span>
							</button>
						))}
					</div>
				</SettingsSection>

				{/* Layout Settings */}
				<SettingsSection title="Workspace">
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm font-bold text-text-main">Sidebar</div>
								<div className="text-xs text-text-sub">
									Toggle the left sidebar visibility
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={!sidebarCollapsed}
								onClick={toggleSidebar}
								className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
									!sidebarCollapsed ? "bg-accent-main shadow-lg shadow-accent-main/20" : "bg-bg-tertiary"
								}`}
							>
								<span
									className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${
										!sidebarCollapsed ? "left-6" : "left-1"
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm font-bold text-text-main">Show merge commits</div>
								<div className="text-xs text-text-sub">
									Display merge commits in the graph
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={graphFilters.showMergeCommits}
								onClick={toggleShowMergeCommits}
								className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
									graphFilters.showMergeCommits ? "bg-accent-main shadow-lg shadow-accent-main/20" : "bg-bg-tertiary"
								}`}
							>
								<span
									className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${
										graphFilters.showMergeCommits ? "left-6" : "left-1"
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm font-bold text-text-main">Show tags</div>
								<div className="text-xs text-text-sub">
									Display tags in the graph visualization
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={graphFilters.showTags}
								onClick={toggleShowTags}
								className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
									graphFilters.showTags ? "bg-accent-main shadow-lg shadow-accent-main/20" : "bg-bg-tertiary"
								}`}
							>
								<span
									className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${
										graphFilters.showTags ? "left-6" : "left-1"
									}`}
								/>
							</button>
						</div>

                        <div className="pt-2">
						    <button
							    type="button"
							    onClick={resetLayout}
							    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-text-sub hover:text-text-main border border-border-main hover:border-text-sub rounded-xl transition-all"
						    >
							    <RotateCcw className="w-3.5 h-3.5" />
							    Reset layout to defaults
						    </button>
                        </div>
					</div>
				</SettingsSection>

				{/* Repository Info */}
				{repoInfo && (
					<SettingsSection title="Current Repository">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3 bg-bg-main rounded-xl border border-border-main/50">
								<div className="text-[10px] font-black text-text-sub uppercase mb-1">Name</div>
								<div className="text-sm font-bold text-text-main font-mono">{repoInfo.name}</div>
							</div>
                            <div className="p-3 bg-bg-main rounded-xl border border-border-main/50">
								<div className="text-[10px] font-black text-text-sub uppercase mb-1">Path</div>
								<div className="text-sm font-bold text-text-main font-mono truncate">{repoInfo.path}</div>
							</div>
                            <div className="p-3 bg-bg-main rounded-xl border border-border-main/50">
								<div className="text-[10px] font-black text-text-sub uppercase mb-1">Branch</div>
								<div className="text-sm font-bold text-accent-main font-mono">{repoInfo.currentBranch}</div>
							</div>
                            <div className="p-3 bg-bg-main rounded-xl border border-border-main/50">
								<div className="text-[10px] font-black text-text-sub uppercase mb-1">Status</div>
								<div className={`text-sm font-bold ${repoInfo.isClean ? "text-green-500" : "text-yellow-500"}`}>
                                    {repoInfo.isClean ? "Clean" : "Uncommitted changes"}
                                </div>
							</div>
						</div>
					</SettingsSection>
				)}

				{/* Keyboard Shortcuts */}
				<SettingsSection title="Keyboard Shortcuts">
					<div className="space-y-3">
						{[
							["j / k", "Navigate between changes"],
							["n / p", "Next / previous file"],
							["Esc", "Close modals"],
						].map(([key, desc]) => (
							<div key={key} className="flex items-center justify-between">
								<span className="text-sm text-text-sub font-medium">{desc}</span>
								<kbd className="px-3 py-1 bg-bg-hover border border-border-main rounded-lg text-text-main font-mono text-xs font-bold shadow-sm">
									{key}
								</kbd>
							</div>
						))}
					</div>
				</SettingsSection>
			</div>
		</div>
	);
}
