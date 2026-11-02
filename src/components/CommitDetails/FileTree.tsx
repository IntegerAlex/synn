"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { buildFileTree, type FileTreeNode } from "@/lib/fileTree";
import type { FileChange } from "@/types/git";

type TreeNode = FileTreeNode<FileChange>;

function statusDot(status: FileChange["status"]): string {
  if (status === "added") return "bg-[#3fb950]";
  if (status === "deleted") return "bg-[#f85149]";
  if (status === "renamed") return "bg-[#d29922]";
  return "bg-[#d29922]";
}

export function CommitFileTree({
  files,
  selectedFile,
  onSelectFile,
}: {
  files: FileChange[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const tree = useMemo(
    () => buildFileTree(files, (file) => file.path),
    [files],
  );
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const listRef = useRef<HTMLDivElement | null>(null);

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const rows = useMemo(() => {
    const out: Array<{ node: TreeNode; depth: number }> = [];
    const walk = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        out.push({ node, depth });
        if (node.type === "folder" && expanded.has(node.path)) {
          walk(node.children, depth + 1);
        }
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, expanded]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  return (
    <div ref={listRef} className="max-h-64 overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const row = rows[v.index];
          if (!row) return null;
          const pad = row.depth * 12;
          const node = row.node;
          return (
            <div
              key={`${node.type}:${node.path}`}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${v.start}px)`,
                height: `${v.size}px`,
              }}
            >
              {node.type === "folder" ? (
                <button
                  type="button"
                  onClick={() => toggle(node.path)}
                  className="w-full flex items-center gap-2 text-xs py-1 rounded hover:bg-[#21262d] transition-colors text-left"
                  style={{ paddingLeft: 8 + pad }}
                  aria-expanded={expanded.has(node.path)}
                >
                  {expanded.has(node.path) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <Folder className="w-4 h-4 text-gray-500" />
                  <span className="truncate text-gray-200">{node.name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelectFile(node.path)}
                  className={`w-full flex items-center gap-2 text-xs py-1 rounded px-1 transition-colors ${
                    selectedFile === node.path
                      ? "bg-[#1f6feb] text-white"
                      : "hover:bg-[#21262d]"
                  }`}
                  style={{ paddingLeft: 8 + pad }}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${statusDot(node.value.status)}`}
                  />
                  <FileIcon
                    className={`w-4 h-4 ${
                      selectedFile === node.path
                        ? "text-white/80"
                        : "text-gray-500"
                    }`}
                  />
                  <span
                    className={`truncate flex-1 ${
                      selectedFile === node.path
                        ? "text-white"
                        : "text-gray-300"
                    }`}
                  >
                    {node.name}
                  </span>
                  <span
                    className={`ml-auto ${
                      selectedFile === node.path
                        ? "text-white/80"
                        : "text-gray-500"
                    }`}
                  >
                    +{node.value.additions} -{node.value.deletions}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
