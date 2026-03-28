'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { ChangeGroup } from '@/lib/diff/changeGrouper';

interface ChangeNavigatorProps {
  currentIndex: number;
  totalChanges: number;
  onPrevious: () => void;
  onNext: () => void;
  onJumpTo: (index: number) => void;
  groups: ChangeGroup[];
}

export const ChangeNavigator = memo(function ChangeNavigator({
  currentIndex,
  totalChanges,
  onPrevious,
  onNext,
  onJumpTo,
  groups,
}: ChangeNavigatorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Close dropdown on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isDropdownOpen]);

  const handleJumpTo = (index: number) => {
    onJumpTo(index);
    setIsDropdownOpen(false);
  };

  const progressPercent = totalChanges > 0 ? ((currentIndex + 1) / totalChanges) * 100 : 0;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
      {/* Previous button */}
      <button
        onClick={onPrevious}
        disabled={currentIndex === 0}
        className="p-1.5 rounded hover:bg-[#21262d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Previous change (k)"
        aria-label="Previous change"
      >
        <ChevronUp className="w-4 h-4 text-gray-400" />
      </button>

      {/* Change counter with dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-3 py-1 rounded bg-[#21262d] hover:bg-[#30363d] transition-colors"
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-label="Jump to change"
        >
          <span className="text-sm text-gray-200">
            Change <span className="font-mono">{currentIndex + 1}</span> of{' '}
            <span className="font-mono">{totalChanges}</span>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-72 max-h-64 overflow-y-auto bg-[#0d1117] border border-[#30363d] rounded-lg shadow-xl z-50"
            role="listbox"
            aria-label="Select change"
          >
            {groups.map((group, index) => (
              <button
                key={group.id}
                onClick={() => handleJumpTo(index)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#161b22] transition-colors ${
                  index === currentIndex ? 'bg-[#1f6feb]/10 border-l-2 border-[#1f6feb]' : ''
                }`}
                role="option"
                aria-selected={index === currentIndex}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 w-6 text-right font-mono text-xs text-gray-500">
                    {index + 1}
                  </span>
                  <span className="truncate text-gray-200">{group.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs shrink-0">
                  {group.additions > 0 && (
                    <span className="text-[#3fb950]">+{group.additions}</span>
                  )}
                  {group.deletions > 0 && (
                    <span className="text-[#f85149]">-{group.deletions}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        disabled={currentIndex >= totalChanges - 1}
        className="p-1.5 rounded hover:bg-[#21262d] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Next change (j)"
        aria-label="Next change"
      >
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {/* Progress bar */}
      <div className="ml-4 w-24 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1f6feb] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
});
