"use client";

import { memo } from "react";
import { useRepoInsights } from "@/hooks/useGitHubData";
import {
	Star,
	GitFork,
	Eye,
	AlertCircle,
	Scale,
	Calendar,
	Code,
	Users,
	Activity,
	Package,
} from "lucide-react";

const MAX_DISPLAYED_COMMITS = 15;

const LANGUAGE_COLORS: Record<string, string> = {
	TypeScript: "#3178c6",
	JavaScript: "#f1e05a",
	Python: "#3572A5",
	Java: "#b07219",
	Go: "#00ADD8",
	Rust: "#dea584",
	Ruby: "#701516",
	PHP: "#4F5D95",
	"C++": "#f34b7d",
	C: "#555555",
	"C#": "#178600",
	Swift: "#F05138",
	Kotlin: "#A97BFF",
	Dart: "#00B4AB",
	HTML: "#e34c26",
	CSS: "#563d7c",
	Shell: "#89e051",
	Dockerfile: "#384d54",
	SCSS: "#c6538c",
	Vue: "#41b883",
	Svelte: "#ff3e00",
};

const StatCard = memo(function StatCard({
	icon: Icon,
	label,
	value,
	color,
}: {
	icon: any;
	label: string;
	value: string | number;
	color: string;
}) {
	return (
		<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
			<div className="flex items-center gap-2 mb-1">
				<Icon className={`w-4 h-4 ${color}`} />
				<span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
			</div>
			<div className="text-2xl font-bold text-gray-200">{value}</div>
		</div>
	);
});

const LanguageBar = memo(function LanguageBar({ languages }: { languages: Array<{ name: string; percentage: number }> }) {
	return (
		<div className="space-y-3">
			<div className="flex h-2 rounded-full overflow-hidden bg-[#21262d]">
				{languages.map((lang) => (
					<div
						key={lang.name}
						className="h-full"
						style={{
							width: `${lang.percentage}%`,
							backgroundColor: LANGUAGE_COLORS[lang.name] || "#8b949e",
						}}
						title={`${lang.name}: ${lang.percentage}%`}
					/>
				))}
			</div>
			<div className="flex flex-wrap gap-3">
				{languages.map((lang) => (
					<div key={lang.name} className="flex items-center gap-1.5 text-xs">
						<span
							className="w-3 h-3 rounded-full"
							style={{ backgroundColor: LANGUAGE_COLORS[lang.name] || "#8b949e" }}
						/>
						<span className="text-gray-300 font-medium">{lang.name}</span>
						<span className="text-gray-500">{lang.percentage}%</span>
					</div>
				))}
			</div>
		</div>
	);
});

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatSize(kilobytes: number): string {
	if (kilobytes < 1024) return `${kilobytes} KB`;
	if (kilobytes < 1024 * 1024) return `${(kilobytes / 1024).toFixed(1)} MB`;
	return `${(kilobytes / (1024 * 1024)).toFixed(1)} GB`;
}

