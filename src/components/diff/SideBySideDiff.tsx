'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { GroupedFileDiff, ChangeGroup } from '@/lib/diff/changeGrouper';
import { ChangeGroupComponent } from './ChangeGroup';
import { Breadcrumbs } from './Breadcrumbs';
import { extractSemanticScope } from '@/lib/diff/semanticAnalyzer';

interface SideBySideDiffProps {
  groupedFile: GroupedFileDiff;
  currentChangeIndex: number;
  onChangeSelect: (index: number) => void;
}

export function SideBySideDiff({
  groupedFile,
  currentChangeIndex,
  onChangeSelect,
}: SideBySideDiffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Scroll to current change when it changes with animation
  useEffect(() => {
    const currentGroup = groupedFile.groups[currentChangeIndex];
    if (!currentGroup) return;

    const element = groupRefs.current.get(currentGroup.id);
    if (element && containerRef.current) {
      // Add a small delay for smooth animation
      setTimeout(() => {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 50);
    }
  }, [currentChangeIndex, groupedFile.groups]);

  // Store ref for group element
  const setGroupRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      groupRefs.current.set(id, element);
    } else {
      groupRefs.current.delete(id);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto overflow-x-auto scroll-smooth flex flex-col min-h-0"
      style={{ scrollBehavior: 'smooth' }}
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

      {/* Change groups */}
      <div className="space-y-1 p-2">
        {groupedFile.groups.map((group, index) => (
          <motion.div
            key={group.id}
            ref={(el) => setGroupRef(group.id, el)}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: index === currentChangeIndex ? 1.01 : 1,
            }}
            transition={{
              delay: index * 0.02,
              duration: 0.2,
              scale: { duration: 0.15 },
            }}
            className={index === currentChangeIndex ? 'ring-2 ring-[#1f6feb]/50 rounded-lg' : ''}
          >
            <motion.div
              animate={
                index === currentChangeIndex
                  ? {
                      boxShadow: [
                        '0 0 0px rgba(31, 111, 235, 0)',
                        '0 0 20px rgba(31, 111, 235, 0.3)',
                        '0 0 0px rgba(31, 111, 235, 0)',
                      ],
                    }
                  : {}
              }
              transition={{
                duration: 0.6,
                repeat: index === currentChangeIndex ? 1 : 0,
              }}
            >
              <ChangeGroupComponent
                group={group}
                isSelected={index === currentChangeIndex}
                onSelect={() => onChangeSelect(index)}
                groupIndex={index}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {groupedFile.groups.length === 0 && (
        <div className="flex items-center justify-center h-64 text-gray-400">
          No changes in this file
        </div>
      )}
    </div>
  );
}
