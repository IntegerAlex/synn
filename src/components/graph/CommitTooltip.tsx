'use client';

import { useRef, useEffect, useState } from 'react';
import type { GraphNode, GraphData } from '@/types/git';

interface CommitTooltipProps {
    node: GraphNode | null;
    graphData: GraphData | null;
    x: number;
    y: number;
    visible: boolean;
}

export function CommitTooltip({ node, graphData, x, y, visible }: CommitTooltipProps) {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: x + 15, top: y - 10, transform: 'translateY(-100%)' });

    // Get branch name for the node
    const getBranchName = (node: GraphNode): string | null => {
        if (!graphData || !node) return null;

        // First, try to get branch name from node refs
        if (node.refs && node.refs.length > 0) {
            for (const ref of node.refs) {
                const cleanRef = ref.replace('HEAD -> ', '').replace('origin/', '').replace('remote/', '').replace('tag: ', '').trim();
                if (cleanRef && !cleanRef.includes('tag:')) {
                    return cleanRef;
                }
            }
        }

        // Try to find branch by checking if this is the latest commit in its column
        // Find the latest commit (highest row) in this node's column
        const columnNodes = graphData.nodes.filter(n => n.column === node.column);
        if (columnNodes.length > 0) {
            const latestInColumn = columnNodes.reduce((latest, current) => 
                current.row < latest.row ? current : latest
            );
            
            // If this is the latest commit in the column, try to match with branches
            if (latestInColumn.hash === node.hash && node.column < graphData.branches.length) {
                return graphData.branches[node.column];
            }
        }

        return null;
    };

    // Adjust position to keep tooltip within viewport
    useEffect(() => {
        if (!visible || !node || !tooltipRef.current) return;

        const tooltip = tooltipRef.current;
        const rect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + 15;
        let top = y - 10;
        let transform = 'translateY(-100%)';

        // Adjust horizontal position if tooltip goes off right edge
        if (left + rect.width > viewportWidth) {
            left = x - rect.width - 15;
        }

        // Adjust horizontal position if tooltip goes off left edge
        if (left < 0) {
            left = 15;
        }

        // Adjust vertical position if tooltip goes off top edge
        if (top - rect.height < 0) {
            top = y + 15;
            transform = 'translateY(0)';
        }

        // Adjust vertical position if tooltip goes off bottom edge
        if (top + rect.height > viewportHeight) {
            top = viewportHeight - rect.height - 15;
        }

        setPosition({ left, top, transform });
    }, [x, y, visible, node]);

    if (!visible || !node) return null;

    // Format date
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div
            ref={tooltipRef}
            className="absolute pointer-events-none z-50 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl p-3 max-w-xs"
            style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
                transform: position.transform,
            }}
        >
            <div className="flex flex-col gap-1.5">
                {/* Hash and Branch */}
                <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-[#4FC3F7] font-semibold">
                        {node.shortHash}
                    </code>
                    {(() => {
                        const branchName = getBranchName(node);
                        if (branchName) {
                            return (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-[#1a3a4a] text-[#4FC3F7]">
                                    {branchName}
                                </span>
                            );
                        }
                        return null;
                    })()}
                    {node.refs.length > 0 && !getBranchName(node) && (
                        <span className="text-xs text-gray-400">
                            {node.refs[0].replace('HEAD -> ', '').replace('origin/', '').replace('remote/', '')}
                        </span>
                    )}
                </div>

                {/* Message */}
                <div className="text-sm text-gray-200 font-medium line-clamp-2">
                    {node.message}
                </div>

                {/* Author and Date */}
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{node.author}</span>
                    <span>•</span>
                    <span>{formatDate(node.date)}</span>
                </div>
            </div>

            {/* Arrow */}
            <div
                className="absolute left-0 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#30363d]"
                style={{ left: '15px' }}
            />
        </div>
    );
}

