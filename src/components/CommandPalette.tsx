"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { AppTab } from "@/store/useAppStore";
import { useSearch } from "@/hooks/useGitData";
import {
Search,
X,
Code,
AlertCircle,
GitPullRequest,
BarChart3,
Settings,
GitBranch,
GitCommit,
Tag,
Command,
} from "lucide-react";

interface PaletteItem {
id: string;
icon: any;
label: string;
description?: string;
action: () => void;
category: string;
}

export function CommandPalette() {
const [isOpen, setIsOpen] = useState(false);
const [query, setQuery] = useState("");
const [selectedIndex, setSelectedIndex] = useState(0);
const inputRef = useRef<HTMLInputElement>(null);
const listRef = useRef<HTMLDivElement>(null);

const repoInfo = useAppStore((state) => state.repoInfo);
const setActiveTab = useAppStore((state) => state.setActiveTab);
const setSelectedCommitHash = useAppStore((state) => state.setSelectedCommitHash);
const setSelectedBranch = useAppStore((state) => state.setSelectedBranch);

// Search git data when query is non-empty and repo is selected
const { data: searchResults } = useSearch(repoInfo ? query : "");

// Toggle palette with Cmd+K / Ctrl+K
useEffect(() => {
function handleKeyDown(e: KeyboardEvent) {
if ((e.metaKey || e.ctrlKey) && e.key === "k") {
e.preventDefault();
setIsOpen((prev) => !prev);
}
if (e.key === "Escape" && isOpen) {
e.preventDefault();
setIsOpen(false);
}
}
window.addEventListener("keydown", handleKeyDown);
return () => window.removeEventListener("keydown", handleKeyDown);
}, [isOpen]);

// Focus input when opened
useEffect(() => {
if (isOpen) {
setQuery("");
setSelectedIndex(0);
setTimeout(() => inputRef.current?.focus(), 50);
}
}, [isOpen]);

const close = useCallback(() => {
setIsOpen(false);
setQuery("");
}, []);

// Build items list
const items: PaletteItem[] = [];

// Tab navigation shortcuts
const tabs: Array<{ id: AppTab; label: string; icon: any }> = [
{ id: "code", label: "Go to Code", icon: Code },
{ id: "issues", label: "Go to Issues", icon: AlertCircle },
{ id: "pulls", label: "Go to Pull Requests", icon: GitPullRequest },
{ id: "insights", label: "Go to Insights", icon: BarChart3 },
{ id: "settings", label: "Go to Settings", icon: Settings },
];

for (const tab of tabs) {
if (!query || tab.label.toLowerCase().includes(query.toLowerCase())) {
items.push({
id: `tab-${tab.id}`,
icon: tab.icon,
label: tab.label,
category: "Navigation",
action: () => {
setActiveTab(tab.id);
close();
},
});
}
}

// Git search results
if (searchResults?.results) {
for (const result of searchResults.results) {
const icon =
result.type === "commit"
? GitCommit
: result.type === "branch"
? GitBranch
: Tag;
items.push({
id: `search-${result.id}`,
icon,
label: result.label,
description: result.description,
category:
result.type === "commit"
? "Commits"
: result.type === "branch"
? "Branches"
: "Tags",
action: () => {
if (result.type === "commit") {
setSelectedCommitHash(result.id);
setActiveTab("code");
} else if (result.type === "branch") {
setSelectedBranch(result.label);
setActiveTab("code");
}
close();
},
});
}
}

// Handle keyboard navigation
const handleKeyDown = (e: React.KeyboardEvent) => {
if (e.key === "ArrowDown") {
e.preventDefault();
setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
} else if (e.key === "ArrowUp") {
e.preventDefault();
setSelectedIndex((i) => Math.max(i - 1, 0));
} else if (e.key === "Enter" && items[selectedIndex]) {
e.preventDefault();
items[selectedIndex].action();
}
};

// Scroll selected item into view
useEffect(() => {
const list = listRef.current;
if (!list) return;
const selected = list.querySelector<HTMLElement>(
  `[data-index="${selectedIndex}"]`
);
if (selected) {
  selected.scrollIntoView({ block: "nearest" });
}
}, [selectedIndex]);

if (!isOpen) {
return null;
}

// Group items by category
const grouped = items.reduce<Record<string, PaletteItem[]>>((acc, item) => {
if (!acc[item.category]) acc[item.category] = [];
acc[item.category].push(item);
return acc;
}, {});

let flatIndex = 0;

return (
<div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
{/* Backdrop */}
<div
className="absolute inset-0 bg-black/60 backdrop-blur-sm"
onClick={close}
role="presentation"
/>

{/* Palette */}
<div className="relative w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden">
{/* Search input */}
<div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
<Search className="w-5 h-5 text-gray-500 flex-shrink-0" />
<input
ref={inputRef}
type="text"
value={query}
onChange={(e) => {
setQuery(e.target.value);
setSelectedIndex(0);
}}
onKeyDown={handleKeyDown}
placeholder="Search or jump to..."
className="flex-1 bg-transparent text-gray-200 text-sm placeholder-gray-500 focus:outline-none"
/>
<kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-xs text-gray-500 bg-[#21262d] rounded border border-[#30363d]">
Esc
</kbd>
</div>

{/* Results */}
<div ref={listRef} className="max-h-80 overflow-y-auto py-2">
{items.length === 0 ? (
<div className="px-4 py-8 text-center text-sm text-gray-500">
{query ? "No results found" : "Type to search..."}
</div>
) : (
Object.entries(grouped).map(([category, categoryItems]) => (
<div key={category}>
<div className="px-4 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
{category}
</div>
{categoryItems.map((item) => {
const currentIdx = flatIndex++;
const Icon = item.icon;
return (
<button
key={item.id}
type="button"
onClick={item.action}
onMouseEnter={() => setSelectedIndex(currentIdx)}
className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
selectedIndex === currentIdx
? "bg-[#21262d] text-white"
: "text-gray-300 hover:bg-[#21262d]"
}`}
>
<Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
<div className="flex-1 min-w-0">
<div className="text-sm truncate">{item.label}</div>
{item.description && (
<div className="text-xs text-gray-500 truncate">
{item.description}
</div>
)}
</div>
</button>
);
})}
</div>
))
)}
</div>

{/* Footer hint */}
<div className="flex items-center justify-between px-4 py-2 border-t border-[#30363d] text-xs text-gray-600">
<span className="flex items-center gap-1">
<Command className="w-3 h-3" />K to toggle
</span>
<span>↑↓ navigate · ↵ select</span>
</div>
</div>
</div>
);
}
