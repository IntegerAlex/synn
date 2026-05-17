/**
 * High-performance Canvas2D Graph Renderer
 * Features:
 * - Virtual scrolling (only renders visible nodes)
 * - Path batching for edges
 * - GPU-accelerated transforms
 * - Cached layout positions
 * - Frame throttling
 */

import type { GraphEdge, GraphNode } from "@/types/git";

// GitLens-style professional muted color palette
// Main branch: cyan-blue, others: muted blues/violets
const LANE_COLORS = [
  "#4FC3F7", // main - light cyan (GitLens style)
  "#7986CB", // indigo - muted
  "#9575CD", // purple - muted
  "#4DB6AC", // teal - muted
  "#81C784", // green - muted
  "#FFB74D", // orange - muted
  "#F06292", // pink - muted
  "#64B5F6", // blue - muted
  "#A1887F", // brown - muted
  "#90A4AE", // grey-blue - muted
];

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

export interface RenderConfig {
  nodeRadius: number;
  laneWidth: number;
  rowHeight: number;
  fontSize: number;
  showLabels: boolean;
  showRefs: boolean;
  isDark: boolean;
}

export interface CachedLayout {
  nodes: Map<string, { x: number; y: number; color: string }>;
  edges: {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    color: string;
    isMerge: boolean;
    sourceHash: string;
    targetHash: string;
  }[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  branchLanes: Map<string, number>;
}

const DEFAULT_CONFIG: RenderConfig = {
  nodeRadius: 4, // Smaller nodes (GitLens uses 4-6px)
  laneWidth: 20, // Tighter lane spacing
  rowHeight: 24, // Tighter vertical spacing
  fontSize: 10, // Smaller labels
  showLabels: true,
  showRefs: true,
  isDark: true,
};

/**
 * Pre-calculate layout positions for all nodes and edges
 * This is cached and only recalculated when graph data changes
 */
export function calculateLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: RenderConfig = DEFAULT_CONFIG,
): CachedLayout {
  const nodeMap = new Map<string, { x: number; y: number; color: string }>();
  const edgeList: CachedLayout["edges"] = [];

  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  // Calculate node positions
  for (const node of nodes) {
    const x = node.column * config.laneWidth + 50;
    const y = node.row * config.rowHeight + 30;
    const color = LANE_COLORS[node.column % LANE_COLORS.length];

    nodeMap.set(node.hash, { x, y, color });

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  // Calculate edge paths
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);

    if (source && target) {
      edgeList.push({
        sx: source.x,
        sy: source.y,
        tx: target.x,
        ty: target.y,
        color: source.color,
        isMerge: edge.type === "merge",
        sourceHash: edge.source,
        targetHash: edge.target,
      });
    }
  }

  return {
    nodes: nodeMap,
    edges: edgeList,
    bounds: {
      minX: minX - 50,
      maxX: maxX + 200,
      minY: minY - 30,
      maxY: maxY + 50,
    },
    branchLanes: new Map(),
  };
}

/**
 * Determine which nodes are visible in the current viewport
 */
export function getVisibleNodes(
  layout: CachedLayout,
  viewport: ViewportState,
  _nodeRadius: number = 6,
): string[] {
  const visible: string[] = [];
  const padding = 200; // Extra padding for smooth scrolling

  // Calculate visible area in graph coordinates
  // Viewport transform: translate by viewport.x/y, then scale by zoom
  // To convert screen coords to graph coords: (screen - translate) / zoom
  const graphLeft = (-viewport.x - padding) / viewport.zoom;
  const graphRight = (-viewport.x + viewport.width + padding) / viewport.zoom;
  const graphTop = (-viewport.y - padding) / viewport.zoom;
  const graphBottom = (-viewport.y + viewport.height + padding) / viewport.zoom;

  console.debug("[GraphRenderer] getVisibleNodes() - Calculating visibility", {
    viewport: { ...viewport },
    graphBounds: {
      left: graphLeft,
      right: graphRight,
      top: graphTop,
      bottom: graphBottom,
    },
    totalNodes: layout.nodes.size,
  });

  for (const [hash, pos] of layout.nodes) {
    if (
      pos.x >= graphLeft &&
      pos.x <= graphRight &&
      pos.y >= graphTop &&
      pos.y <= graphBottom
    ) {
      visible.push(hash);
    }
  }

  console.debug("[GraphRenderer] getVisibleNodes() - Found visible nodes", {
    visible: visible.length,
    total: layout.nodes.size,
  });

  return visible;
}

/**
 * High-performance Canvas2D renderer with path batching
 */
