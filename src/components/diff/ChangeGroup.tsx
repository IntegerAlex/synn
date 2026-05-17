"use client";

import {
  Box,
  ChevronDown,
  ChevronRight,
  Code2,
  Import,
  Layers,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import type { ChangeGroup } from "@/lib/diff/changeGrouper";
import type { SideBySideLine } from "@/lib/diff/diffParser";
import { SemanticSummary } from "./SemanticSummary";
import { TokenHighlighter } from "./TokenHighlighter";

interface ChangeGroupComponentProps {
  group: ChangeGroup;
  isSelected: boolean;
  onSelect: () => void;
  groupIndex: number;
}

const typeIcons: Record<ChangeGroup["type"], React.ReactNode> = {
  function: <Code2 className="w-3.5 h-3.5" />,
  class: <Layers className="w-3.5 h-3.5" />,
  import: <Import className="w-3.5 h-3.5" />,
  block: <Box className="w-3.5 h-3.5" />,
  misc: null,
};

const typeColors: Record<ChangeGroup["type"], string> = {
  function: "text-[#7ee787]",
  class: "text-[#d2a8ff]",
  import: "text-[#79c0ff]",
  block: "text-[#ffa657]",
  misc: "text-gray-400",
};

export const ChangeGroupComponent = memo(function ChangeGroupComponent({
  group,
  isSelected,
  onSelect,
  groupIndex,
}: ChangeGroupComponentProps) {
  const [isContextExpanded, setIsContextExpanded] = useState(false);

  // Combine context and changes for display
  const allLines = useMemo(() => {
    if (isContextExpanded) {
      return [...group.contextBefore, ...group.changes, ...group.contextAfter];
    }
    return group.changes;
  }, [group, isContextExpanded]);

  // Only show context button if there are actual non-empty context lines
  const hasContext =
    (group.contextBefore.length > 0 &&
      group.contextBefore.some(
        (l) => l.left?.content.trim() || l.right?.content.trim(),
      )) ||
    (group.contextAfter.length > 0 &&
      group.contextAfter.some(
        (l) => l.left?.content.trim() || l.right?.content.trim(),
      ));

  return (
    <div
      className={`rounded-lg border transition-colors duration-150 ${
        isSelected
          ? "border-[#1f6feb] bg-[#1f6feb]/5 ring-1 ring-[#1f6feb]/30"
          : "border-[#30363d] bg-[#0d1117] hover:border-[#30363d]/80"
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Change group ${groupIndex + 1}: ${group.description}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect();
          e.preventDefault();
        }
      }}
    >
      {/* Group header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363d]/50">
        <div className="flex items-center gap-2">
          {typeIcons[group.type] && (
            <span className={typeColors[group.type]}>
              {typeIcons[group.type]}
            </span>
          )}
          <SemanticSummary semanticChanges={group.semanticChanges || []}>
            <span className="text-sm font-medium text-gray-200">
              {group.title}
            </span>
          </SemanticSummary>
          {group.description && group.title !== group.description && (
            <span className="text-xs text-gray-500 hidden sm:inline">
              — {group.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-2 text-xs">
            {group.additions > 0 && (
              <span className="text-[#3fb950]">+{group.additions}</span>
            )}
            {group.deletions > 0 && (
              <span className="text-[#f85149]">-{group.deletions}</span>
            )}
          </div>

          {/* Context toggle */}
          {hasContext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsContextExpanded(!isContextExpanded);
              }}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200 bg-[#21262d] rounded transition-colors"
              aria-expanded={isContextExpanded}
              aria-label={isContextExpanded ? "Hide context" : "Show context"}
            >
              {isContextExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <span>Context</span>
            </button>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="font-mono text-xs overflow-x-auto overflow-y-visible">
        {allLines.map((line, idx) => (
          <DiffLineRow
            key={`${line.left?.lineNumber || "empty"}-${line.right?.lineNumber || "empty"}-${idx}`}
            line={line}
            isContextLine={
              line.type === "context" &&
              (idx < group.contextBefore.length ||
                idx >= group.contextBefore.length + group.changes.length)
            }
          />
        ))}
      </div>
    </div>
  );
});

interface DiffLineRowProps {
  line: SideBySideLine;
  isContextLine?: boolean;
}

const DiffLineRow = memo(function DiffLineRow({
  line,
  isContextLine,
}: DiffLineRowProps) {
  // Enhanced dimming: context lines are dimmed but still visible
  const leftBg =
    line.type === "remove" || line.type === "modify"
      ? "bg-[#3d1f1f]"
      : isContextLine
        ? "bg-[#0d1117]/50"
        : "bg-[#0d1117]";

  const rightBg =
    line.type === "add" || line.type === "modify"
      ? "bg-[#1f3d1f]"
      : isContextLine
        ? "bg-[#0d1117]/50"
        : "bg-[#0d1117]";

  return (
    <div className="grid grid-cols-2 gap-px">
      {/* Left side (old) */}
      <div className={`flex ${leftBg} ${isContextLine ? "opacity-50" : ""}`}>
        <span className="w-12 shrink-0 text-right pr-2 py-0.5 text-gray-500 select-none border-r border-[#30363d]/30">
          {line.left?.lineNumber || ""}
        </span>
        <span className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
          {line.left ? (
            <TokenHighlighter
              oldLine={line.left.content}
              isRemove={line.left.type === "remove"}
              isModify={line.type === "modify"}
            />
          ) : (
            <span className="text-gray-600">{"  "}</span>
          )}
        </span>
      </div>

      {/* Right side (new) */}
      <div className={`flex ${rightBg} ${isContextLine ? "opacity-50" : ""}`}>
        <span className="w-12 shrink-0 text-right pr-2 py-0.5 text-gray-500 select-none border-r border-[#30363d]/30">
          {line.right?.lineNumber || ""}
        </span>
        <span className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
          {line.right ? (
            <TokenHighlighter
              newLine={line.right.content}
              oldLine={line.left?.content}
              isAdd={line.right.type === "add"}
              isModify={line.type === "modify"}
            />
          ) : (
            <span className="text-gray-600">{"  "}</span>
          )}
        </span>
      </div>
    </div>
  );
});
