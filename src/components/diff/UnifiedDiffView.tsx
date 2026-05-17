'use client';

import { memo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GroupedFileDiff } from '@/lib/diff/changeGrouper';
import type { SideBySideLine } from '@/lib/diff/diffParser';
import { TokenHighlighter } from './TokenHighlighter';

interface UnifiedDiffViewProps {
  groupedFile: GroupedFileDiff;
  currentChangeIndex: number;
  onChangeSelect: (index: number) => void;
}

/** Flatten all group lines into a single list for unified rendering */
function flattenLines(groupedFile: GroupedFileDiff): Array<{
  line: SideBySideLine;
  groupIndex: number;
  isGroupStart: boolean;
  groupTitle: string;
  groupType: string;
  additions: number;
  deletions: number;
}> {
  const flat: Array<{
    line: SideBySideLine;
    groupIndex: number;
    isGroupStart: boolean;
    groupTitle: string;
    groupType: string;
    additions: number;
    deletions: number;
  }> = [];

  for (let gi = 0; gi < groupedFile.groups.length; gi++) {
    const group = groupedFile.groups[gi];
    for (let li = 0; li < group.changes.length; li++) {
      flat.push({
        line: group.changes[li],
        groupIndex: gi,
        isGroupStart: li === 0,
        groupTitle: group.title,
        groupType: group.type,
        additions: group.additions,
        deletions: group.deletions,
      });
    }
  }

  return flat;
}

export const UnifiedDiffView = memo(function UnifiedDiffView({
  groupedFile,
  currentChangeIndex,
  onChangeSelect,
}: UnifiedDiffViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flatLines = flattenLines(groupedFile);

  const virtualizer = useVirtualizer({
    count: flatLines.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 22,
    overscan: 20,
  });

  const handleGroupClick = useCallback(
    (groupIndex: number) => onChangeSelect(groupIndex),
    [onChangeSelect],
  );

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto overflow-x-auto flex flex-col min-h-0"
    >
      {/* File header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-200">{groupedFile.filePath}</span>
          <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs text-gray-400">{groupedFile.language}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#3fb950]">+{groupedFile.totalAdditions}</span>
          <span className="text-[#f85149]">-{groupedFile.totalDeletions}</span>
        </div>
      </div>

      {/* Column header */}
      <div className="sticky top-[41px] z-10 bg-[#161b22] px-4 py-2 text-xs font-medium text-gray-400 border-b border-[#30363d] flex items-center gap-4 shrink-0">
        <span className="w-12 text-center">Old</span>
        <span className="w-12 text-center">New</span>
        <span>Unified</span>
      </div>

      {/* Virtualized unified lines */}
      {flatLines.length > 0 ? (
        <div
          className="relative font-mono text-xs"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = flatLines[virtualItem.index];
            const { line, groupIndex, isGroupStart, groupTitle, additions, deletions } = item;
            const isCurrentGroup = groupIndex === currentChangeIndex;
            let prefix = ' ';
            if (line.type === 'add' || line.type === 'modify') {
              prefix = '+';
            } else if (line.type === 'remove') {
              prefix = '-';
            }
            let bgClass = '';
            if (line.type === 'add') {
              bgClass = 'bg-[#1f3d1f]/40';
            } else if (line.type === 'remove') {
              bgClass = 'bg-[#3d1f1f]/40';
            } else if (line.type === 'modify') {
              bgClass = 'bg-[#3d3d1f]/40';
            }
            let textClass = 'text-gray-400';
            if (line.type === 'add') {
              textClass = 'text-[#58a6ff]'; // Blueish for additions to be different
            } else if (line.type === 'remove') {
              textClass = 'text-[#f85149]';
            } else if (line.type === 'modify') {
              textClass = 'text-[#d29922]';
            }

            return (
              <div
                key={virtualItem.index}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 right-0"
                style={{ top: `${virtualItem.start}px` }}
              >
                {isGroupStart && (
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 px-4 py-1 text-xs border-t border-[#30363d]/50 ${
                      isCurrentGroup ? 'bg-[#1f6feb]/10 text-[#79c0ff]' : 'bg-[#161b22]/50 text-gray-500'
                    }`}
                    onClick={() => handleGroupClick(groupIndex)}
                  >
                    <span className="font-medium">{groupTitle}</span>
                    <span className="ml-auto flex items-center gap-2">
                      {additions > 0 && <span className="text-[#3fb950]">+{additions}</span>}
                      {deletions > 0 && <span className="text-[#f85149]">-{deletions}</span>}
                    </span>
                  </button>
                )}
                <div className={`flex ${bgClass} ${isCurrentGroup ? 'border-l-2 border-[#1f6feb]' : ''}`}>
                  <span className="w-12 shrink-0 text-right pr-2 py-0.5 text-gray-500 select-none border-r border-[#30363d]/30">
                    {line.left?.lineNumber || ''}
                  </span>
                  <span className="w-12 shrink-0 text-right pr-2 py-0.5 text-gray-500 select-none border-r border-[#30363d]/30">
                    {line.right?.lineNumber || ''}
                  </span>
                  <span className={`select-none w-4 text-center py-0.5 ${textClass}`}>{prefix}</span>
                  <span className="flex-1 px-2 py-0.5 whitespace-pre overflow-hidden">
                    {line.right ? (
                      <TokenHighlighter
                        newLine={line.right.content}
                        oldLine={line.left?.content}
                        isAdd={line.type === 'add'}
                        isModify={line.type === 'modify'}
                      />
                    ) : line.left ? (
                      <TokenHighlighter
                        oldLine={line.left.content}
                        isRemove
                        isModify={line.type === 'modify'}
                      />
                    ) : (
                      <span className="text-gray-600">{' '}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No changes in this file
        </div>
      )}
    </div>
  );
});
