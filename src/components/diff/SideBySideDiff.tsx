'use client';

import { useRef, useEffect, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GroupedFileDiff, ChangeGroup } from '@/lib/diff/changeGrouper';
import { ChangeGroupComponent } from './ChangeGroup';

interface SideBySideDiffProps {
  groupedFile: GroupedFileDiff;
  currentChangeIndex: number;
  onChangeSelect: (index: number) => void;
}

export const SideBySideDiff = memo(function SideBySideDiff({
  groupedFile,
  currentChangeIndex,
  onChangeSelect,
}: SideBySideDiffProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Virtualize the change groups for performance on large diffs
  const virtualizer = useVirtualizer({
    count: groupedFile.groups.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  // Scroll to current change when it changes
  useEffect(() => {
    if (currentChangeIndex >= 0 && currentChangeIndex < groupedFile.groups.length) {
      virtualizer.scrollToIndex(currentChangeIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [currentChangeIndex, groupedFile.groups.length, virtualizer]);

  const handleSelect = useCallback(
    (index: number) => onChangeSelect(index),
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
          <span className="font-mono text-sm text-gray-200">
            {groupedFile.filePath}
          </span>
          <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs text-gray-400">
            {groupedFile.language}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#3fb950]">+{groupedFile.totalAdditions}</span>
          <span className="text-[#f85149]">-{groupedFile.totalDeletions}</span>
        </div>
      </div>

      {/* Column headers */}
      <div className="sticky top-[41px] z-10 grid grid-cols-2 gap-px bg-[#30363d] shrink-0">
        <div className="bg-[#161b22] px-4 py-2 text-xs font-medium text-gray-400 flex items-center gap-2">
          <span className="w-12 text-center">Old</span>
          <span>Original</span>
        </div>
        <div className="bg-[#161b22] px-4 py-2 text-xs font-medium text-gray-400 flex items-center gap-2">
          <span className="w-12 text-center">New</span>
          <span>Modified</span>
        </div>
      </div>

      {/* Virtualized change groups */}
      {groupedFile.groups.length > 0 ? (
        <div
          className="relative p-2"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const group = groupedFile.groups[virtualItem.index];
            const isSelected = virtualItem.index === currentChangeIndex;
            return (
              <div
                key={group.id}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className={`absolute left-2 right-2 ${isSelected ? 'ring-2 ring-[#1f6feb]/50 rounded-lg' : ''}`}
                style={{
                  top: `${virtualItem.start}px`,
                }}
              >
                <div className="mb-1">
                  <ChangeGroupComponent
                    group={group}
                    isSelected={isSelected}
                    onSelect={() => handleSelect(virtualItem.index)}
                    groupIndex={virtualItem.index}
                  />
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
