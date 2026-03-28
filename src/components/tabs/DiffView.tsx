"use client";

import { useState, useMemo, useCallback, useRef, memo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Columns2,
  AlignJustify,
  FileText,
  Loader2,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  highlightUnifiedDiffLines,
  detectPrismLanguageFromFilePath,
} from "@/lib/utils/diffHighlighter";
import { sanitizeDiffHtml } from "@/lib/utils/sanitize";
import type { PRFile } from "@/hooks/useGitHubData";

/* ── Types ─────────────────────────────────────────────── */

export type DiffViewMode = "unified" | "split";

interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

interface DiffLine {
  type: "add" | "delete" | "context" | "header";
  content: string;
  oldLineNo: number | null;
  newLineNo: number | null;
}

interface SplitLine {
  left: DiffLine | null;
  right: DiffLine | null;
}

/* ── Patch Parser ──────────────────────────────────────── */

function parsePatch(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = patch.split("\n");
  let currentHunk: DiffHunk | null = null;
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(
      /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)/,
    );

    if (hunkMatch) {
      currentHunk = {
        header: line,
        oldStart: Number.parseInt(hunkMatch[1], 10),
        oldCount: Number.parseInt(hunkMatch[2] ?? "1", 10),
        newStart: Number.parseInt(hunkMatch[3], 10),
        newCount: Number.parseInt(hunkMatch[4] ?? "1", 10),
        lines: [],
      };
      oldLine = currentHunk.oldStart;
      newLine = currentHunk.newStart;
      hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;

    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "add",
        content: line.slice(1),
        oldLineNo: null,
        newLineNo: newLine++,
      });
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "delete",
        content: line.slice(1),
        oldLineNo: oldLine++,
        newLineNo: null,
      });
    } else {
      currentHunk.lines.push({
        type: "context",
        content: line.startsWith(" ") ? line.slice(1) : line,
        oldLineNo: oldLine++,
        newLineNo: newLine++,
      });
    }
  }

  return hunks;
}

/** Convert unified lines into side-by-side pairs */
function buildSplitLines(hunks: DiffHunk[]): SplitLine[] {
  const result: SplitLine[] = [];

  for (const hunk of hunks) {
    const deletes: DiffLine[] = [];
    const adds: DiffLine[] = [];

    const flushPairs = () => {
      const max = Math.max(deletes.length, adds.length);
      for (let i = 0; i < max; i++) {
        result.push({
          left: deletes[i] ?? null,
          right: adds[i] ?? null,
        });
      }
      deletes.length = 0;
      adds.length = 0;
    };

    for (const line of hunk.lines) {
      if (line.type === "delete") {
        deletes.push(line);
      } else if (line.type === "add") {
        adds.push(line);
      } else {
        flushPairs();
        result.push({ left: line, right: line });
      }
    }
    flushPairs();
  }

  return result;
}

/* ── Constants ─────────────────────────────────────────── */

const LARGE_DIFF_LINE_THRESHOLD = 500;

/* ── Highlighted Line Component ────────────────────────── */

