'use client';

import { useState, useMemo, useCallback } from 'react';
import { useCommitDetails } from '@/hooks/useGitData';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCommitHash } from '@/store/slices/appSlice';

export function CommitDetails() {
    const dispatch = useAppDispatch();
    const selectedHash = useAppSelector((state) => state.app.selectedCommitHash);
    const { data: details, isLoading, error } = useCommitDetails(selectedHash);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [showFullDiff, setShowFullDiff] = useState(false);

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
                    <div className="w-5 h-5 border-2 border-t-transparent border-[#58a6ff] rounded-full animate-spin" />
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
        <aside className="w-80 h-full bg-[#161b22] border-l border-[#30363d] flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">Commit Details</h2>
                <button
                    onClick={() => dispatch(setSelectedCommitHash(null))}
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
                        <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs font-mono text-[#58a6ff]">
                            {details.shortHash}
                        </span>
                    </div>
                    <p className="text-sm text-gray-200 font-medium mb-2">{details.message}</p>
                    {details.body && (
                        <p className="text-xs text-gray-400 whitespace-pre-wrap">{details.body}</p>
                    )}
                </div>

                {/* Author info */}
                <div className="px-4 py-3 border-b border-[#30363d]">
                    <div className="text-xs text-gray-500 mb-1">Author</div>
                    <div className="text-sm text-gray-200">{details.author.name}</div>
                    <div className="text-xs text-gray-400">{details.author.email}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {new Date(details.date).toLocaleString()}
                    </div>
                </div>

                {/* Stats */}
                <div className="px-4 py-3 border-b border-[#30363d]">
                    <div className="text-xs text-gray-500 mb-2">Changes</div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#3fb950]">+{details.stats.additions}</span>
                        <span className="text-[#f85149]">-{details.stats.deletions}</span>
                        <span className="text-gray-400">{details.stats.totalFiles} files</span>
                    </div>
                </div>

                {/* Files */}
                <div className="px-4 py-3 border-b border-[#30363d]">
                    <div className="text-xs text-gray-500 mb-2">Files Changed</div>
                    <div className="space-y-1">
                        {details.files.map((file) => {
                            const isSelected = selectedFile === file.path;
                            return (
                                <div
                                    key={file.path}
                                    className={`flex items-center gap-2 text-xs py-1 cursor-pointer rounded px-1 transition-colors ${
                                        isSelected 
                                            ? 'bg-[#1f6feb] text-white' 
                                            : 'hover:bg-[#21262d]'
                                    }`}
                                    onClick={(e) => handleFileClick(file.path, e)}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${file.status === 'added' ? 'bg-[#3fb950]' :
                                            file.status === 'deleted' ? 'bg-[#f85149]' :
                                                'bg-[#d29922]'
                                        }`} />
                                    <span className={`truncate flex-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                        {file.path}
                                    </span>
                                    <span className={`ml-auto ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                                        +{file.additions} -{file.deletions}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Diff */}
                {displayDiff && (
                    <div className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-xs text-gray-500">
                                {selectedFile ? `Diff: ${selectedFile.split('/').pop()}` : 'Diff'}
                            </div>
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
                                    className="text-xs text-[#58a6ff] hover:text-[#79c0ff]"
                                >
                                    {showFullDiff ? 'Show Summary' : 'Show Full Diff'}
                                </button>
                            </div>
                        </div>
                        <div className="bg-[#0d1117] border border-[#30363d] rounded overflow-hidden">
                            <div className="text-xs font-mono p-3 overflow-x-auto max-h-[400px] overflow-y-auto leading-relaxed">
                                {renderDiff(displayDiff, showFullDiff)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

function renderDiff(diff: string, showFull: boolean): React.ReactNode {
    if (!diff) return null;

    const lines = diff.split('\n');
    const displayLines = showFull ? lines : lines.slice(0, 50);
    const hasMore = !showFull && lines.length > 50;

    return (
        <>
            {displayLines.map((line, idx) => {
                const isAdded = line.startsWith('+') && !line.startsWith('+++');
                const isRemoved = line.startsWith('-') && !line.startsWith('---');
                const isHeader = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@');
                
                let className = 'text-gray-300';
                if (isAdded) className = 'text-[#3fb950]';
                else if (isRemoved) className = 'text-[#f85149]';
                else if (isHeader) className = 'text-[#58a6ff]';
                else if (line.trim() === '') className = 'text-gray-600';

                return (
                    <div key={idx} className={className}>
                        {line || ' '}
                    </div>
                );
            })}
            {hasMore && (
                <div className="text-gray-500 italic mt-2">
                    ... ({lines.length - 50} more lines, click "Show Full Diff" to see all)
                </div>
            )}
        </>
    );
}
