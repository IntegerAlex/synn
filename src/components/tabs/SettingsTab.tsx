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
		<div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
			<div className="px-4 py-3 border-b border-[#30363d]">
				<h3 className="text-sm font-semibold text-gray-200">{title}</h3>
			</div>
			<div className="p-4">{children}</div>
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
		<div className="h-full overflow-y-auto bg-[#0d1117] p-6">
			<div className="max-w-2xl mx-auto space-y-6">
				{/* Theme Settings */}
				<SettingsSection title="Appearance">
					<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
						{THEMES.map(({ id, label, icon: Icon, description }) => (
							<button
								key={id}
								type="button"
								onClick={() => setTheme(id)}
								className={`flex flex-col items-start gap-2 p-3 rounded-lg border transition-all ${
									theme === id
										? "border-blue-500 bg-blue-500/10"
										: "border-[#30363d] hover:border-[#484f58] bg-[#0d1117]"
								}`}
							>
								<div className="flex items-center gap-2">
									<Icon className={`w-4 h-4 ${theme === id ? "text-blue-400" : "text-gray-500"}`} />
									<span
										className={`text-sm font-medium ${theme === id ? "text-blue-400" : "text-gray-300"}`}
									>
										{label}
									</span>
								</div>
								<span className="text-xs text-gray-500">{description}</span>
							</button>
						))}
					</div>
				</SettingsSection>

				{/* Layout Settings */}
				<SettingsSection title="Layout">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-300">Sidebar</div>
								<div className="text-xs text-gray-500">
									Toggle the left sidebar visibility
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={!sidebarCollapsed}
								onClick={toggleSidebar}
								className={`relative w-10 h-5 rounded-full transition-colors ${
									!sidebarCollapsed ? "bg-blue-500" : "bg-[#30363d]"
								}`}
							>
								<span
									className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
										!sidebarCollapsed ? "left-5" : "left-0.5"
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-300">Show merge commits</div>
								<div className="text-xs text-gray-500">
									Display merge commits in the graph
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={graphFilters.showMergeCommits}
								onClick={toggleShowMergeCommits}
								className={`relative w-10 h-5 rounded-full transition-colors ${
									graphFilters.showMergeCommits ? "bg-blue-500" : "bg-[#30363d]"
								}`}
							>
								<span
									className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
										graphFilters.showMergeCommits ? "left-5" : "left-0.5"
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<div className="text-sm text-gray-300">Show tags</div>
								<div className="text-xs text-gray-500">
									Display tags in the graph visualization
								</div>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={graphFilters.showTags}
								onClick={toggleShowTags}
								className={`relative w-10 h-5 rounded-full transition-colors ${
									graphFilters.showTags ? "bg-blue-500" : "bg-[#30363d]"
								}`}
							>
								<span
									className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
										graphFilters.showTags ? "left-5" : "left-0.5"
									}`}
								/>
							</button>
						</div>

						<button
							type="button"
							onClick={resetLayout}
							className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#30363d] hover:border-[#484f58] rounded-md transition-colors"
						>
							<RotateCcw className="w-4 h-4" />
							Reset layout to defaults
						</button>
					</div>
				</SettingsSection>

				{/* Repository Info */}
				{repoInfo && (
					<SettingsSection title="Repository">
						<dl className="space-y-3">
							<div className="flex items-center justify-between">
								<dt className="text-sm text-gray-500">Name</dt>
								<dd className="text-sm text-gray-300 font-mono">{repoInfo.name}</dd>
							</div>
							<div className="flex items-center justify-between">
								<dt className="text-sm text-gray-500">Path</dt>
								<dd className="text-sm text-gray-300 font-mono truncate max-w-xs">
									{repoInfo.path}
								</dd>
							</div>
							<div className="flex items-center justify-between">
								<dt className="text-sm text-gray-500">Branch</dt>
								<dd className="text-sm text-gray-300 font-mono">{repoInfo.currentBranch}</dd>
							</div>
							<div className="flex items-center justify-between">
								<dt className="text-sm text-gray-500">Clean</dt>
								<dd className="text-sm text-gray-300">{repoInfo.isClean ? "Yes" : "No"}</dd>
							</div>
							{repoInfo.remotes.length > 0 && (
								<div className="flex items-center justify-between">
									<dt className="text-sm text-gray-500">Remotes</dt>
									<dd className="text-sm text-gray-300">{repoInfo.remotes.join(", ")}</dd>
								</div>
							)}
						</dl>
					</SettingsSection>
				)}

				{/* Keyboard Shortcuts */}
				<SettingsSection title="Keyboard Shortcuts">
					<div className="space-y-2 text-xs">
						{[
							["j / k", "Navigate between changes"],
							["n / p", "Next / previous file"],
							["Esc", "Close modals"],
						].map(([key, desc]) => (
							<div key={key} className="flex items-center justify-between">
								<span className="text-gray-400">{desc}</span>
								<kbd className="px-2 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-gray-300 font-mono">
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