const HighlightedLine = memo(function HighlightedLine({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) {
  const languageId = detectPrismLanguageFromFilePath(filename);
  const lines = highlightUnifiedDiffLines(
    ` ${content}`,
    filename,
  );
  const line = lines[0];
  if (!line) return <span>{content}</span>;

  // sanitizeDiffHtml ensures only safe <span class="..."> tags
  const safeHtml = sanitizeDiffHtml(line.html);
  return (
    <span
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized by DOMPurify via sanitizeDiffHtml
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
});

/* ── Unified Diff Renderer ─────────────────────────────── */

const UnifiedDiffView = memo(function UnifiedDiffView({
  hunks,
  filename,
}: {
  hunks: DiffHunk[];
  filename: string;
}) {
  return (
    <table className="w-full border-collapse text-xs font-mono">
      <tbody>
        {hunks.map((hunk, hi) => (
          <HunkSection key={hi} hunk={hunk} filename={filename} />
        ))}
      </tbody>
    </table>
  );
});

const HunkSection = memo(function HunkSection({
  hunk,
  filename,
}: {
  hunk: DiffHunk;
  filename: string;
}) {
  return (
    <>
      <tr className="bg-blue-500/10">
        <td className="w-12 text-right px-2 py-0.5 text-gray-600 select-none border-r border-[#30363d]">
          ...
        </td>
        <td className="w-12 text-right px-2 py-0.5 text-gray-600 select-none border-r border-[#30363d]">
          ...
        </td>
        <td className="px-4 py-0.5 text-blue-300">{hunk.header}</td>
      </tr>
      {hunk.lines.map((line, li) => {
        const bgClass =
          line.type === "add"
            ? "bg-green-500/10"
            : line.type === "delete"
              ? "bg-red-500/10"
              : "";
        const textClass =
          line.type === "add"
            ? "text-green-300"
            : line.type === "delete"
              ? "text-red-300"
              : "text-gray-300";
        const prefix =
          line.type === "add" ? "+" : line.type === "delete" ? "-" : " ";

        return (
          <tr key={li} className={bgClass}>
            <td className="w-12 text-right px-2 py-0 text-gray-600 select-none border-r border-[#30363d]">
              {line.oldLineNo ?? ""}
            </td>
            <td className="w-12 text-right px-2 py-0 text-gray-600 select-none border-r border-[#30363d]">
              {line.newLineNo ?? ""}
            </td>
            <td className={`px-4 py-0 whitespace-pre ${textClass}`}>
              <span className="select-none mr-2 inline-block w-3 text-center">
                {prefix}
              </span>
              <HighlightedLine content={line.content} filename={filename} />
            </td>
          </tr>
        );
      })}
    </>
  );
});

/* ── Split Diff Renderer ───────────────────────────────── */

const SplitDiffView = memo(function SplitDiffView({
  hunks,
  filename,
}: {
  hunks: DiffHunk[];
  filename: string;
}) {
  const splitLines = useMemo(() => buildSplitLines(hunks), [hunks]);

  return (
    <table className="w-full border-collapse text-xs font-mono">
      <tbody>
        {splitLines.map((pair, i) => (
          <tr key={i}>
            {/* Left side (old) */}
            <td className="w-10 text-right px-2 py-0 text-gray-600 select-none border-r border-[#30363d]">
              {pair.left?.oldLineNo ?? ""}
            </td>
            <td
              className={`w-1/2 px-3 py-0 whitespace-pre ${
                pair.left?.type === "delete"
                  ? "bg-red-500/10 text-red-300"
                  : pair.left
                    ? "text-gray-300"
                    : "bg-[#161b22]"
              }`}
            >
              {pair.left && (
                <>
                  <span className="select-none mr-2 inline-block w-3 text-center">
                    {pair.left.type === "delete" ? "-" : " "}
                  </span>
                  <HighlightedLine
                    content={pair.left.content}
                    filename={filename}
                  />
                </>
              )}
            </td>
            {/* Right side (new) */}
            <td className="w-10 text-right px-2 py-0 text-gray-600 select-none border-l border-r border-[#30363d]">
              {pair.right?.newLineNo ?? ""}
            </td>
            <td
              className={`w-1/2 px-3 py-0 whitespace-pre ${
                pair.right?.type === "add"
                  ? "bg-green-500/10 text-green-300"
                  : pair.right
                    ? "text-gray-300"
                    : "bg-[#161b22]"
              }`}
            >
              {pair.right && (
                <>
                  <span className="select-none mr-2 inline-block w-3 text-center">
                    {pair.right.type === "add" ? "+" : " "}
                  </span>
                  <HighlightedLine
                    content={pair.right.content}
                    filename={filename}
                  />
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

/* ── File Diff Card ────────────────────────────────────── */

const FileDiffCardEnhanced = memo(function FileDiffCardEnhanced({
  file,
  viewMode,
  isSelected,
  onSelect,
}: {
  file: PRFile;
  viewMode: DiffViewMode;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showFullDiff, setShowFullDiff] = useState(false);

  const statusColor: Record<string, string> = {
    added: "text-green-400",
    removed: "text-red-400",
    modified: "text-yellow-400",
    renamed: "text-blue-400",
    copied: "text-blue-400",
  };

  const statusIcon: Record<string, string> = {
    added: "A",
    removed: "D",
    modified: "M",
    renamed: "R",
    copied: "C",
  };

  const hunks = useMemo(() => {
    if (!file.patch) return [];
    return parsePatch(file.patch);
  }, [file.patch]);

  const totalLines = useMemo(
    () => hunks.reduce((acc, h) => acc + h.lines.length, 0),
    [hunks],
  );
  const isLargeDiff = totalLines > LARGE_DIFF_LINE_THRESHOLD;

  const truncatedHunks = useMemo(() => {
    if (!isLargeDiff || showFullDiff) return hunks;
    let count = 0;
    const result: DiffHunk[] = [];
    for (const hunk of hunks) {
      if (count >= LARGE_DIFF_LINE_THRESHOLD) break;
      const remaining = LARGE_DIFF_LINE_THRESHOLD - count;
      if (hunk.lines.length <= remaining) {
        result.push(hunk);
        count += hunk.lines.length;
      } else {
        result.push({ ...hunk, lines: hunk.lines.slice(0, remaining) });
        count = LARGE_DIFF_LINE_THRESHOLD;
      }
    }
    return result;
  }, [hunks, isLargeDiff, showFullDiff]);

  const handleToggle = useCallback(() => {
    setExpanded((v) => !v);
    onSelect();
  }, [onSelect]);

  return (
    <div
      id={`file-${file.filename}`}
      className={`border rounded-md overflow-hidden ${
        isSelected
          ? "border-blue-500/50"
          : "border-[#30363d]"
      }`}
    >
      {/* File header */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 w-full px-4 py-2 bg-[#161b22] hover:bg-[#1c2128] text-left transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}
        <span
          className={`text-xs font-bold w-4 text-center ${statusColor[file.status] ?? "text-gray-400"}`}
        >
          {statusIcon[file.status] ?? "?"}
        </span>
        <span className="text-sm text-gray-200 truncate flex-1 font-mono">
          {file.filename}
        </span>
        <span className="flex items-center gap-2 text-xs flex-shrink-0">
          {file.additions > 0 && (
            <span className="text-green-400">+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className="text-red-400">-{file.deletions}</span>
          )}
        </span>
      </button>

      {/* Diff content */}
      {expanded && file.patch && (
        <div className="overflow-x-auto border-t border-[#30363d]">
          {viewMode === "unified" ? (
            <UnifiedDiffView
              hunks={truncatedHunks}
              filename={file.filename}
            />
          ) : (
            <SplitDiffView
              hunks={truncatedHunks}
              filename={file.filename}
            />
          )}
          {isLargeDiff && !showFullDiff && (
            <div className="flex justify-center py-3 bg-[#161b22] border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setShowFullDiff(true)}
                className="px-4 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 rounded-md hover:bg-blue-500/10 transition-colors"
              >
                Load full diff ({totalLines} lines)
              </button>
            </div>
          )}
        </div>
      )}

      {expanded && !file.patch && (
        <div className="px-4 py-3 text-sm text-gray-500 italic border-t border-[#30363d]">
          No diff available (binary file or too large).
        </div>
      )}
    </div>
  );
});

/* ── File Tree Sidebar ─────────────────────────────────── */

const FileTreeSidebar = memo(function FileTreeSidebar({
  files,
  selectedFile,
  onSelectFile,
}: {
  files: PRFile[];
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
}) {
  const statusColor: Record<string, string> = {
    added: "text-green-400",
    removed: "text-red-400",
    modified: "text-yellow-400",
    renamed: "text-blue-400",
    copied: "text-blue-400",
  };

  const statusIcon: Record<string, string> = {
    added: "A",
    removed: "D",
    modified: "M",
    renamed: "R",
    copied: "C",
  };

  // Group files by directory
  const fileTree = useMemo(() => {
    const tree: Record<string, PRFile[]> = {};
    for (const file of files) {
      const parts = file.filename.split("/");
      const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(file);
    }
    return Object.entries(tree).sort(([a], [b]) => a.localeCompare(b));
  }, [files]);

  return (
    <div className="w-64 border-r border-[#30363d] bg-[#161b22] overflow-y-auto flex-shrink-0">
      <div className="px-3 py-2 border-b border-[#30363d]">
        <h3 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Files ({files.length})
        </h3>
      </div>
      <div className="py-1">
        {fileTree.map(([dir, dirFiles]) => (
          <div key={dir}>
            {dir !== "." && (
              <div className="px-3 py-1 text-xs text-gray-500 font-mono truncate">
                {dir}/
              </div>
            )}
            {dirFiles.map((file) => {
              const name =
                file.filename.split("/").pop() ?? file.filename;
              const isActive = selectedFile === file.filename;
              return (
                <button
                  key={file.filename}
                  type="button"
                  onClick={() => onSelectFile(file.filename)}
                  className={`w-full text-left px-3 py-1 text-xs font-mono flex items-center gap-2 hover:bg-[#21262d] transition-colors truncate ${
                    isActive
                      ? "bg-[#21262d] text-white"
                      : "text-gray-300"
                  }`}
                  title={file.filename}
                >
                  <span
                    className={`font-bold w-3 text-center flex-shrink-0 ${statusColor[file.status] ?? "text-gray-400"}`}
                  >
                    {statusIcon[file.status] ?? "?"}
                  </span>
                  <span className="truncate">{name}</span>
                  <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                    {file.additions > 0 && (
                      <span className="text-green-400">
                        +{file.additions}
                      </span>
                    )}
                    {file.deletions > 0 && (
                      <span className="text-red-400">
                        -{file.deletions}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── Main DiffView Component ───────────────────────────── */

export interface DiffViewProps {
  files: PRFile[];
  isLoading?: boolean;
}

export const DiffView = memo(function DiffView({
  files,
  isLoading,
}: DiffViewProps) {
  const [viewMode, setViewMode] = useState<DiffViewMode>("unified");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleSelectFile = useCallback((filename: string) => {
    setSelectedFile(filename);
    const element = document.getElementById(`file-${filename}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <FileText className="w-8 h-8 mb-2" />
        <p className="text-sm">No file changes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#30363d] bg-[#161b22] flex-shrink-0">
        <span className="text-xs text-gray-400">
          {files.length} file{files.length !== 1 ? "s" : ""} changed
          <span className="text-green-400 ml-2">
            +{files.reduce((s, f) => s + f.additions, 0)}
          </span>
          <span className="text-red-400 ml-1">
            -{files.reduce((s, f) => s + f.deletions, 0)}
          </span>
        </span>
        <div className="flex items-center gap-1 bg-[#0d1117] rounded-md border border-[#30363d]">
          <button
            type="button"
            onClick={() => setViewMode("unified")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors rounded-l-md ${
              viewMode === "unified"
                ? "bg-[#21262d] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Unified view"
          >
            <AlignJustify className="w-3.5 h-3.5" />
            Unified
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs transition-colors rounded-r-md ${
              viewMode === "split"
                ? "bg-[#21262d] text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Split view"
          >
            <Columns2 className="w-3.5 h-3.5" />
            Split
          </button>
        </div>
      </div>

      {/* Content with file tree sidebar */}
      <div className="flex flex-1 min-h-0">
        {files.length > 1 && (
          <FileTreeSidebar
            files={files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />
        )}

        {/* Virtualized diff area */}
        <VirtualizedFileList
          files={files}
          viewMode={viewMode}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
        />
      </div>
    </div>
  );
});

/* ── Virtualized File List ─────────────────────────────── */

const VirtualizedFileList = memo(function VirtualizedFileList({
  files,
  viewMode,
  selectedFile,
  onSelectFile,
}: {
  files: PRFile[];
  viewMode: DiffViewMode;
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto p-4">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const file = files[virtualItem.index];
          return (
            <div
              key={file.filename}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="mb-3">
                <FileDiffCardEnhanced
                  file={file}
                  viewMode={viewMode}
                  isSelected={selectedFile === file.filename}
                  onSelect={() => onSelectFile(file.filename)}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Fallback for environments without layout (SSR/tests) */}
      {virtualizer.getVirtualItems().length === 0 && (
        <div className="space-y-3">
          {files.map((file) => (
            <FileDiffCardEnhanced
              key={file.filename}
              file={file}
              viewMode={viewMode}
              isSelected={selectedFile === file.filename}
              onSelect={() => onSelectFile(file.filename)}
            />
          ))}
        </div>
      )}
    </div>
  );
});
