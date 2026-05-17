"use client";

import { useEffect, useRef, useState } from "react";
import type { GraphData, GraphNode } from "@/types/git";

interface CommitTooltipProps {
  node: GraphNode | null;
  graphData: GraphData | null;
  x: number;
  y: number;
  visible: boolean;
}

export function CommitTooltip({
  node,
  graphData,
  x,
  y,
  visible,
}: CommitTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    left: x + 15,
    top: y - 10,
    transform: "translateY(-100%)",
  });

  // Get all branch names for the node
  const getBranchNames = (node: GraphNode): string[] => {
    if (!graphData || !node) return [];

    // Get branch names from node refs (these are populated from the API)
    if (node.refs && node.refs.length > 0) {
      return node.refs
        .map((ref) =>
          ref
            .replace("HEAD -> ", "")
            .replace("origin/", "")
            .replace("remote/", "")
            .replace("tag: ", "")
            .trim(),
        )
        .filter((name) => name && !name.includes("tag:"));
    }

    return [];
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
    let transform = "translateY(-100%)";

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
      transform = "translateY(0)";
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
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
        {/* Hash and Branches */}
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs font-mono text-[#4FC3F7] font-semibold">
            {node.shortHash}
          </code>
          {getBranchNames(node).map((branchName, idx) => (
            <span
              key={idx}
              className={`text-xs px-1.5 py-0.5 rounded ${
                branchName === graphData?.currentBranch
                  ? "bg-[#238636]/30 text-[#3fb950]"
                  : "bg-[#1a3a4a] text-[#4FC3F7]"
              }`}
            >
              {branchName}
            </span>
          ))}
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
        style={{ left: "15px" }}
      />
    </div>
  );
}
