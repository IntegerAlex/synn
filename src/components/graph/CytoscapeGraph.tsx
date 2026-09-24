"use client";

import cytoscape from "cytoscape";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraph } from "@/hooks/useGitData";
import { buildHighlightedCommitsSet } from "@/lib/graph/highlightCommits";
import { useAppStore } from "@/store/useAppStore";
import type { GraphData, GraphNode } from "@/types/git";
import { BranchCompareDrawer } from "./BranchCompareDrawer";
import { BranchesModal } from "./BranchesModal";
import { CommitActivityChart } from "./CommitActivityChart";
import { CommitsModal } from "./CommitsModal";
import { CommitTooltip } from "./CommitTooltip";
import { GraphFilters } from "./GraphFilters";
import { ShareButton } from "./ShareButton";

// GitLens-style color palette
const BRANCH_COLORS = [
  "#4FC3F7", // main - light cyan
  "#7986CB", // indigo
  "#9575CD", // purple
  "#4DB6AC", // teal
  "#81C784", // green
  "#FFB74D", // orange
  "#F06292", // pink
  "#64B5F6", // blue
  "#A1887F", // brown
  "#90A4AE", // grey-blue
];

interface CytoscapeGraphProps {
  initialGraphLimit?: number;
  readOnly?: boolean;
  onGraphLimitChange?: (limit: number) => void;
  shareId?: string; // For shared views
}