export function InsightsTab() {
	const { data, isLoading, error } = useRepoInsights();
	const insights = data?.data;

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center bg-[#0d1117]">
				<div className="animate-spin h-6 w-6 border-2 border-gray-500 border-t-white rounded-full" />
			</div>
		);
	}

	if (error || !insights) {
		return (
			<div className="h-full flex flex-col items-center justify-center bg-[#0d1117] text-gray-500">
				<Activity className="w-8 h-8 mb-2" />
				<p className="text-sm">Failed to load insights</p>
			</div>
		);
	}

	const { repo, languages, contributors, recent_commits } = insights;

	return (
		<div className="h-full overflow-y-auto bg-[#0d1117] p-6">
			<div className="max-w-4xl mx-auto space-y-6">
				{/* Repository Description */}
				{repo.description && (
					<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
						<p className="text-gray-300 text-sm">{repo.description}</p>
						{repo.topics && repo.topics.length > 0 && (
							<div className="flex flex-wrap gap-2 mt-3">
								{repo.topics.map((topic) => (
									<span
										key={topic}
										className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/50"
									>
										{topic}
									</span>
								))}
							</div>
						)}
					</div>
				)}

				{/* Stats Grid */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<StatCard icon={Star} label="Stars" value={repo.stars} color="text-yellow-500" />
					<StatCard icon={GitFork} label="Forks" value={repo.forks} color="text-blue-400" />
					<StatCard icon={Eye} label="Watchers" value={repo.watchers} color="text-green-400" />
					<StatCard
						icon={AlertCircle}
						label="Open Issues"
						value={repo.open_issues}
						color="text-orange-400"
					/>
				</div>

				{/* Additional Info */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<StatCard
						icon={Package}
						label="Size"
						value={formatSize(repo.size)}
						color="text-purple-400"
					/>
					<StatCard
						icon={Scale}
						label="License"
						value={repo.license || "None"}
						color="text-gray-400"
					/>
					<StatCard
						icon={Code}
						label="Default Branch"
						value={repo.default_branch}
						color="text-cyan-400"
					/>
					<StatCard
						icon={Calendar}
						label="Created"
						value={formatDate(repo.created_at)}
						color="text-pink-400"
					/>
				</div>

				{/* Languages */}
				{languages.length > 0 && (
					<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
						<h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
							<Code className="w-4 h-4" />
							Languages
						</h3>
						<LanguageBar languages={languages} />
					</div>
				)}

				{/* Contributors */}
				{contributors.length > 0 && (
					<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
						<h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
							<Users className="w-4 h-4" />
							Top Contributors
						</h3>
						<div className="space-y-2">
							{contributors.map((c) => (
								<div key={c.login} className="flex items-center gap-3 py-1.5">
									<img
										src={c.avatar_url}
										alt={c.login}
										className="w-8 h-8 rounded-full"
									/>
									<span className="text-sm text-gray-300 flex-1">{c.login}</span>
									<span className="text-xs text-gray-500">
										{c.contributions} commits
									</span>
									<div className="w-24 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
										<div
											className="h-full bg-green-500 rounded-full"
											style={{
												width: `${Math.min(100, (c.contributions / (contributors[0]?.contributions || 1)) * 100)}%`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Recent Commits */}
				{recent_commits.length > 0 && (
					<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
						<h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
							<Activity className="w-4 h-4" />
							Recent Activity
						</h3>
						<div className="space-y-1">
							{recent_commits.slice(0, MAX_DISPLAYED_COMMITS).map((commit, i) => (
								<div
									key={`${commit.sha}-${i}`}
									className="flex items-center gap-3 py-1.5 text-xs"
								>
									<code className="text-blue-400 font-mono">{commit.sha}</code>
									<span className="text-gray-500">{commit.author}</span>
									{commit.date && (
										<span className="text-gray-600 ml-auto">
											{formatDate(commit.date)}
										</span>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Repository Info */}
				<div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4">
					<h3 className="text-sm font-semibold text-gray-200 mb-3">Repository Info</h3>
					<dl className="grid grid-cols-2 gap-2 text-xs">
						<dt className="text-gray-500">Visibility</dt>
						<dd className="text-gray-300 capitalize">{repo.visibility}</dd>
						<dt className="text-gray-500">Last pushed</dt>
						<dd className="text-gray-300">{formatDate(repo.pushed_at)}</dd>
						<dt className="text-gray-500">Last updated</dt>
						<dd className="text-gray-300">{formatDate(repo.updated_at)}</dd>
						<dt className="text-gray-500">Issues enabled</dt>
						<dd className="text-gray-300">{repo.has_issues ? "Yes" : "No"}</dd>
						<dt className="text-gray-500">Wiki enabled</dt>
						<dd className="text-gray-300">{repo.has_wiki ? "Yes" : "No"}</dd>
						<dt className="text-gray-500">Archived</dt>
						<dd className="text-gray-300">{repo.archived ? "Yes" : "No"}</dd>
					</dl>
				</div>
			</div>
		</div>
	);
}
