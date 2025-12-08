'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useGraph } from '@/hooks/useGitData';
import { useAppStore } from '@/store/useAppStore';
import { GraphRenderer, createPanZoomHandler, type ViewportState } from '@/lib/graph/GraphRenderer';
import { CommitTooltip } from './CommitTooltip';
import { CommitActivityChart } from './CommitActivityChart';
import type { GraphNode } from '@/types/git';

export function CanvasGraph() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<GraphRenderer | null>(null);
    const cleanupRef = useRef<(() => void) | null>(null);
    const lastDataKeyRef = useRef<string | null>(null);
    const pendingDataRef = useRef<{ nodes: any[]; edges: any[]; branches: string[]; currentBranch: string } | null>(null);

    // Local state
    const [isReady, setIsReady] = useState(false);
    const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1, width: 800, height: 600 });
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const [isHoveringNode, setIsHoveringNode] = useState(false);

    // Redux state
    const selectedCommitHash = useAppStore((state) => state.selectedCommitHash);
    const setSelectedCommitHash = useAppStore((state) => state.setSelectedCommitHash);
    const theme = useAppStore((state) => state.theme);

    // Always fetch all commits (use a very high limit)
    const { data: graphData, isLoading, error, refetch } = useGraph(10000);

    const isDark = useMemo(
        () => !['light', 'solarized-light'].includes(theme),
        [theme]
    );

    // Create renderer immediately when we have refs
    const ensureRenderer = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;

        if (!canvas || !container) {
            return false;
        }

        // If renderer already exists, just return true
        if (rendererRef.current) {
            return true;
        }

        const rect = container.getBoundingClientRect();
        const width = Math.max(rect.width, 100);
        const height = Math.max(rect.height, 100);

        // Create renderer
        rendererRef.current = new GraphRenderer(canvas, { isDark });
        console.log('[CanvasGraph] Created renderer:', width, 'x', height);

        const initialViewport: ViewportState = {
            x: 0,
            y: 0,
            zoom: 1,
            width,
            height,
        };

        rendererRef.current.setViewport(initialViewport);
        setViewport(initialViewport);

        // Setup pan/zoom handler
        if (!cleanupRef.current) {
            cleanupRef.current = createPanZoomHandler(
                canvas,
                (newViewport) => {
                    setViewport(prev => ({ ...prev, ...newViewport }));
                    rendererRef.current?.setViewport(newViewport);
                },
                () => rendererRef.current,
                initialViewport
            );
        }

        setIsReady(true);

        // Process any pending data (will be handled when graphData is available)
        // We can't process it here without branch info, so it will be handled in the graphData effect

        return true;
    }, [isDark]);

    // Initialize on mount via useEffect
    useEffect(() => {
        // Try to ensure renderer is ready
        const tryInit = () => {
            if (ensureRenderer()) {
                return;
            }
            // Retry if container not ready
            requestAnimationFrame(tryInit);
        };

        requestAnimationFrame(tryInit);

        return () => {
            cleanupRef.current?.();
            cleanupRef.current = null;
            rendererRef.current?.destroy();
            rendererRef.current = null;
            setIsReady(false);
        };
    }, [ensureRenderer]);

    // Handle graph data changes
    useEffect(() => {
        if (!graphData) return;

        // Generate a key to detect data changes
        const dataKey = `${graphData.nodes.length}-${graphData.nodes[0]?.hash || ''}`;
        if (lastDataKeyRef.current === dataKey) return;
        lastDataKeyRef.current = dataKey;

        console.log('[CanvasGraph] Data changed:', graphData.nodes.length, 'nodes');

        // Ensure renderer exists
        if (!rendererRef.current) {
            // Try to create it now
            if (!ensureRenderer()) {
                // Store data for later processing
                console.log('[CanvasGraph] Renderer not ready, storing data for later');
                pendingDataRef.current = { 
                    nodes: graphData.nodes, 
                    edges: graphData.edges,
                    branches: graphData.branches,
                    currentBranch: graphData.currentBranch,
                };
                return;
            }
        }

        // Process any pending data now that renderer is ready
        if (pendingDataRef.current) {
            const pending = pendingDataRef.current;
            pendingDataRef.current = null;
            console.log('[CanvasGraph] Processing pending data:', pending.nodes.length, 'nodes');
            if (rendererRef.current) {
                rendererRef.current.setLayout(
                    pending.nodes,
                    pending.edges,
                    {
                        branches: pending.branches || graphData.branches,
                        currentBranch: pending.currentBranch || graphData.currentBranch,
                    }
                );
                requestAnimationFrame(() => {
                    rendererRef.current?.forceRender();
                });
            }
            // Don't process current graphData if we just processed pending data
            return;
        }

        // Set layout
        console.log('[CanvasGraph] Setting layout');
        if (rendererRef.current) {
            rendererRef.current.setLayout(
                graphData.nodes,
                graphData.edges,
                {
                    branches: graphData.branches,
                    currentBranch: graphData.currentBranch,
                }
            );
        }

        // Force render
        requestAnimationFrame(() => {
            if (rendererRef.current) {
                rendererRef.current.forceRender();
                const newViewport = rendererRef.current.getViewport();
                setViewport(newViewport);
            }
        });
    }, [graphData, ensureRenderer]);

    // Handle resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && rendererRef.current) {
                rendererRef.current.setViewport({ width, height });
                setViewport(prev => ({ ...prev, width, height }));
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    // Update theme
    useEffect(() => {
        rendererRef.current?.updateConfig({ isDark });
    }, [isDark]);

    // Update selection
    useEffect(() => {
        rendererRef.current?.setSelected(selectedCommitHash);
    }, [selectedCommitHash]);

    // Handle click
    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!rendererRef.current || !canvasRef.current) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const hash = rendererRef.current.hitTest(
                e.clientX - rect.left,
                e.clientY - rect.top
            );

            setSelectedCommitHash(hash);
        },
        [setSelectedCommitHash]
    );

    // Handle mouse move for hover detection
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!rendererRef.current || !canvasRef.current || !graphData) return;

            const rect = canvasRef.current.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;

            const hash = rendererRef.current.hitTest(canvasX, canvasY);

            if (hash) {
                // Find the node data
                const node = graphData.nodes.find(n => n.hash === hash);
                if (node) {
                    setIsHoveringNode(true);
                    setHoveredNode(node);
                    setTooltipPosition({ x: e.clientX, y: e.clientY });
                    rendererRef.current.setHovered(hash);
                    // Change cursor to pointer
                    canvasRef.current.style.cursor = 'pointer';
                }
            } else {
                setIsHoveringNode(false);
                setHoveredNode(null);
                rendererRef.current.setHovered(null);
                // Reset cursor to grab
                if (canvasRef.current) {
                    canvasRef.current.style.cursor = 'grab';
                }
            }
        },
        [graphData]
    );

    // Handle mouse leave to clear hover state
    const handleMouseLeave = useCallback(() => {
        if (rendererRef.current) {
            rendererRef.current.setHovered(null);
        }
        setIsHoveringNode(false);
        setHoveredNode(null);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = 'grab';
        }
    }, []);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#0d1117] text-red-400">
                <p>Error loading graph</p>
                <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (isLoading && !graphData) {
        return (
            <div className="flex items-center justify-center h-full bg-[#0d1117]">
                <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
                    <span>Loading commit graph...</span>
                </div>
            </div>
        );
    }

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div className="flex items-center justify-center h-full bg-[#0d1117] text-gray-400">
                <span>No commits found</span>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#0d1117] flex flex-col">
            {/* Header */}
            <div className="flex-none z-10 flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="px-2 py-0.5 bg-[#238636]/20 text-[#3fb950] rounded text-xs font-medium">
                        {graphData.currentBranch}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{graphData.nodes.length} commits</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500">{graphData.branches.length} branches</span>
                </div>
                <div className="text-xs text-gray-500">
                    {isReady ? '✓ Ready' : '⏳'} | {viewport.width}x{viewport.height}
                </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 relative" ref={containerRef}>
                {/* Canvas */}
                <canvas
                    ref={canvasRef}
                    onClick={handleClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing bg-[#0d1117]"
                    style={{ touchAction: 'none' }}
                />

                {/* Commit Tooltip */}
                <CommitTooltip
                    node={hoveredNode}
                    graphData={graphData}
                    x={tooltipPosition.x}
                    y={tooltipPosition.y}
                    visible={isHoveringNode}
                />

                {/* Controls hint */}
                <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-[#0d1117]/80 px-2 py-1 rounded z-10">
                    Scroll to pan • Ctrl+Scroll to zoom • Click to select
                </div>
            </div>

            {/* Activity Chart */}
            <div className="flex-none h-32 border-t border-[#30363d] bg-[#161b22]">
                <div className="px-4 py-2 border-b border-[#30363d]">
                    <span className="text-xs font-medium text-gray-400">Commit Activity</span>
                </div>
                <div className="h-[calc(100%-28px)] p-2">
                    <CommitActivityChart nodes={graphData.nodes} />
                </div>
            </div>
        </div>
    );
}
