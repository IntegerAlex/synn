'use client';

import { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import type cytoscape from 'cytoscape';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { useGraph } from '@/hooks/useGitData';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSelectedCommitHash } from '@/store/slices/appSlice';
import { CommitTooltip } from './CommitTooltip';
import { CommitActivityChart } from './CommitActivityChart';
import type { GraphNode, GraphData } from '@/types/git';

// GitLens-style color palette
const BRANCH_COLORS = [
  '#4FC3F7', // main - light cyan
  '#7986CB', // indigo
  '#9575CD', // purple
  '#4DB6AC', // teal
  '#81C784', // green
  '#FFB74D', // orange
  '#F06292', // pink
  '#64B5F6', // blue
  '#A1887F', // brown
  '#90A4AE', // grey-blue
];

export function CytoscapeGraph() {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isHoveringNode, setIsHoveringNode] = useState(false);

  const dispatch = useAppDispatch();
  const selectedCommitHash = useAppSelector((state) => state.app.selectedCommitHash);
  const theme = useAppSelector((state) => state.app.theme);
  const { data: graphData, isLoading, error, refetch } = useGraph(10000);

  const isDark = useMemo(
    () => !['light', 'solarized-light'].includes(theme),
    [theme]
  );

  // Convert graph data to Cytoscape format
  const elements = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) return [];

    const laneWidth = 30;
    const rowHeight = 25;
    const paddingX = 50;
    const paddingY = 30;

    const nodes = graphData.nodes.map((node) => ({
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
      },
      position: {
        x: paddingX + node.column * laneWidth,
        y: paddingY + node.row * rowHeight,
      },
    }));

    const edges = graphData.edges.map((edge) => {
      const sourceNode = graphData.nodes.find(n => n.hash === edge.source);
      const targetNode = graphData.nodes.find(n => n.hash === edge.target);
      
      // Improved bezier curve control for merges
      let controlPointDistance = 0;
      let controlPointWeight = 0.5;
      
      if (sourceNode && targetNode && edge.sourceColumn !== undefined && edge.targetColumn !== undefined) {
        const sourceCol = edge.sourceColumn;
        const targetCol = edge.targetColumn;
        const colDiff = Math.abs(sourceCol - targetCol);
        const rowDiff = Math.abs(sourceNode.row - targetNode.row);
        
        if (edge.type === 'merge') {
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
        },
      };
    });

    return [...nodes, ...edges];
  }, [graphData]);

  // Cytoscape stylesheet
  const stylesheet = useMemo(() => [
    {
      selector: 'node',
      style: {
        'background-color': (ele: any) => ele.data('color') || BRANCH_COLORS[0],
        'width': 8,
        'height': 8,
        'shape': 'ellipse',
        'border-width': 2,
        'border-color': isDark ? '#0d1117' : '#ffffff',
        'label': (ele: any) => '',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': '10px',
        'color': isDark ? '#cccccc' : '#333333',
        'text-outline-width': 1,
        'text-outline-color': isDark ? '#0d1117' : '#ffffff',
        'cursor': 'pointer',
      },
    },
    {
      selector: 'node.branch-label',
      style: {
        'label': (ele: any) => ele.data('branchName'),
        'width': 'label',
        'height': 'label',
        'shape': 'round-rectangle',
        'background-color': (ele: any) => {
          return ele.data('isCurrentBranch') 
            ? (isDark ? '#1a3a4a' : '#d0eaff')
            : (isDark ? '#2d2d2d' : '#e0e0e0');
        },
        'color': (ele: any) => {
          return ele.data('isCurrentBranch') 
            ? '#4FC3F7'
            : (isDark ? '#cccccc' : '#333333');
        },
        'text-valign': 'center',
        'text-halign': 'left',
        'font-size': '10px',
        'font-weight': (ele: any) => ele.data('isCurrentBranch') ? '600' : '400',
        'padding': '3px 6px',
        'border-width': 1,
        'border-color': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        'cursor': 'default',
        'events': 'no',
        'text-outline-width': 0,
      },
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 3,
        'border-color': '#ef4444',
        'width': 12,
        'height': 12,
      },
    },
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': (ele: any) => ele.data('color') || BRANCH_COLORS[0],
        'target-arrow-shape': 'none', // No arrows for git graphs
        'curve-style': 'bezier',
        'control-point-distances': (ele: any) => {
          const dist = ele.data('controlPointDistance') || 0;
          return `${dist}px`;
        },
        'control-point-weights': (ele: any) => {
          return ele.data('controlPointWeight') || 0.5;
        },
        'opacity': 0.6,
      },
    },
    {
      selector: 'edge[type = "merge"]',
      style: {
        'opacity': 0.8,
        'width': 2.5,
        'line-style': 'solid',
      },
    },
  ], [isDark]);

  // Handle node click
  const handleNodeClick = useCallback((evt: any) => {
    const node = evt.target;
    if (node.isNode()) {
      const hash = node.data('hash');
      dispatch(setSelectedCommitHash(hash));
    }
  }, [dispatch]);

  // Handle node hover
  const handleNodeMouseOver = useCallback((evt: any) => {
    const node = evt.target;
    if (node.isNode() && graphData && cyRef.current) {
      const hash = node.data('hash');
      const graphNode = graphData.nodes.find(n => n.hash === hash);
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
            y: rect.top + renderedPos.y 
          });
        }
      }
    }
  }, [graphData]);

  const handleNodeMouseOut = useCallback(() => {
    setIsHoveringNode(false);
    setHoveredNode(null);
  }, []);

  // Update selection when Redux state changes
  useEffect(() => {
    if (!cyRef.current || !selectedCommitHash) return;

    const cy = cyRef.current;
    cy.nodes().forEach((node: any) => {
      if (node.data('hash') === selectedCommitHash) {
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
      name: 'preset',
      fit: false,
      padding: 0,
    }).run();

    // Fit view after layout completes
    setTimeout(() => {
      cy.fit(undefined, 50);
    }, 100);
  }, [elements, graphData]);

  // Add branch labels and render them on the graph
  useEffect(() => {
    if (!cyRef.current || !graphData) return;

    const cy = cyRef.current;
    
    // Remove existing labels
    cy.nodes('[type = "branch-label"]').remove();
    
    // Find branch head nodes (commits with refs)
    const branchHeadNodes = graphData.nodes.filter(node => 
      node.refs && node.refs.length > 0
    );

    // Create label nodes for branch heads
    branchHeadNodes.forEach(node => {
      const cyNode = cy.getElementById(node.hash);
      if (cyNode.length > 0) {
        const pos = cyNode.position();
        
        // Create label nodes for each branch name
        node.refs.forEach((branchName, idx) => {
          const isCurrentBranch = branchName === graphData.currentBranch;
          
          // Add label as a node positioned to the right of the commit
          const labelNode = cy.add({
            data: {
              id: `label-${node.hash}-${idx}`,
              type: 'branch-label',
              branchName,
              isCurrentBranch,
              parentHash: node.hash,
            },
            position: {
              x: pos.x + 15 + (idx * 80), // Offset for multiple branches
              y: pos.y,
            },
            classes: 'branch-label',
          });
          
          // Make label non-interactive but visible
          labelNode.style({
            'events': 'no',
          });
        });
      }
    });

    // Update label positions when viewport changes
    const updateLabels = () => {
      cy.nodes('[type = "branch-label"]').forEach((labelNode: any) => {
        const parentHash = labelNode.data('parentHash');
        const parentNode = cy.getElementById(parentHash);
        if (parentNode.length > 0) {
          const parentPos = parentNode.position();
          const labelIdx = parseInt(labelNode.id().split('-').pop() || '0');
          labelNode.position({
            x: parentPos.x + 15 + (labelIdx * 80),
            y: parentPos.y,
          });
        }
      });
    };

    cy.on('pan', updateLabels);
    cy.on('zoom', updateLabels);

    return () => {
      cy.off('pan', updateLabels);
      cy.off('zoom', updateLabels);
    };
  }, [graphData]);

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
      </div>

      {/* Cytoscape Graph with Scrollbars */}
      <div 
        className="flex-1 relative overflow-auto" 
        style={{ 
          scrollbarWidth: 'thin', 
          scrollbarColor: '#30363d #0d1117',
        }}
        id="cytoscape-scroll-container"
      >
        <CytoscapeComponent
          elements={elements}
          style={{ width: '100%', height: '100%' }}
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
            cy.on('tap', 'node', handleNodeClick);
            cy.on('mouseover', 'node', handleNodeMouseOver);
            cy.on('mouseout', 'node', handleNodeMouseOut);
            
            // Sync scroll position with Cytoscape pan
            const container = cy.container();
            const scrollContainer = container?.closest('#cytoscape-scroll-container') as HTMLElement;
            
            if (scrollContainer) {
              // Update scroll position when Cytoscape pans
              cy.on('pan', () => {
                const pan = cy.pan();
                const zoom = cy.zoom();
                scrollContainer.scrollLeft = -pan.x * zoom;
                scrollContainer.scrollTop = -pan.y * zoom;
              });
              
              // Update Cytoscape pan when user scrolls
              let isScrolling = false;
              scrollContainer.addEventListener('scroll', () => {
                if (isScrolling) return;
                isScrolling = true;
                const zoom = cy.zoom();
                cy.pan({
                  x: -scrollContainer.scrollLeft / zoom,
                  y: -scrollContainer.scrollTop / zoom,
                });
                setTimeout(() => { isScrolling = false; }, 10);
              });
              
              // Set container size for scrolling
              const updateScrollArea = () => {
                try {
                  const bounds = cy.elements().boundingBox();
                  const zoom = cy.zoom();
                  const padding = 200;
                  
                  const contentWidth = bounds.w + padding * 2;
                  const contentHeight = bounds.h + padding * 2;
                  
                  // Make the scroll container larger than viewport to enable scrolling
                  if (container) {
                    container.style.width = `${contentWidth}px`;
                    container.style.height = `${contentHeight}px`;
                  }
                } catch (e) {
                  // Ignore errors during initialization
                }
              };
              
              cy.on('ready', () => {
                setTimeout(() => {
                  cy.fit(cy.elements(), 50);
                  updateScrollArea();
                }, 100);
              });
              
              cy.on('zoom', updateScrollArea);
              cy.on('layoutstop', updateScrollArea);
            }
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

