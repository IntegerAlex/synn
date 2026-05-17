"use client";

import type cytoscape from "cytoscape";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import { useGraph } from "@/hooks/useGitData";
import { useAppStore } from "@/store/useAppStore";
import type { GraphData, GraphNode } from "@/types/git";
import { BranchesModal } from "./BranchesModal";
import { CommitActivityChart } from "./CommitActivityChart";
import { CommitsModal } from "./CommitsModal";
import { CommitTooltip } from "./CommitTooltip";
import { GraphFilters } from "./GraphFilters";
import { ShareButton } from "./ShareButton";

function normalizeBranchLabel(branch: string): string {
  return branch
    .replace("HEAD -> ", "")
    .replace("origin/", "")
    .replace("remote/", "")
    .replace("tag: ", "")
    .trim();
}

/**
 * Builds a set of all commit hashes that belong to the highlighted branches
 * by traversing from branch heads through parent commits
 */
function buildHighlightedCommitsSet(
  graphData: GraphData,
  highlightedBranches: Set<string>,
): Set<string> {
  const highlightedCommits = new Set<string>();
  if (highlightedBranches.size === 0) {
    return highlightedCommits;
  }

  // Create a map of commit hash -> node for quick lookup
  const hashToNode = new Map<string, GraphNode>();
  graphData.nodes.forEach((node) => {
    hashToNode.set(node.hash, node);
  });

  // Create a reverse map: normalized branch name -> branch head hash
  const branchNameToHead = new Map<string, string>();

  // First, try to use branchHeads if available
  if (graphData.branchHeads) {
    for (const [branchName, headHash] of Object.entries(
      graphData.branchHeads,
    )) {
      const normalizedBranch = normalizeBranchLabel(branchName);
      branchNameToHead.set(normalizedBranch, headHash);
      // Also store the original name in case it matches directly
      branchNameToHead.set(branchName, headHash);
    }
  }

  // Fallback: find branch heads from node refs if branchHeads is not available or incomplete
  for (const node of graphData.nodes) {
    if (node.refs && node.refs.length > 0) {
      for (const ref of node.refs) {
        if (ref.includes("tag:")) continue;
        const normalizedBranch = normalizeBranchLabel(ref);
        // Store both normalized and original ref
        if (
          highlightedBranches.has(normalizedBranch) &&
          !branchNameToHead.has(normalizedBranch)
        ) {
          branchNameToHead.set(normalizedBranch, node.hash);
        }
        if (highlightedBranches.has(ref) && !branchNameToHead.has(ref)) {
          branchNameToHead.set(ref, node.hash);
        }
      }
    }
  }

  // For each highlighted branch, traverse from its head commit
  for (const highlightedBranch of highlightedBranches) {
    const headHash = branchNameToHead.get(highlightedBranch);
    if (!headHash) continue;

    // Only traverse if the branch head exists in the current graph
    if (!hashToNode.has(headHash)) continue;

    // Traverse from branch head through all parent commits
    const visited = new Set<string>();
    const queue: string[] = [headHash];

    while (queue.length > 0) {
      const currentHash = queue.shift()!;
      if (visited.has(currentHash)) continue;
      visited.add(currentHash);
      highlightedCommits.add(currentHash);

      // Get the node and traverse to its parents
      const node = hashToNode.get(currentHash);
      if (node?.parentHashes) {
        for (const parentHash of node.parentHashes) {
          // Only traverse to parents that exist in the graph
          if (!visited.has(parentHash) && hashToNode.has(parentHash)) {
            queue.push(parentHash);
          }
        }
      }
    }
  }

  return highlightedCommits;
}