export function CytoscapeGraph({
  initialGraphLimit,
  readOnly,
  onGraphLimitChange,
  shareId,
}: CytoscapeGraphProps = {}) {
  const [isCommitsModalOpen, setIsCommitsModalOpen] = useState(false);
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isCompareDrawerOpen, setIsCompareDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const didFitRef = useRef(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isHoveringNode, setIsHoveringNode] = useState(false);
  const [activityCollapsed, setActivityCollapsed] = useState(false);
  const [graphLimit, setGraphLimit] = useState(initialGraphLimit ?? 500);

  const handleGraphLimitChange = (newLimit: number) => {
    setGraphLimit(newLimit);
    onGraphLimitChange?.(newLimit);
  };

  const selectedCommitHash = useAppStore((state) => state.selectedCommitHash);
  const setSelectedCommitHash = useAppStore(
    (state) => state.setSelectedCommitHash,
  );
  const theme = useAppStore((state) => state.theme);
  const showMergeCommits = useAppStore(
    (state) => state.graphFilters.showMergeCommits,
  );
  const showTags = useAppStore((state) => state.graphFilters.showTags);
  const highlightedBranches = useAppStore(
    (state) => state.graphFilters.highlightedBranches,
  );
  const {
    data: graphData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useGraph(graphLimit, 0, shareId);

  const isDark = useMemo(
    () => !["light", "solarized-light"].includes(theme),
    [theme],
  );

  const filteredGraphData = useMemo((): GraphData | null => {
    if (!graphData) return null;

    const isMergeNode = (n: GraphNode) => (n.parentHashes?.length ?? 0) > 1;
    const isTagRef = (ref: string) => ref.includes("tag:");

    const nodes = graphData.nodes
      .filter((n) => (showMergeCommits ? true : !isMergeNode(n)))
      .map((n) => ({
        ...n,
        refs: showTags ? n.refs : (n.refs || []).filter((r) => !isTagRef(r)),
      }));

    const allowed = new Set(nodes.map((n) => n.hash));
    const edges = graphData.edges.filter((e) => {
      if (!allowed.has(e.source) || !allowed.has(e.target)) return false;
      if (!showMergeCommits && e.type === "merge") return false;
      return true;
    });

    return { ...graphData, nodes, edges };
  }, [graphData, showMergeCommits, showTags]);

  // Build set of highlighted commit hashes by traversing from branch heads
  const highlightedCommits = useMemo(() => {
    if (!graphData || highlightedBranches.size === 0) {
      return new Set<string>();
    }
    return buildHighlightedCommitsSet(graphData, highlightedBranches);
  }, [graphData, highlightedBranches]);

  // Index nodes by hash so edge/hover lookups are O(1) instead of O(N).
  const nodesByHash = useMemo(() => {
    const map = new Map<string, GraphNode>();
    const source = filteredGraphData ?? graphData;
    if (source) {
      for (const node of source.nodes) map.set(node.hash, node);
    }
    return map;
  }, [filteredGraphData, graphData]);

  // Convert graph data to Cytoscape format
  const elements = useMemo(() => {
    if (!filteredGraphData || filteredGraphData.nodes.length === 0) return [];

    const laneWidth = 30;
    const rowHeight = 25;
    const paddingX = 50;
    const paddingY = 30;

    const nodes = filteredGraphData.nodes.map((node) => {
      return {
        data: {
          id: node.hash,
          label: node.shortHash,
          hash: node.hash,
          shortHash: node.shortHash,
          message: node.message,
          author: node.author,
          date: node.date,
          column: node.column,
          row: node.row,
          refs: node.refs,
          color: node.color,
          __dim: "0",
          __highlight: "0",
        },
        position: {
          x: paddingX + node.column * laneWidth,
          y: paddingY + node.row * rowHeight,
        },
      };
    });

    const edges = filteredGraphData.edges.map((edge) => {
      const sourceNode = nodesByHash.get(edge.source);
      const targetNode = nodesByHash.get(edge.target);

      // Improved bezier curve control for merges
      let controlPointDistance = 0;
      let controlPointWeight = 0.5;

      if (
        sourceNode &&
        targetNode &&
        edge.sourceColumn !== undefined &&
        edge.targetColumn !== undefined
      ) {
        const sourceCol = edge.sourceColumn;
        const targetCol = edge.targetColumn;
        const colDiff = Math.abs(sourceCol - targetCol);

        if (edge.type === "merge") {
          // For merge edges, create a horizontal curve first, then vertical
          // Control point should be at the source column, mid-way vertically
          controlPointDistance = colDiff * laneWidth * 0.8;
          controlPointWeight = 0.3; // Closer to source for horizontal curve
        } else {
          // For normal edges, subtle curve
          controlPointDistance = colDiff * laneWidth * 0.3;
          controlPointWeight = 0.5;
        }
      }

      return {
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          color: edge.color,
          sourceColumn: edge.sourceColumn,
          targetColumn: edge.targetColumn,
          controlPointDistance,
          controlPointWeight,
          __dim: "0",
          __highlight: "0",
        },
      };
    });

    return [...nodes, ...edges];
  }, [filteredGraphData, nodesByHash]);

  // Handle node click
  const handleNodeClick = useCallback(
    (evt: cytoscape.EventObject) => {
      const node = evt.target as cytoscape.NodeSingular;
      if (node.isNode()) {
        setSelectedCommitHash(node.data("hash"));
      }
    },
    [setSelectedCommitHash],
  );

  // Handle node hover. Reads everything from the element data so the handler
  // is stable and never forces a re-render of the graph itself.
  const handleNodeMouseOver = useCallback((evt: cytoscape.EventObject) => {
    const node = evt.target as cytoscape.NodeSingular;
    if (!node.isNode() || !containerRef.current) return;

    const d = node.data();
    setHoveredNode({
      id: d.id,
      hash: d.hash,
      shortHash: d.shortHash,
      message: d.message,
      author: d.author,
      date: d.date,
      column: d.column,
      row: d.row,
      refs: d.refs,
      color: d.color,
    });
    setIsHoveringNode(true);

    const renderedPos = node.renderedPosition();
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + renderedPos.x,
      y: rect.top + renderedPos.y,
    });
  }, []);

  const handleNodeMouseOut = useCallback(() => {
    setIsHoveringNode(false);
    setHoveredNode(null);
  }, []);

  // Create the Cytoscape instance once. All interaction is driven imperatively
  // so hover/selection never re-patch the graph.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || cyRef.current) return;

    const cy = cytoscape({
      container,
      elements: [],
      boxSelectionEnabled: false,
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.2,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      // Viewport interaction performance: render a static texture while
      // panning/zooming so large graphs stay smooth.
      textureOnViewport: true,
      motionBlur: true,
      motionBlurOpacity: 0.2,
    });
    cyRef.current = cy;

    cy.on("tap", "node", handleNodeClick);
    cy.on("mouseover", "node", handleNodeMouseOver);
    cy.on("mouseout", "node", handleNodeMouseOut);

    const resizeObserver = new ResizeObserver(() => {
      if (cy.destroyed()) return;
      cy.resize();
      // The container is often 0-sized on first mount; fit once it has size.
      if (!didFitRef.current && cy.elements().length > 0) {
        cy.fit(cy.elements(), 50);
        didFitRef.current = true;
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cy.destroy();
      cyRef.current = null;
      didFitRef.current = false;
    };
  }, [handleNodeClick, handleNodeMouseOver, handleNodeMouseOut]);

  // Cytoscape stylesheet
  const stylesheet = useMemo(
    () => [
      {
        selector: "node",
        style: {
          "background-color": (ele: any) =>
            ele.data("color") || BRANCH_COLORS[0],
          width: 8,
          height: 8,
          shape: "ellipse",
          "border-width": 2,
          "border-color": isDark ? "#0d1117" : "#ffffff",
          label: (_ele: any) => "",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": "10px",
          color: isDark ? "#cccccc" : "#333333",
          "text-outline-width": 1,
          "text-outline-color": isDark ? "#0d1117" : "#ffffff",
          // Don't render text when zoomed out, and don't let labels swallow
          // pointer events (fewer hover events while panning).
          "min-zoomed-font-size": 8,
          "text-events": "no",
          "overlay-opacity": 0,
          "overlay-padding": 6,
        },
      },
      {
        selector: "node[branchLabel]",
        style: {
          label: "data(branchLabel)",
          "text-margin-x": 12,
          "text-margin-y": 0,
          "text-valign": "center",
          "text-halign": "left",
          "font-size": "10px",
          "font-weight": (ele: any) =>
            ele.data("branchLabelIsCurrent") ? "600" : "400",
          color: (ele: any) =>
            ele.data("branchLabelIsCurrent")
              ? "#4FC3F7"
              : isDark
                ? "#cccccc"
                : "#333333",
          "text-background-color": (ele: any) =>
            ele.data("branchLabelIsCurrent")
              ? isDark
                ? "#1a3a4a"
                : "#d0eaff"
              : isDark
                ? "#2d2d2d"
                : "#e0e0e0",
          "text-background-opacity": 0.9,
          "text-background-shape": "roundrectangle",
          "text-background-padding": "3px",
          "text-border-width": 1,
          "text-border-color": isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
          "text-wrap": "wrap",
          "text-max-width": "140px",
          "text-outline-width": 0,
        },
      },
      {
        selector: "node:selected",
        style: {
          "border-width": 3,
          "border-color": "#ef4444",
          width: 12,
          height: 12,
        },
      },
      {
        selector: 'node[__dim = "1"][__highlight = "0"]',
        style: {
          opacity: 0.18,
        },
      },
      {
        selector: 'node[__highlight = "1"]',
        style: {
          opacity: 1,
          "border-width": 3,
          "border-color": "#8ab4ff",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": (ele: any) => ele.data("color") || BRANCH_COLORS[0],
          "target-arrow-shape": "none", // No arrows for git graphs
          "curve-style": "bezier",
          "control-point-distances": (ele: any) => {
            const dist = ele.data("controlPointDistance") || 0;
            return `${dist}px`;
          },
          "control-point-weights": (ele: any) => {
            return ele.data("controlPointWeight") || 0.5;
          },
          opacity: 0.6,
        },
      },
      {
        selector: 'edge[__dim = "1"][__highlight = "0"]',
        style: {
          opacity: 0.08,
        },
      },
      {
        selector: 'edge[__highlight = "1"]',
        style: {
          opacity: 0.8,
          width: 2.5,
        },
      },
      {
        selector: 'edge[type = "merge"]',
        style: {
          opacity: 0.8,
          width: 2.5,
          "line-style": "solid",
        },
      },
    ],
    [isDark],
  );

  // Apply the stylesheet (and re-apply on theme change).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.style(stylesheet as unknown as cytoscape.StylesheetJson).update();
  }, [stylesheet]);

  // Sync elements whenever the data/filters change (not on hover/selection).
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;

    cy.batch(() => {
      cy.elements().remove();
      if (elements.length > 0) {
        cy.add(elements as cytoscape.ElementDefinition[]);
      }
    });

    if (elements.length === 0) return;

    cy.layout({ name: "preset", fit: false, padding: 0 }).run();

    const all = cy.elements();
    if (all.length === 0) return;

    // Defer the initial fit to the ResizeObserver if the container has no size yet.
    const container = containerRef.current;
    const hasSize =
      container != null &&
      container.clientWidth > 0 &&
      container.clientHeight > 0;

    if (didFitRef.current) {
      cy.animate({ fit: { eles: all, padding: 50 }, duration: 250 });
    } else if (hasSize) {
      cy.fit(all, 50);
      didFitRef.current = true;
    }
  }, [elements]);

  // Handle highlighting separately to avoid layout resets or flickering
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || !filteredGraphData) return;

    const dimMode = highlightedBranches.size > 0;

    cy.batch(() => {
      // Update nodes
      cy.nodes().forEach((node) => {
        const hash = node.data("hash");
        const isHighlighted = dimMode && highlightedCommits.has(hash);
        node.data("__dim", dimMode ? "1" : "0");
        node.data("__highlight", isHighlighted ? "1" : "0");
      });

      // Update edges
      cy.edges().forEach((edge) => {
        const source = edge.data("source");
        const target = edge.data("target");
        const isHighlighted =
          dimMode &&
          (highlightedCommits.has(source) || highlightedCommits.has(target));
        edge.data("__dim", dimMode ? "1" : "0");
        edge.data("__highlight", isHighlighted ? "1" : "0");
      });
    });
  }, [highlightedBranches, highlightedCommits, filteredGraphData]);

  // Update selection when the store changes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || !selectedCommitHash) return;

    cy.$("node:selected").unselect();
    const target = cy.getElementById(selectedCommitHash);
    if (target.length > 0) target.select();
  }, [selectedCommitHash]);

  // Add branch labels to head nodes
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed() || !graphData) return;

    // Clear existing label data on nodes
    cy.nodes().forEach((n) => {
      n.removeData("branchLabel");
      n.removeData("branchLabelIsCurrent");
    });

    // Build branch heads map: prefer branchHeads from API, fallback to refs on nodes
    const branchEntries: Array<{ branch: string; hash: string }> = [];

    if (graphData.branchHeads) {
      for (const [branch, hash] of Object.entries(graphData.branchHeads)) {
        branchEntries.push({ branch, hash });
      }
    } else {
      const source = filteredGraphData ?? graphData;
      source.nodes.forEach((node) => {
        if (node.refs && node.refs.length > 0) {
          node.refs.forEach((branch) => {
            branchEntries.push({ branch, hash: node.hash });
          });
        }
      });
    }

    // Attach labels to head nodes. If a branch head is outside the fetched
    // window it simply gets no label (rather than a misleading one on row 0).
    branchEntries.forEach(({ branch, hash }) => {
      const head = cy.getElementById(hash);
      if (head.length === 0) return;
      const cyNode = head[0] as cytoscape.NodeSingular;

      const isCurrentBranch = branch === graphData.currentBranch;
      // If multiple labels land on the same node, concatenate
      const existing = cyNode.data("branchLabel") as string | undefined;
      const existingCurrent = cyNode.data("branchLabelIsCurrent") as
        | boolean
        | undefined;

      const newLabel = existing ? `${existing}, ${branch}` : branch;
      const currentFlag = existingCurrent || isCurrentBranch;

      cyNode.data("branchLabel", newLabel);
      cyNode.data("branchLabelIsCurrent", currentFlag);
    });
  }, [graphData, filteredGraphData]);

  const zoomBy = (factor: number) => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.animate(
      { zoom: cy.zoom() * factor, duration: 150 },
      { easing: "ease-out" },
    );
  };

  const fitView = () => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.animate({ fit: { eles: cy.elements(), padding: 50 }, duration: 250 });
  };

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full bg-[#0d1117] text-red-400"
        role="status"
        aria-live="assertive"
      >
        <p>Error loading graph</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg"
          aria-label="Retry loading graph"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isLoading && !graphData) {
    return (
      <div
        className="flex items-center justify-center h-full bg-[#0d1117]"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
          <span>Loading commit graph...</span>
        </div>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full bg-[#0d1117] text-gray-400"
        role="status"
        aria-live="polite"
      >
        <span>No commits found</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-[#0d1117] flex flex-col"
      role="region"
      aria-label="Commit graph"
      aria-describedby="graph-stats"
    >
      {/* Header */}
      <div className="flex-none z-10 flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div
          className="flex items-center gap-2 text-sm text-gray-300"
          id="graph-stats"
        >
          <span className="px-2 py-0.5 bg-[#238636]/20 text-[#3fb950] rounded text-xs font-medium">
            {graphData.currentBranch}
          </span>
          <span className="text-gray-500">•</span>
          <button
            onClick={() => setIsCommitsModalOpen(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            title="View all commits"
          >
            {(filteredGraphData ?? graphData).nodes.length} commits
          </button>
          <span className="text-gray-500">•</span>
          <button
            onClick={() => setIsBranchesModalOpen(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
            title="View all branches"
          >
            {graphData.branches.length} branches
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              {graphData.hasMore ? (
                <button
                  type="button"
                  onClick={() =>
                    handleGraphLimitChange(Math.min(10000, graphLimit + 500))
                  }
                  className="px-2 py-1 rounded-md text-xs border border-[#30363d] hover:bg-[#21262d] text-gray-200 transition-colors"
                  disabled={isFetching}
                  title="Load more commits"
                  aria-label="Load more commits"
                >
                  {isFetching ? "Loading…" : "Load more"}
                </button>
              ) : (
                <span className="text-xs text-gray-500">All loaded</span>
              )}
              <GraphFilters
                branches={graphData.branches}
                currentBranch={graphData.currentBranch}
              />
              <button
                type="button"
                onClick={() => setIsCompareDrawerOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-[#30363d] bg-transparent text-gray-400 hover:bg-[#21262d] hover:text-gray-200 transition-colors"
                title="Compare branches"
                aria-label="Compare branches"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Compare
              </button>
              <ShareButton graphLimit={graphLimit} />
            </>
          )}
        </div>
      </div>

      {/* Cytoscape Graph */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
          <button
            onClick={() => zoomBy(1.2)}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => zoomBy(0.8)}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-400" />
          </button>
          <div className="border-t border-[#30363d] my-1" />
          <button
            onClick={fitView}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Fit View"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => {
              const cy = cyRef.current;
              if (!cy || cy.destroyed()) return;
              cy.reset();
              fitView();
            }}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Commit Tooltip */}
        <CommitTooltip
          node={hoveredNode}
          graphData={graphData}
          x={tooltipPosition.x}
          y={tooltipPosition.y}
          visible={isHoveringNode}
        />
      </div>

      {/* Activity Chart */}
      <div
        className={`flex-none border-t border-[#30363d] bg-[#161b22] transition-all duration-200 overflow-hidden ${
          activityCollapsed ? "h-10" : "h-32"
        }`}
      >
        <div className="px-4 py-2 border-b border-[#30363d] flex items-center justify-between">
          <span className="text-xs font-medium text-gray-400">
            Commit Activity
          </span>
          <button
            aria-label="Toggle commit activity"
            className="p-1.5 rounded hover:bg-[#21262d] transition-colors"
            onClick={() => setActivityCollapsed((prev) => !prev)}
          >
            {activityCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
        {!activityCollapsed && (
          <div className="h-[calc(100%-28px)] p-2 overflow-hidden min-h-0">
            <CommitActivityChart
              nodes={(filteredGraphData ?? graphData).nodes}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <CommitsModal
        isOpen={isCommitsModalOpen}
        onClose={() => setIsCommitsModalOpen(false)}
        totalCommits={(filteredGraphData ?? graphData).nodes.length}
      />
      <BranchesModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        totalBranches={graphData.branches.length}
      />
      <BranchCompareDrawer
        isOpen={isCompareDrawerOpen}
        onClose={() => setIsCompareDrawerOpen(false)}
        defaultBase={graphData.currentBranch}
      />
    </div>
  );
}
