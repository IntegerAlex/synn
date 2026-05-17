"use client";

import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode,
  FileJson,
  FileText,
} from "lucide-react";
import { memo, useMemo, useState } from "react";
import type { ParsedFileDiff } from "@/lib/diff/diffParser";
import {
  type FileGroup,
  getFileTypeIcon,
  groupFiles,
} from "@/lib/diff/fileGrouper";
import {
  calculateFileImpact,
  getImpactBadgeClass,
  getImpactColor,
} from "@/lib/diff/impactCalculator";

interface SmartFileTabsProps {
  files: ParsedFileDiff[];
  selectedFileIndex: number;
  onFileSelect: (index: number) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileCode,
  FileJson,
  FileText,
  File,
};

export const SmartFileTabs = memo(function SmartFileTabs({
  files,
  selectedFileIndex,
  onFileSelect,
}: SmartFileTabsProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileGroups = useMemo(() => groupFiles(files), [files]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Flatten files with group info
  const flatFiles: Array<{
    file: ParsedFileDiff;
    index: number;
    group?: FileGroup;
  }> = [];
  let globalIndex = 0;

  for (const group of fileGroups) {
    if (group.files.length === 1 || expandedGroups.has(group.name)) {
      // Show individual files
      for (const file of group.files) {
        flatFiles.push({ file, index: globalIndex++, group });
      }
    } else {
      // Show collapsed group
      flatFiles.push({ file: group.files[0], index: globalIndex, group });
      globalIndex += group.files.length;
    }
  }

  return (
    <div className="border-b border-[#30363d] bg-[#161b22]/50 overflow-x-auto">
      <div className="flex items-center gap-1 px-4 py-2">
        {fileGroups.length === 0 ? (
          // No files
          <div className="text-sm text-gray-400">No files</div>
        ) : (
          fileGroups.map((group) => {
            if (group.files.length === 1) {
              // Single file - no grouping
              const file = group.files[0];
              const fileIndex = files.indexOf(file);
              const isSelected = fileIndex === selectedFileIndex;
              const impact = calculateFileImpact(file);
              const iconName = getFileTypeIcon(file.newPath);
              const Icon = iconMap[iconName] || File;

              return (
                <FileTab
                  key={file.newPath}
                  file={file}
                  index={fileIndex}
                  isSelected={isSelected}
                  impact={impact}
                  icon={Icon}
                  onSelect={() => onFileSelect(fileIndex)}
                />
              );
            } else {
              // Grouped files
              const isExpanded = expandedGroups.has(group.name);
              const impact = group.impact;
              const impactColor = getImpactColor(impact);
              const impactBadge = getImpactBadgeClass(impact);

              return (
                <div key={group.name} className="flex items-center">
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors border ${impactBadge} ${
                      isExpanded
                        ? "bg-[#21262d]"
                        : "bg-[#161b22]/50 hover:bg-[#21262d]/50"
                    }`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span className="font-medium">{group.name}</span>
                    <span className="text-xs opacity-70">
                      ({group.files.length} files)
                    </span>
                    <span className={`text-xs font-medium ${impactColor}`}>
                      {impact === "high"
                        ? "High Impact"
                        : impact === "medium"
                          ? "Medium Impact"
                          : "Low Impact"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="flex items-center gap-1 ml-2">
                      {group.files.map((file) => {
                        const fileIndex = files.indexOf(file);
                        const isSelected = fileIndex === selectedFileIndex;
                        const iconName = getFileTypeIcon(file.newPath);
                        const Icon = iconMap[iconName] || File;

                        return (
                          <FileTab
                            key={file.newPath}
                            file={file}
                            index={fileIndex}
                            isSelected={isSelected}
                            impact={calculateFileImpact(file)}
                            icon={Icon}
                            onSelect={() => onFileSelect(fileIndex)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
          })
        )}
      </div>
    </div>
  );
});

interface FileTabProps {
  file: ParsedFileDiff;
  index: number;
  isSelected: boolean;
  impact: "low" | "medium" | "high";
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

const FileTab = memo(function FileTab({
  file,
  index,
  isSelected,
  impact,
  icon: Icon,
  onSelect,
}: FileTabProps) {
  const impactColor = getImpactColor(impact);

  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
        isSelected
          ? "bg-[#21262d] text-white"
          : "text-gray-400 hover:text-white hover:bg-[#21262d]/50"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-mono text-xs">{file.newPath.split("/").pop()}</span>
      {file.isNew && (
        <span
          className="px-1 py-0.5 bg-[#238636]/20 text-[#3fb950] rounded text-[10px] font-medium"
          aria-label="New file"
        >
          N
        </span>
      )}
      {file.isDeleted && (
        <span
          className="px-1 py-0.5 bg-[#da3633]/20 text-[#f85149] rounded text-[10px] font-medium"
          aria-label="Deleted file"
        >
          D
        </span>
      )}
      {file.isRenamed && (
        <span
          className="px-1 py-0.5 bg-[#1f6feb]/20 text-[#79c0ff] rounded text-[10px] font-medium"
          aria-label="Renamed file"
        >
          R
        </span>
      )}
      <span className="text-xs">
        <span className="text-[#3fb950]">+{file.additions}</span>
        <span className="text-gray-500 mx-1">/</span>
        <span className="text-[#f85149]">-{file.deletions}</span>
      </span>
      {impact !== "low" && (
        <span className={`text-xs ${impactColor}`}>
          {impact === "high" ? "●" : "○"}
        </span>
      )}
    </button>
  );
});