function nodeMatchesHighlightedBranches(
  node: GraphNode,
  highlightedCommits: Set<string>,
): boolean {
  return highlightedCommits.has(node.hash);
}

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
  const cyRef = useRef<cytoscape.Core | null>(null);
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
    const result = buildHighlightedCommitsSet(graphData, highlightedBranches);
    // Debug logging (remove in production)
    if (
      process.env.NODE_ENV === "development" &&
      highlightedBranches.size > 0
    ) {
      console.log("Highlight debug:", {
        highlightedBranches: Array.from(highlightedBranches),
        branchHeads: graphData.branchHeads,
        highlightedCommitsCount: result.size,
        totalNodes: graphData.nodes.length,
      });
    }
    return result;
  }, [graphData, highlightedBranches]);

  // Convert graph data to Cytoscape format
  const elements = useMemo(() => {
    if (!filteredGraphData || filteredGraphData.nodes.length === 0) return [];

    const laneWidth = 30;
    const rowHeight = 25;
    const paddingX = 50;
    const paddingY = 30;

    const dimMode = highlightedBranches.size > 0;
    const nodeIsHighlighted = new Map<string, boolean>();

    const nodes = filteredGraphData.nodes.map((node) => {
      const isHighlighted = dimMode
        ? nodeMatchesHighlightedBranches(node, highlightedCommits)
        : false;
      nodeIsHighlighted.set(node.hash, isHighlighted);
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
          __dim: dimMode ? "1" : "0",
          __highlight: isHighlighted ? "1" : "0",
        },
        position: {
          x: paddingX + node.column * laneWidth,
          y: paddingY + node.row * rowHeight,
        },
      };
    });

    const edges = filteredGraphData.edges.map((edge) => {
      const sourceNode = filteredGraphData.nodes.find(
        (n) => n.hash === edge.source,
      );
      const targetNode = filteredGraphData.nodes.find(
        (n) => n.hash === edge.target,
      );

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
        const _rowDiff = Math.abs(sourceNode.row - targetNode.row);

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
          __dim: dimMode ? "1" : "0",
          __highlight:
            dimMode &&
            (nodeIsHighlighted.get(edge.source) ||
              nodeIsHighlighted.get(edge.target))
              ? "1"
              : "0",
        },
      };
    });

    return [...nodes, ...edges];
  }, [filteredGraphData, highlightedBranches, highlightedCommits]);

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

  // Handle node click
  const handleNodeClick = useCallback(
    (evt: any) => {
      const node = evt.target;
      if (node.isNode()) {
        const hash = node.data("hash");
        setSelectedCommitHash(hash);
      }
    },
    [setSelectedCommitHash],
  );

  // Handle node hover
  const handleNodeMouseOver = useCallback(
    (evt: any) => {
      const node = evt.target;
      if (node.isNode() && graphData && cyRef.current) {
        const hash = node.data("hash");
        const source = filteredGraphData ?? graphData;
        const graphNode = source.nodes.find((n) => n.hash === hash);
        if (graphNode) {
          setHoveredNode(graphNode);
          setIsHoveringNode(true);

          // Get rendered position relative to viewport
          const renderedPos = node.renderedPosition();
          const container = cyRef.current.container();
          if (container) {
            const rect = container.getBoundingClientRect();
            setTooltipPosition({
              x: rect.left + renderedPos.x,
              y: rect.top + renderedPos.y,
            });
          }
        }
      }
    },
    [graphData, filteredGraphData],
  );

  const handleNodeMouseOut = useCallback(() => {
    setIsHoveringNode(false);
    setHoveredNode(null);
  }, []);

  // Update selection when Redux state changes
  useEffect(() => {
    if (!cyRef.current || !selectedCommitHash) return;

    const cy = cyRef.current;
    cy.nodes().forEach((node: any) => {
      if (node.data("hash") === selectedCommitHash) {
        node.select();
      } else {
        node.unselect();
      }
    });
  }, [selectedCommitHash]);

  // Apply layout and fit view
  useEffect(() => {
    if (!cyRef.current || !graphData || elements.length === 0) return;

    const cy = cyRef.current;

    // Use preset layout with manual positioning
    // Cytoscape will use the positions we set in elements
    cy.layout({
      name: "preset",
      fit: false,
      padding: 0,
    }).run();

    // Fit view after layout completes
    const timeout = setTimeout(() => {
      if (!cy.destroyed()) {
        try {
          cy.fit(cy.elements(), 50);
        } catch {
          // ignore fit errors
        }
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [elements, graphData]);

  // Add branch labels and render them on the graph
  useEffect(() => {
    if (!cyRef.current || !graphData) return;

    const cy = cyRef.current;

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

    // Prepare sorted nodes by row (row 0 = newest)
    const sortedNodes = cy.nodes().sort((a, b) => {
      const ra = a.data("row") ?? 0;
      const rb = b.data("row") ?? 0;
      return ra - rb;
    });

    // Attach labels to head nodes; if head missing (commit not in current graph),
    // fall back to the newest node (row 0) so the branch still shows a label.
    branchEntries.forEach(({ branch, hash }) => {
      let cyNode: cytoscape.NodeSingular | undefined;
      const head = cy.getElementById(hash);
      if (head.length > 0) {
        cyNode = head[0] as cytoscape.NodeSingular;
      } else if (sortedNodes.length > 0) {
        cyNode = sortedNodes[0] as cytoscape.NodeSingular; // fallback to newest commit
      }
      if (!cyNode) return;

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
              <ShareButton graphLimit={graphLimit} />
            </>
          )}
        </div>
      </div>

      {/* Cytoscape Graph */}
      <div className="flex-1 relative overflow-hidden">
        <CytoscapeComponent
          elements={elements}
          style={{ width: "100%", height: "100%" }}
          stylesheet={stylesheet}
          cy={(cy) => {
            cyRef.current = cy;

            // Configure Cytoscape
            cy.boxSelectionEnabled(false);
            cy.userPanningEnabled(true);
            cy.userZoomingEnabled(true);
            cy.minZoom(0.1);
            cy.maxZoom(3);

            // Event handlers
            cy.on("tap", "node", handleNodeClick);
            cy.on("mouseover", "node", handleNodeMouseOver);
            cy.on("mouseout", "node", handleNodeMouseOut);

            cy.on("ready", () => {
              if (cy.destroyed()) return;
              try {
                cy.fit(cy.elements(), 50);
              } catch {
                // ignore fit errors
              }
            });
          }}
        />

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.zoom(cyRef.current.zoom() * 1.2);
              }
            }}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.zoom(cyRef.current.zoom() * 0.8);
              }
            }}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-gray-400" />
          </button>
          <div className="border-t border-[#30363d] my-1" />
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.fit(undefined, 50);
              }
            }}
            className="p-2 hover:bg-[#21262d] rounded transition-colors"
            title="Fit View"
          >
            <Maximize2 className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => {
              if (cyRef.current) {
                cyRef.current.reset();
                cyRef.current.fit(undefined, 50);
              }
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
    </div>
  );
}
