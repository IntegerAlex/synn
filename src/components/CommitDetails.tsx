'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { useCommitDetails } from '@/hooks/useGitData';
import { useAppStore } from '@/store/useAppStore';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { highlightUnifiedDiffLines } from '@/lib/utils/diffHighlighter';
import { Toast } from '@/components/ui/Toast';
import { Copy, ExternalLink } from 'lucide-react';
import { CommitFileTree } from '@/components/CommitDetails/FileTree';

function getGitHubCommitUrl(repoPath: string | undefined | null, hash: string): string | null {
    if (!repoPath) return null;
    // GitHub mode uses repoFullName as RepoInfo.path (e.g. "owner/name")
    if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoPath)) {
        return `https://github.com/${repoPath}/commit/${hash}`;
    }
    return null;
}

export function CommitDetails() {
    const selectedHash = useAppStore((state) => state.selectedCommitHash);
    const setSelectedCommitHash = useAppStore((state) => state.setSelectedCommitHash);
    const repoInfo = useAppStore((state) => state.repoInfo);
    const { data: details, isLoading, error } = useCommitDetails(selectedHash);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [showFullDiff, setShowFullDiff] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const toastTimeoutRef = useRef<number | null>(null);

    // Parse diff by file
    const fileDiffs = useMemo(() => {
        if (!details?.diff) return new Map<string, string>();
        
        const diffs = new Map<string, string>();
        const lines = details.diff.split('\n');
        let currentFile: string | null = null;
        let currentDiff: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this is a new file diff header
            if (line.startsWith('diff --git')) {
                // Save previous file diff
                if (currentFile && currentDiff.length > 0) {
                    diffs.set(currentFile, currentDiff.join('\n'));
                }
                
                // Extract file path from "diff --git a/path b/path" or "diff --git a/path b/newpath"
                // Handle cases with spaces in paths: "diff --git a/path with spaces b/path with spaces"
                const match = line.match(/diff --git (?:a\/|"a\/)(.+?)(?:\s+b\/|" b\/")(.+?)(?:"|$)/);
                if (match) {
                    // Use the 'b' path (new file path) as the key, remove quotes if present
                    currentFile = match[2].trim().replace(/^"|"$/g, '');
                    currentDiff = [line];
                } else {
                    // Fallback: try simpler pattern
                    const simpleMatch = line.match(/b\/(.+?)(?:\s|$)/);
                    if (simpleMatch) {
                        currentFile = simpleMatch[1].trim();
                        currentDiff = [line];
                    } else {
                        currentFile = null;
                        currentDiff = [];
                    }
                }
            } else if (currentFile) {
                // Continue collecting lines for current file
                currentDiff.push(line);
            }
        }
        
        // Save last file diff
        if (currentFile && currentDiff.length > 0) {
            diffs.set(currentFile, currentDiff.join('\n'));
        }
        
        return diffs;
    }, [details?.diff]);

    // Get the diff to display (selected file or full diff)
    const displayDiff = useMemo(() => {
        if (!details?.diff) return null;
        
        if (selectedFile) {
            // Try exact match first
            if (fileDiffs.has(selectedFile)) {
                return fileDiffs.get(selectedFile) || null;
            }
            
            // Try to find by filename (last part of path)
            const fileName = selectedFile.split('/').pop();
            for (const [filePath, diff] of fileDiffs.entries()) {
                if (filePath.endsWith(selectedFile) || filePath.split('/').pop() === fileName) {
                    return diff;
                }
            }
        }
        
        return details.diff;
    }, [details?.diff, selectedFile, fileDiffs]);

    // Optimized click handler - prevents performance violations
    const handleFileClick = useCallback((filePath: string, e?: React.MouseEvent) => {
        // Prevent event bubbling to avoid unnecessary re-renders
        e?.stopPropagation();
        e?.preventDefault();
        
        // Use requestAnimationFrame to defer state update and avoid blocking the main thread
        // This prevents the "click handler took Xms" violation
        requestAnimationFrame(() => {
            setSelectedFile(prev => prev === filePath ? null : filePath);
            setShowFullDiff(true); // Auto-expand when selecting a file
        });
    }, []);

    const showToast = useCallback((message: string) => {
        setToast(message);
        if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2000);
    }, []);

    const copyToClipboard = useCallback(async (text: string, successMessage: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage);
        } catch {
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) showToast(successMessage);
                else showToast('Copy failed');
            } catch {
                showToast('Copy failed');
            }
        }
    }, [showToast]);

    if (!selectedHash) {
        return (
            <aside className="w-80 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col">
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                    Select a commit to view details
                </div>
            </aside>
        );
    }

    if (isLoading) {
        return (
            <aside className="w-80 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
                </div>
            </aside>
        );
    }

    if (error || !details) {
        return (
            <aside className="w-80 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col">
                <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
                    Failed to load commit details
                </div>
            </aside>
        );
    }

    return (
        <aside className="w-80 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col relative">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">Commit Details</h2>
                <button
                    onClick={() => setSelectedCommitHash(null)}
                    className="text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Commit info */}
                <div className="p-4 border-b border-[#30363d]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs font-mono text-[#ef4444]">
                            {details.shortHash}
                        </span>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(details.hash, 'Copied commit hash')}
                            className="p-1 rounded hover:bg-[#21262d] transition-colors"
                            aria-label="Copy commit hash"
                            title="Copy commit hash"
                        >
                            <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                        {getGitHubCommitUrl(repoInfo?.path, details.hash) && (
                            <a
                                href={getGitHubCommitUrl(repoInfo?.path, details.hash)!}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded hover:bg-[#21262d] transition-colors"
                                aria-label="Open commit on GitHub"
                                title="Open commit on GitHub"
                            >
                                <ExternalLink className="w-4 h-4 text-gray-400" />
                            </a>
                        )}
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-gray-200 font-medium">{details.message}</p>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(details.message, 'Copied commit message')}
                            className="p-1 rounded hover:bg-[#21262d] transition-colors shrink-0"
                            aria-label="Copy commit message"
                            title="Copy commit message"
                        >
                            <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>
                    {details.body && (
                        <p className="text-xs text-gray-400 whitespace-pre-wrap">{details.body}</p>
                    )}
                </div>

                <CollapsibleSection title="Author">
                    <div className="text-sm text-gray-200">{details.author.name}</div>
                    <div className="text-xs text-gray-400">{details.author.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {new Date(details.date).toLocaleString()}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Changes">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#3fb950]">+{details.stats.additions}</span>
                        <span className="text-[#f85149]">-{details.stats.deletions}</span>
                        <span className="text-gray-400">{details.stats.totalFiles} files</span>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Files Changed" defaultCollapsed={false}>
                    <CommitFileTree
                        files={details.files}
                        selectedFile={selectedFile}
                        onSelectFile={(path) => handleFileClick(path)}
                    />
                </CollapsibleSection>

                {/* Diff */}
                {displayDiff && (
                    <CollapsibleSection
                        title={selectedFile ? `Diff: ${selectedFile.split('/').pop()}` : 'Diff'}
                        right={
                            <div className="flex items-center gap-2">
                                {selectedFile && (
                                    <button
                                        onClick={() => setSelectedFile(null)}
                                        className="text-xs text-gray-400 hover:text-gray-300"
                                    >
                                        Show All Files
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowFullDiff(!showFullDiff)}
                                    className="text-xs text-[#ef4444] hover:text-[#f87171]"
                                >
                                    {showFullDiff ? 'Show Summary' : 'Show Full Diff'}
                                </button>
                            </div>
                        }
                    >
                        <div className="bg-[#0d1117] border border-[#30363d] rounded overflow-hidden">
                            <div className="text-xs font-mono p-3 overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed">
                                {renderDiff(displayDiff, showFullDiff, selectedFile ?? undefined)}
                            </div>
                        </div>
                    </CollapsibleSection>
                )}
            </div>

            {/* Toast */}
            <div className="pointer-events-none absolute bottom-4 left-4 right-4">
                <Toast message={toast} onClose={() => setToast(null)} />
            </div>
        </aside>
    );
}

function renderDiff(diff: string, showFull: boolean, filePathHint?: string): React.ReactNode {
    if (!diff) return null;

    const lines = diff.split('\n');
    const displayLines = showFull ? lines : lines.slice(0, 50);
    const hasMore = !showFull && lines.length > 50;

    const highlighted = highlightUnifiedDiffLines(displayLines.join('\n'), filePathHint);

    return (
        <>
            {highlighted.map((line, idx) => (
                <div key={idx} className={`${line.className} whitespace-pre`}>
                    {line.prefix ? (
                        <span className="select-none text-gray-600">{line.prefix}</span>
                    ) : null}
                    <span
                        dangerouslySetInnerHTML={{
                            __html: line.html && line.html.length > 0 ? line.html : '&nbsp;',
                        }}
                    />
                    </div>
            ))}
            {hasMore && (
                <div className="text-gray-500 italic mt-2">
                    ... ({lines.length - 50} more lines, click "Show Full Diff" to see all)
                </div>
            )}
        </>
    );
}