export class GraphRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private layout: CachedLayout | null = null;
  private config: RenderConfig;
  private viewport: ViewportState;
  private animationFrameId: number | null = null;
  private isDirty = true;
  private lastRenderTime = 0;

  // Interaction state
  private selectedHash: string | null = null;
  private hoveredHash: string | null = null;
  private highlightedAncestry: Set<string> = new Set();
  private originalNodes: GraphNode[] = []; // Store for ref labels
  private branches: string[] = []; // Store branch names
  private currentBranch: string = ""; // Store current branch
  private isDestroyed = false;

  constructor(canvas: HTMLCanvasElement, config: Partial<RenderConfig> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;

    // Offscreen canvas for static content
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d")!;

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.viewport = {
      x: 0,
      y: 0,
      zoom: 1,
      width: canvas.width,
      height: canvas.height,
    };

    this.setupHiDPI();

    // Fill canvas with dark background immediately to prevent white flash
    // Do this after setupHiDPI in case it resizes the canvas
    // Use logical dimensions since context is already scaled by DPR
    this.ctx.fillStyle = "#0d1117";
    this.ctx.fillRect(0, 0, this.viewport.width, this.viewport.height);
  }

  private setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    // Use viewport dimensions if available, otherwise use rect
    const width = this.viewport.width || rect.width || 800;
    const height = this.viewport.height || rect.height || 600;

    // Set canvas internal size (scaled by DPR for crisp rendering)
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    // Reset transform and scale context
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    // Update offscreen canvas
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.offscreenCtx.scale(dpr, dpr);

    // Update viewport dimensions
    this.viewport.width = width;
    this.viewport.height = height;
  }

  setLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    branchInfo?: { branches: string[]; currentBranch: string },
  ) {
    if (this.isDestroyed) return;
    this.originalNodes = nodes; // Store for ref labels
    if (branchInfo) {
      this.branches = branchInfo.branches;
      this.currentBranch = branchInfo.currentBranch;
    }

    console.log("[GraphRenderer] setLayout() - Setting new layout", {
      nodes: nodes.length,
      edges: edges.length,
      viewport: { ...this.viewport },
    });

    // Clear previous layout
    const hadPreviousLayout = !!this.layout;

    this.layout = calculateLayout(nodes, edges, this.config);
    console.log("[GraphRenderer] setLayout() - Layout calculated", {
      nodes: this.layout.nodes.size,
      edges: this.layout.edges.length,
      bounds: this.layout.bounds,
    });

    this.isDirty = true;
    this.renderStaticLayer();

    // Auto-fit to content when layout changes (new data or limit change)
    if (this.layout && this.viewport.width && this.viewport.height) {
      // Always fit to content when layout changes to ensure visibility
      const fittedViewport = this.fitToContent(!hadPreviousLayout); // Animate only if there was previous layout

      // If fitToContent failed, ensure we still render with default viewport
      if (!fittedViewport) {
        console.warn(
          "[GraphRenderer] setLayout() - fitToContent failed, using default viewport",
        );
        // Fallback: set a reasonable default viewport
        this.setViewport({ x: 0, y: 0, zoom: 1 });
      } else {
        console.log(
          "[GraphRenderer] setLayout() - Viewport fitted",
          fittedViewport,
        );
      }
    } else {
      console.warn("[GraphRenderer] setLayout() - Cannot fit viewport", {
        hasLayout: !!this.layout,
        viewportWidth: this.viewport.width,
        viewportHeight: this.viewport.height,
      });
    }

    // Force immediate render - ensure graph is visible
    this.isDirty = true;
    this.scheduleRender();
  }

  /**
   * Fit viewport to show all content
   * Returns the target viewport state for external state management
   */
  fitToContent(animate: boolean = true): ViewportState | null {
    if (!this.layout || !this.viewport.width || !this.viewport.height) {
      console.warn(
        "[GraphRenderer] fitToContent() - Missing layout or viewport",
        {
          hasLayout: !!this.layout,
          viewportWidth: this.viewport.width,
          viewportHeight: this.viewport.height,
        },
      );
      return null;
    }

    const { bounds } = this.layout;

    // Ensure bounds are valid
    if (
      !Number.isFinite(bounds.minX) ||
      !Number.isFinite(bounds.maxX) ||
      !Number.isFinite(bounds.minY) ||
      !Number.isFinite(bounds.maxY)
    ) {
      console.warn("[GraphRenderer] fitToContent() - Invalid bounds", bounds);
      return null;
    }

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const viewportWidth = this.viewport.width;
    const viewportHeight = this.viewport.height;

    console.debug("[GraphRenderer] fitToContent() - Calculating", {
      bounds,
      contentSize: { width: contentWidth, height: contentHeight },
      viewportSize: { width: viewportWidth, height: viewportHeight },
    });

    // Handle edge case where content has zero size
    if (contentWidth <= 0 || contentHeight <= 0) {
      console.warn(
        "[GraphRenderer] fitToContent() - Zero content size, using default viewport",
      );
      // Default viewport if content is invalid
      const defaultViewport: ViewportState = {
        x: 0,
        y: 0,
        zoom: 1,
        width: viewportWidth,
        height: viewportHeight,
      };
      this.setViewport(defaultViewport);
      return defaultViewport;
    }

    // Calculate zoom to fit content with padding
    const padding = 50;
    const zoomX = (viewportWidth - padding * 2) / contentWidth;
    const zoomY = (viewportHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 2); // Cap zoom at 2x
    const finalZoom = Math.max(0.8, newZoom); // Minimum zoom of 0.8 for readability

    // Calculate center of content
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate pan to center the content
    const newX = viewportWidth / 2 - centerX * finalZoom;
    const newY = viewportHeight / 2 - centerY * finalZoom;

    const targetViewport: ViewportState = {
      x: newX,
      y: newY,
      zoom: finalZoom,
      width: this.viewport.width,
      height: this.viewport.height,
    };

    console.log("[GraphRenderer] fitToContent() - Target viewport", {
      target: targetViewport,
      animate,
      center: { x: centerX, y: centerY },
      zoom: { zoomX, zoomY, newZoom, finalZoom },
    });

    if (animate) {
      this.animateViewport(targetViewport, 500);
    } else {
      this.setViewport({ x: newX, y: newY, zoom: finalZoom });
      // Force immediate render after setting viewport
      this.isDirty = true;
      this.scheduleRender();
    }

    return targetViewport;
  }

  /**
   * Get current viewport state (for syncing with external state)
   */
  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  setViewport(viewport: Partial<ViewportState>) {
    // Separate dimension changes from position/zoom changes
    const hasDimensionChange =
      viewport.width &&
      viewport.height &&
      (viewport.width !== this.viewport.width ||
        viewport.height !== this.viewport.height);

    const hasPositionChange =
      viewport.x !== undefined ||
      viewport.y !== undefined ||
      viewport.zoom !== undefined;
    const positionChanged =
      hasPositionChange &&
      (viewport.x !== this.viewport.x ||
        viewport.y !== this.viewport.y ||
        viewport.zoom !== this.viewport.zoom);

    console.debug("[GraphRenderer] setViewport() - Updating viewport", {
      newViewport: viewport,
      currentViewport: { ...this.viewport },
      hasDimensionChange,
      hasPositionChange,
      positionChanged,
      hasLayout: !!this.layout,
    });

    // Only update dimensions if they actually changed
    if (hasDimensionChange) {
      this.viewport.width = viewport.width!;
      this.viewport.height = viewport.height!;
      // Setup HiDPI only when dimensions change
      this.setupHiDPI();
    }

    // Update position/zoom without triggering resize
    if (viewport.x !== undefined) this.viewport.x = viewport.x;
    if (viewport.y !== undefined) this.viewport.y = viewport.y;
    if (viewport.zoom !== undefined) this.viewport.zoom = viewport.zoom;

    // Always schedule render if layout is ready and something changed
    if (this.layout && (hasDimensionChange || positionChanged)) {
      this.isDirty = true;
      this.scheduleRender();
    } else if (!this.layout) {
      // Mark as dirty so it renders when layout is set
      this.isDirty = true;
    } else if (hasPositionChange) {
      // Even if position didn't technically change, ensure render if position was set
      this.isDirty = true;
      this.scheduleRender();
    }
  }

  setSelected(hash: string | null) {
    if (this.isDestroyed) return;
    this.selectedHash = hash;
    this.isDirty = true;
    this.scheduleRender();
  }

  setHovered(hash: string | null, ancestryHashes?: string[]) {
    if (this.isDestroyed) return;
    this.hoveredHash = hash;
    this.highlightedAncestry = new Set(ancestryHashes || []);
    this.isDirty = true;
    this.scheduleRender();
  }

  setHighlighted(hashes: Set<string>) {
    this.highlightedAncestry = hashes;
    this.isDirty = true;
    this.scheduleRender();
  }

  updateConfig(config: Partial<RenderConfig>) {
    this.config = { ...this.config, ...config };
    // Mark dirty to trigger re-render with new config
    this.isDirty = true;
    this.scheduleRender();
  }

  /**
   * Render static content to offscreen canvas (edges)
   * This is only called when layout changes
   */
  private renderStaticLayer() {
    if (!this.layout) return;

    const ctx = this.offscreenCtx;
    ctx.clearRect(
      0,
      0,
      this.offscreenCanvas.width,
      this.offscreenCanvas.height,
    );

    ctx.save();
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    // Batch edges by color for performance
    const edgesByColor = new Map<string, CachedLayout["edges"]>();

    for (const edge of this.layout.edges) {
      const existing = edgesByColor.get(edge.color) || [];
      existing.push(edge);
      edgesByColor.set(edge.color, existing);
    }

    // Draw edges in batches
    for (const [color, edges] of edgesByColor) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();

      for (const edge of edges) {
        ctx.moveTo(edge.sx, edge.sy);

        if (edge.isMerge || edge.sx !== edge.tx) {
          // Curved bezier for merges and cross-lane edges
          const midY = (edge.sy + edge.ty) / 2;
          ctx.bezierCurveTo(edge.sx, midY, edge.tx, midY, edge.tx, edge.ty);
        } else {
          // Straight line for same-lane edges
          ctx.lineTo(edge.tx, edge.ty);
        }
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Schedule a render on next animation frame with throttling
   */
  private scheduleRender() {
    if (this.isDestroyed) return;
    if (this.animationFrameId) {
      console.debug("[GraphRenderer] scheduleRender() - Already scheduled");
      return;
    }

    // Don't schedule render if layout isn't ready
    if (!this.layout) {
      console.debug(
        "[GraphRenderer] scheduleRender() - No layout, marking dirty",
      );
      this.isDirty = true; // Mark as dirty so it renders when layout is set
      return;
    }

    console.debug("[GraphRenderer] scheduleRender() - Scheduling render", {
      isDirty: this.isDirty,
      hasLayout: !!this.layout,
    });

    this.animationFrameId = requestAnimationFrame((timestamp) => {
      this.animationFrameId = null;
      if (this.isDestroyed) return;

      // Always render if dirty, don't throttle when layout changes
      if (this.isDirty && this.layout) {
        console.debug("[GraphRenderer] scheduleRender() - Executing render", {
          timestamp,
        });
        this.lastRenderTime = timestamp;
        this.render();
        this.isDirty = false;
      } else {
        console.debug("[GraphRenderer] scheduleRender() - Skipping render", {
          isDirty: this.isDirty,
          hasLayout: !!this.layout,
        });
      }
    });
  }

  /**
   * Public method to force a render (used for initial render after layout is set)
   */
  forceRender() {
    if (this.isDestroyed) return;
    if (this.layout) {
      this.isDirty = true;
      this.scheduleRender();
    }
  }

  /**
   * Main render method - only renders visible nodes
   */
  render() {
    if (!this.layout) {
      // Silently return if layout not ready - this is expected during initialization
      console.debug("[GraphRenderer] render() - No layout, skipping");
      return;
    }

    const ctx = this.ctx;

    // Use viewport dimensions directly - don't recalculate during render
    // This prevents flickering and position resets
    const width = this.viewport.width || 800;
    const height = this.viewport.height || 600;

    // Validate dimensions
    if (width <= 0 || height <= 0) {
      console.warn(
        "[GraphRenderer] render() - Invalid dimensions:",
        width,
        height,
      );
      return; // Can't render with invalid dimensions
    }

    // Validate layout has content
    if (this.layout.nodes.size === 0) {
      console.debug(
        "[GraphRenderer] render() - No nodes in layout, clearing canvas",
      );
      // Still clear canvas even if no nodes - always use dark background
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, width, height);
      return;
    }

    console.debug("[GraphRenderer] render() - Rendering", {
      nodes: this.layout.nodes.size,
      edges: this.layout.edges.length,
      viewport: { ...this.viewport },
      bounds: this.layout.bounds,
    });

    // Clear entire canvas - always use dark background
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, width, height);

    // Apply viewport transform - this is what allows panning/zooming
    ctx.save();
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    // Get visible nodes based on current viewport
    let visibleHashes = getVisibleNodes(
      this.layout,
      this.viewport,
      this.config.nodeRadius,
    );

    // If no visible nodes, check if viewport might be incorrectly positioned
    // This can happen on initial render before fitToContent completes
    if (visibleHashes.length === 0 && this.layout.nodes.size > 0) {
      // Check if viewport is at default position (0,0) - likely needs fitting
      const isDefaultViewport =
        this.viewport.x === 0 &&
        this.viewport.y === 0 &&
        this.viewport.zoom === 1;

      console.warn(
        "[GraphRenderer] render() - No visible nodes, using fallback",
        {
          isDefaultViewport,
          viewport: { ...this.viewport },
          totalNodes: this.layout.nodes.size,
        },
      );

      if (isDefaultViewport) {
        // Viewport hasn't been fitted yet - render all nodes to ensure visibility
        visibleHashes = Array.from(this.layout.nodes.keys());
      } else {
        // Viewport is set but no nodes visible - might be zoomed out too far or positioned wrong
        // Try rendering all nodes anyway to ensure something is visible
        visibleHashes = Array.from(this.layout.nodes.keys());
      }
    }

    console.debug("[GraphRenderer] render() - Drawing", {
      visibleNodes: visibleHashes.length,
      totalNodes: this.layout.nodes.size,
    });

    // Draw edges (render all edges for now - optimization can come later)
    this.renderEdges(ctx, visibleHashes);

    // Draw nodes
    this.renderNodes(ctx, visibleHashes);

    // Draw branch labels (GitLens-style)
    if (this.config.showRefs) {
      this.renderBranchLabels(ctx, visibleHashes);
      this.renderBranchHeadLabels(ctx, visibleHashes);
    }

    ctx.restore();
  }

  private renderEdges(ctx: CanvasRenderingContext2D, _visibleHashes: string[]) {
    if (!this.layout) return;

    // Render all edges (not filtered by visible hashes for now)
    // This ensures edges are visible even if viewport calculation is off

    console.debug("[GraphRenderer] renderEdges() - Rendering", {
      totalEdges: this.layout.edges.length,
      visibleHashes: _visibleHashes.length,
    });

    // Get DPR for proper line width scaling
    const dpr = window.devicePixelRatio || 1;

    // GitLens-style: thin, sharp, consistent-width lines
    ctx.lineCap = "square"; // Sharp ends, not rounded
    ctx.lineJoin = "miter"; // Sharp corners

    // If no branch is selected, show all edges normally
    const hasHighlights = this.highlightedAncestry.size > 0;

    for (const edge of this.layout.edges) {
      // Check if edge is part of highlighted branch
      // An edge is highlighted if either its source or target node is in the highlighted set
      const isHighlighted =
        !hasHighlights ||
        this.highlightedAncestry.has(edge.sourceHash) ||
        this.highlightedAncestry.has(edge.targetHash);

      ctx.strokeStyle = edge.color;

      // Thin lines with DPR scaling: ensure minimum 1.2px visible width
      // Base width: 2.5px highlighted, 2px normal
      const baseWidth = isHighlighted ? 2.5 : 2;
      ctx.lineWidth = Math.max(1.2, baseWidth / dpr);
      // Increase opacity for better visibility - was 0.2, now 0.6 for non-highlighted
      ctx.globalAlpha = isHighlighted ? 1 : 0.6;

      ctx.beginPath();
      ctx.moveTo(edge.sx, edge.sy);

      if (edge.isMerge || edge.sx !== edge.tx) {
        // GitLens-style merge curve: smooth bezier from source to target
        const verticalGap = edge.ty - edge.sy;

        // Control points for GitLens-style bezier
        const cp1x = edge.sx;
        const cp1y = edge.sy + verticalGap * 0.4;
        const cp2x = edge.tx;
        const cp2y = edge.ty - verticalGap * 0.4;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, edge.tx, edge.ty);
      } else {
        // Straight vertical line for same-lane edges
        ctx.lineTo(edge.tx, edge.ty);
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  private renderNodes(ctx: CanvasRenderingContext2D, visibleHashes: string[]) {
    if (!this.layout) return;

    console.debug("[GraphRenderer] renderNodes() - Rendering", {
      visibleNodes: visibleHashes.length,
      totalNodes: this.layout.nodes.size,
    });

    const { nodeRadius, isDark } = this.config;
    const _bgColor = isDark ? "#1e1e1e" : "#fafafa";

    // If no branch is selected, show all nodes normally
    const hasHighlights = this.highlightedAncestry.size > 0;

    for (const hash of visibleHashes) {
      const pos = this.layout.nodes.get(hash);
      if (!pos) continue;

      const isSelected = hash === this.selectedHash;
      const isHovered = hash === this.hoveredHash;
      const isHighlighted =
        !hasHighlights || this.highlightedAncestry.has(hash);

      // GitLens-style: small flat circles
      // - Stroke outline in lane color
      // - Filled only for HEAD/merge nodes or selection
      // - No glow effects

      const radius = isSelected ? nodeRadius + 1 : nodeRadius;
      const shouldFill = isSelected || isHovered;

      // Draw node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);

      // Apply opacity for non-highlighted nodes when branch is selected
      if (!isHighlighted && hasHighlights) {
        ctx.globalAlpha = 0.3;
      }

      if (shouldFill) {
        // Filled node for selected/hovered
        ctx.fillStyle = pos.color;
        ctx.fill();
      } else {
        // Hollow node with stroke - GitLens style
        // Make nodes more visible by using darker fill and thicker stroke
        ctx.fillStyle = "#0d1117"; // Use canvas background color for better contrast
        ctx.fill();
        ctx.strokeStyle = pos.color;
        ctx.lineWidth = isHighlighted ? 2.5 : 2; // Thicker stroke for better visibility
        ctx.stroke();
      }

      // Reset opacity
      if (!isHighlighted && hasHighlights) {
        ctx.globalAlpha = 1;
      }

      // Selection indicator: subtle outer ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = pos.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Hover: slightly larger with subtle highlight
      if (isHovered && !isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  /**
   * Render GitLens-style branch labels
   * Small rounded rectangles with dark background and light text
   */
  private renderBranchLabels(
    ctx: CanvasRenderingContext2D,
    visibleHashes: string[],
  ) {
    if (!this.layout) return;

    const { fontSize, isDark } = this.config;
    const visibleSet = new Set(visibleHashes);

    // Find nodes with refs in visible area
    for (const node of this.originalNodes) {
      if (!visibleSet.has(node.hash)) continue;
      if (!node.refs || node.refs.length === 0) continue;

      const pos = this.layout.nodes.get(node.hash);
      if (!pos) continue;

      // GitLens-style label styling
      const labelHeight = fontSize + 6;
      const labelPadding = 6;
      const labelGap = 4;
      const cornerRadius = 3;

      let labelX = pos.x + 12; // Start right of node

      for (const ref of node.refs) {
        // Skip empty refs
        if (!ref.trim()) continue;

        // Parse ref type
        const isHead = ref.includes("HEAD");
        const isRemote = ref.includes("origin/") || ref.includes("remote");
        const isTag = ref.includes("tag:");

        // Clean up label text
        let labelText = ref.replace("HEAD -> ", "").replace("tag: ", "");
        if (labelText.length > 20) {
          labelText = `${labelText.substring(0, 18)}…`;
        }

        // Measure text
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        const labelWidth = textWidth + labelPadding * 2 + (isHead ? 8 : 0);

        // GitLens-style colors
        let bgColor = isDark ? "#2d2d2d" : "#e0e0e0";
        let textColor = isDark ? "#cccccc" : "#333333";
        const iconColor = pos.color;

        if (isHead) {
          bgColor = isDark ? "#1a3a4a" : "#d0eaff";
          textColor = "#4FC3F7";
        } else if (isRemote) {
          bgColor = isDark ? "#2d3a2d" : "#d8f0d8";
          textColor = isDark ? "#81C784" : "#388E3C";
        } else if (isTag) {
          bgColor = isDark ? "#3d3a2d" : "#fff3cd";
          textColor = isDark ? "#FFB74D" : "#f57c00";
        }

        // Draw rounded rectangle background
        ctx.beginPath();
        ctx.roundRect(
          labelX,
          pos.y - labelHeight / 2,
          labelWidth,
          labelHeight,
          cornerRadius,
        );
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Draw subtle border
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw icon indicator (small circle for HEAD)
        if (isHead) {
          ctx.beginPath();
          ctx.arc(labelX + 8, pos.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = iconColor;
          ctx.fill();
        }

        // Draw text
        ctx.fillStyle = textColor;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(
          labelText,
          labelX + labelPadding + (isHead ? 8 : 0),
          pos.y,
        );

        // Move to next label position
        labelX += labelWidth + labelGap;
      }
    }
  }

  /**
   * Render branch names at branch heads (commits that are branch tips)
   */
  private renderBranchHeadLabels(
    ctx: CanvasRenderingContext2D,
    visibleHashes: string[],
  ) {
    if (!this.layout) return;

    const { fontSize, isDark } = this.config;
    const visibleSet = new Set(visibleHashes);

    // Collect all branch labels to render (commit hash -> branch names)
    const commitBranches = new Map<string, string[]>();

    // Use refs from nodes - these are populated from the API with actual branch names
    for (const node of this.originalNodes) {
      if (!visibleSet.has(node.hash)) continue;

      if (node.refs && node.refs.length > 0) {
        const branchNames: string[] = [];
        for (const ref of node.refs) {
          // Clean up ref name
          const cleanRef = ref
            .replace("HEAD -> ", "")
            .replace("origin/", "")
            .replace("remote/", "")
            .trim();
          if (cleanRef && !cleanRef.includes("tag:")) {
            branchNames.push(cleanRef);
          }
        }
        if (branchNames.length > 0) {
          commitBranches.set(node.hash, branchNames);
        }
      }
    }

    // Render labels for commits that have branch refs
    const labelHeight = fontSize + 6;
    const labelPadding = 6;
    const cornerRadius = 3;

    for (const [hash, branchNames] of commitBranches) {
      const pos = this.layout.nodes.get(hash);
      if (!pos) continue;

      let offsetX = 0;

      // Render each branch name as a separate label
      for (const branchName of branchNames) {
        // Measure text
        ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        const textWidth = ctx.measureText(branchName).width;
        const labelWidth = textWidth + labelPadding * 2;

        // Style based on whether it's the current branch
        const isCurrentBranch = branchName === this.currentBranch;
        let bgColor = isDark ? "#2d2d2d" : "#e0e0e0";
        let textColor = isDark ? "#cccccc" : "#333333";

        if (isCurrentBranch) {
          bgColor = isDark ? "#1a3a4a" : "#d0eaff";
          textColor = "#4FC3F7";
        }

        const labelX = pos.x + 12 + offsetX; // Start right of node with offset

        // Draw rounded rectangle background
        ctx.beginPath();
        ctx.roundRect(
          labelX,
          pos.y - labelHeight / 2,
          labelWidth,
          labelHeight,
          cornerRadius,
        );
        ctx.fillStyle = bgColor;
        ctx.fill();

        // Draw subtle border
        ctx.strokeStyle = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = textColor;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(branchName, labelX + labelPadding, pos.y);

        // Update offset for next label
        offsetX += labelWidth + 4;
      }
    }
  }

  /**
   * Find node at canvas coordinates
   */
  hitTest(canvasX: number, canvasY: number): string | null {
    if (!this.layout) return null;

    const graphX = (canvasX - this.viewport.x) / this.viewport.zoom;
    const graphY = (canvasY - this.viewport.y) / this.viewport.zoom;
    const hitRadius = this.config.nodeRadius + 4;

    for (const [hash, pos] of this.layout.nodes) {
      const dx = pos.x - graphX;
      const dy = pos.y - graphY;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return hash;
      }
    }

    return null;
  }

  /**
   * Get all ancestor hashes for a commit
   */
  getAncestry(_hash: string): string[] {
    if (!this.layout) return [];

    // This would need parent info from the graph data
    // For now return empty - would need to be populated from graph edge data
    return [];
  }

  /**
   * Calculate bounding box of highlighted commits
   */
  getHighlightedBounds(): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null {
    if (!this.layout || this.highlightedAncestry.size === 0) return null;

    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let hasNodes = false;

    for (const hash of this.highlightedAncestry) {
      const pos = this.layout.nodes.get(hash);
      if (pos) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        hasNodes = true;
      }
    }

    if (!hasNodes) return null;

    // Add padding
    const padding = 100;
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    };
  }

  /**
   * Fit viewport to show highlighted commits with animation
   * Returns the target viewport state for external state management
   */
  fitToHighlighted(animate: boolean = true): ViewportState | null {
    const bounds = this.getHighlightedBounds();
    if (!bounds || !this.viewport.width || !this.viewport.height) return null;

    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;
    const viewportWidth = this.viewport.width;
    const viewportHeight = this.viewport.height;

    // Calculate zoom to fit content with padding
    const zoomX = viewportWidth / contentWidth;
    const zoomY = viewportHeight / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 2); // Cap zoom at 2x

    // Calculate center of highlighted content
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    // Calculate pan to center the content
    const newX = viewportWidth / 2 - centerX * newZoom;
    const newY = viewportHeight / 2 - centerY * newZoom;

    const targetViewport: ViewportState = {
      x: newX,
      y: newY,
      zoom: newZoom,
      width: this.viewport.width,
      height: this.viewport.height,
    };

    if (animate) {
      // Animate to new viewport
      this.animateViewport(targetViewport, 500);
    } else {
      this.setViewport(targetViewport);
    }

    return targetViewport;
  }

  /**
   * Animate viewport transition
   */
  private animateViewport(target: ViewportState, duration: number = 500) {
    const startX = this.viewport.x;
    const startY = this.viewport.y;
    const startZoom = this.viewport.zoom;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const ease = 1 - (1 - progress) ** 3;

      const newX = startX + (target.x - startX) * ease;
      const newY = startY + (target.y - startY) * ease;
      const newZoom = startZoom + (target.zoom - startZoom) * ease;

      this.setViewport({ x: newX, y: newY, zoom: newZoom });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.layout = null;
    this.originalNodes = [];
  }
}

/**
 * Hook for pan/zoom with inertia - stabilized for smooth interaction
 * @param canvas - The canvas element
 * @param onViewportChange - Callback to notify React of viewport changes (for state sync)
 * @param getRenderer - Optional function to get the renderer for direct updates
 * @param initialViewport - Optional initial viewport state to sync with
 */
export function createPanZoomHandler(
  canvas: HTMLCanvasElement,
  onViewportChange: (viewport: Partial<ViewportState>) => void,
  getRenderer?: () => GraphRenderer | null,
  initialViewport?: Partial<ViewportState>,
) {
  let isDragging = false;
  let lastX = 0,
    lastY = 0;
  let velocityX = 0,
    velocityY = 0;
  const viewport = {
    x: initialViewport?.x ?? 0,
    y: initialViewport?.y ?? 0,
    zoom: initialViewport?.zoom ?? 1,
  };
  let inertiaFrame: number | null = null;

  // Debounce React state updates (for minimap, etc.)
  let stateUpdateTimeout: ReturnType<typeof setTimeout> | null = null;

  const scheduleStateUpdate = (update: Partial<ViewportState>) => {
    if (stateUpdateTimeout) clearTimeout(stateUpdateTimeout);
    stateUpdateTimeout = setTimeout(() => {
      onViewportChange(update);
      stateUpdateTimeout = null;
    }, 50); // Debounce React updates
  };

  // Apply viewport update directly to renderer for immediate feedback
  const applyViewportUpdate = (update: Partial<ViewportState>) => {
    const renderer = getRenderer?.();
    if (renderer) {
      // Direct update to renderer - bypasses React for smoothness
      renderer.setViewport(update);
    }
    // Also schedule React state update for other components
    scheduleStateUpdate(update);
  };

  const handleMouseDown = (e: MouseEvent) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    velocityX = 0;
    velocityY = 0;
    if (inertiaFrame) cancelAnimationFrame(inertiaFrame);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    velocityX = dx * 0.8 + velocityX * 0.2;
    velocityY = dy * 0.8 + velocityY * 0.2;

    viewport.x += dx;
    viewport.y += dy;

    lastX = e.clientX;
    lastY = e.clientY;

    // Use direct update for smooth panning
    applyViewportUpdate({ x: viewport.x, y: viewport.y });
  };

  const handleMouseUp = () => {
    isDragging = false;

    // Inertia
    const applyInertia = () => {
      if (Math.abs(velocityX) < 0.5 && Math.abs(velocityY) < 0.5) {
        inertiaFrame = null;
        return;
      }

      viewport.x += velocityX;
      viewport.y += velocityY;
      velocityX *= 0.92;
      velocityY *= 0.92;

      // Use direct update for smooth inertia
      applyViewportUpdate({ x: viewport.x, y: viewport.y });
      inertiaFrame = requestAnimationFrame(applyInertia);
    };

    applyInertia();
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    // Ctrl/Cmd + wheel = zoom
    if (e.ctrlKey || e.metaKey) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));

      // Zoom toward mouse position
      viewport.x = mouseX - (mouseX - viewport.x) * (newZoom / viewport.zoom);
      viewport.y = mouseY - (mouseY - viewport.y) * (newZoom / viewport.zoom);
      viewport.zoom = newZoom;

      // Zoom updates need to be responsive, use direct call
      applyViewportUpdate({
        x: viewport.x,
        y: viewport.y,
        zoom: viewport.zoom,
      });
    } else {
      // Regular scroll = pan
      // Shift + scroll = horizontal scroll
      const scrollSpeed = 1.5;

      if (e.shiftKey) {
        // Shift + wheel = horizontal scroll
        viewport.x -= e.deltaY * scrollSpeed;
      } else {
        // Normal wheel = vertical scroll (also handle horizontal trackpad)
        viewport.x -= e.deltaX * scrollSpeed;
        viewport.y -= e.deltaY * scrollSpeed;
      }

      // Use direct update for smooth scrolling
      applyViewportUpdate({ x: viewport.x, y: viewport.y });
    }
  };

  canvas.addEventListener("mousedown", handleMouseDown);
  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("mouseup", handleMouseUp);
  canvas.addEventListener("mouseleave", handleMouseUp);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  return () => {
    canvas.removeEventListener("mousedown", handleMouseDown);
    canvas.removeEventListener("mousemove", handleMouseMove);
    canvas.removeEventListener("mouseup", handleMouseUp);
    canvas.removeEventListener("mouseleave", handleMouseUp);
    canvas.removeEventListener("wheel", handleWheel);
    if (inertiaFrame) cancelAnimationFrame(inertiaFrame);
    if (stateUpdateTimeout) clearTimeout(stateUpdateTimeout);
  };
}
