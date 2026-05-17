"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Copy, Download, GitBranch, GitCommit, User, X } from "lucide-react";
import Prism from "prismjs";
import { useMemo, useRef, useState } from "react";
import { useFileBlame, useFileContents } from "@/hooks/useGitData";
import { useToast } from "@/hooks/useToast";
import { useAppStore } from "@/store/useAppStore";
// Core language components (load in dependency order)
import "prismjs/components/prism-markup"; // Base for HTML/XML - must load first
import "prismjs/components/prism-markup-templating"; // Required by PHP - must load after markup
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-yaml";
// Additional languages
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-php"; // Requires markup-templating
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-scala";
import "prismjs/themes/prism-tomorrow.css";

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  branchRef?: string;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    json: "json",
    css: "css",
    scss: "scss",
    sass: "scss",
    md: "markdown",
    py: "python",
    sh: "bash",
    bash: "bash",
    yaml: "yaml",
    yml: "yaml",
    html: "markup", // Prism uses 'markup' for HTML
    htm: "markup",
    xml: "markup", // Prism uses 'markup' for XML
    rs: "rust",
    go: "go",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    sql: "sql",
  };
  return langMap[ext] || "text";
}

interface BlameTooltipProps {
  blame: { hash: string; author: string; date: string; message: string };
  x: number;
  y: number;
}

function BlameTooltip({ blame, x, y }: BlameTooltipProps) {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Show relative time for recent commits
      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMins = Math.floor(diffMs / (1000 * 60));
          return diffMins < 1 ? "just now" : `${diffMins}m ago`;
        }
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}w ago`;
      }

      // For older commits, show date
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -5 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: "translateY(-50%)",
      }}
    >
      {/* Glassmorphic container with enhanced effects */}
      <div className="relative">
        {/* Glassmorphic background with multiple layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg" />
        <div className="absolute inset-0 bg-[#0d1117]/40 backdrop-blur-xl rounded-lg" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#58a6ff]/5 via-transparent to-transparent rounded-lg" />

        {/* Main content container */}
        <div className="relative border border-white/10 rounded-lg shadow-2xl p-2.5 min-w-[200px] max-w-[280px] backdrop-blur-xl bg-[#0d1117]/30">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

          {/* Content */}
          <div className="relative">
            {/* Compact header with author and date */}
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="p-0.5 rounded bg-white/5">
                  <User className="w-3 h-3 text-gray-300 shrink-0" />
                </div>
                <span className="text-xs font-medium text-white/90 truncate drop-shadow-sm">
                  {blame.author}
                </span>
              </div>
              <span className="text-[10px] text-gray-400/80 shrink-0 whitespace-nowrap backdrop-blur-sm px-1.5 py-0.5 rounded bg-white/5">
                {formatDate(blame.date)}
              </span>
            </div>

            {/* Commit hash - compact with glassmorphic badge */}
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-0.5 rounded bg-white/5">
                <GitCommit className="w-3 h-3 text-gray-300 shrink-0" />
              </div>
              <code className="text-[10px] text-[#58a6ff] font-mono px-1.5 py-0.5 rounded bg-[#58a6ff]/10 border border-[#58a6ff]/20 backdrop-blur-sm">
                {blame.hash.substring(0, 7)}
              </code>
            </div>

            {/* Commit message - single line, truncated with subtle background */}
            <p className="text-[10px] text-gray-200/90 line-clamp-1 leading-tight px-1 py-0.5 rounded bg-white/5 backdrop-blur-sm">
              {blame.message}
            </p>
          </div>
        </div>

        {/* Outer glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-[#58a6ff]/20 via-transparent to-transparent rounded-lg blur-sm opacity-50 -z-10" />
      </div>
    </motion.div>
  );
}

export function FileViewerModal({
  isOpen,
  onClose,
  filePath,
  branchRef,
}: FileViewerModalProps) {
  const _repoInfo = useAppStore((state) => state.repoInfo);
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  // Use branchRef prop if provided, otherwise use selected branch, fallback to undefined (default branch)
  const effectiveRef = branchRef || selectedBranch || undefined;
  const {
    data: fileData,
    isLoading,
    error,
  } = useFileContents(filePath, effectiveRef);
  const [blameEnabled, setBlameEnabled] = useState(false);

  // Prefetch blame data when file loads (but don't enable blame view yet)
  // This will automatically fetch when fileData is ready
  const {
    data: prefetchedBlameData,
    isSuccess: isBlameReady,
    isLoading: isBlameLoading,
  } = useFileBlame(fileData && filePath ? filePath : null, effectiveRef);

  // Use the prefetched data when blame is enabled
  const blameData = blameEnabled ? prefetchedBlameData : null;

  const toast = useToast();
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  const language = useMemo(() => detectLanguage(filePath), [filePath]);

  const lines = useMemo(() => {
    if (!fileData?.content) return [];
    return fileData.content.split("\n");
  }, [fileData?.content]);

  const highlightedLines = useMemo(() => {
    if (!fileData?.content) return [];

    try {
      const grammar = Prism.languages[language] || Prism.languages.text;
      if (!grammar) {
        // Fallback to plain text if language not supported
        return fileData.content.split("\n");
      }
      const fullHighlighted = Prism.highlight(
        fileData.content,
        grammar,
        language,
      );
      return fullHighlighted.split("\n");
    } catch (error) {
      // If highlighting fails (e.g., missing dependencies), return plain text
      console.warn(`Failed to highlight ${language}:`, error);
      return fileData.content.split("\n");
    }
  }, [fileData?.content, language]);

  const blameMap = useMemo(() => {
    if (!blameData || !Array.isArray(blameData) || blameData.length === 0) {
      return new Map<
        number,
        { hash: string; author: string; date: string; message: string }
      >();
    }
    const map = new Map();
    blameData.forEach((blame) => {
      // Only add if we have valid blame data
      if (blame?.lineNumber && blame.hash) {
        map.set(blame.lineNumber, {
          hash: blame.hash,
          author: blame.author || "Unknown",
          date: blame.date || new Date().toISOString(),
          message: blame.message || "No message",
        });
      }
    });
    return map;
  }, [blameData]);

  const handleLineHover = (lineNumber: number, event: React.MouseEvent) => {
    if (blameEnabled && blameMap.has(lineNumber)) {
      setHoveredLine(lineNumber);
      const rect = event.currentTarget.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = 280; // max-w-[280px]
      const tooltipHeight = 80; // Approximate height

      // Always position tooltip to the right of the code
      // Add some padding from the code edge
      let x = rect.right + 16;

      // Only move to left if there's absolutely no space on the right
      // (less than 100px available on right side)
      const spaceOnRight = viewportWidth - rect.right;
      if (spaceOnRight < 100) {
        // Still try to keep it on right but adjust position
        x = Math.max(rect.right + 8, viewportWidth - tooltipWidth - 20);
        // If still not enough space, only then use left side
        if (x + tooltipWidth > viewportWidth - 20) {
          x = rect.left - tooltipWidth - 16;
        }
      }

      // Position vertically centered on the line, but adjust if it would go off-screen
      let y = rect.top + rect.height / 2;
      if (y + tooltipHeight / 2 > viewportHeight - 20) {
        y = viewportHeight - tooltipHeight / 2 - 20;
      } else if (y - tooltipHeight / 2 < 20) {
        y = tooltipHeight / 2 + 20;
      }

      setTooltipPosition({
        x: Math.max(20, Math.min(x, viewportWidth - tooltipWidth - 20)),
        y: Math.max(20, Math.min(y, viewportHeight - 20)),
      });
    }
  };

  const handleLineLeave = () => {
    setHoveredLine(null);
    setTooltipPosition(null);
  };

  const copyToClipboard = async () => {
    if (!fileData?.content) return;

    try {
      await navigator.clipboard.writeText(fileData.content);
      toast.showSuccess("Copied to clipboard");
    } catch {
      toast.showError("Failed to copy");
    }
  };

  const downloadFile = () => {
    if (!fileData?.content) return;

    const blob = new Blob([fileData.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.showSuccess("File downloaded");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-[90vw] h-[85vh] max-w-6xl bg-[#0d1117] border border-[#30363d] rounded-lg shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="File Viewer"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  {filePath}
                </h2>
                <span className="px-2 py-0.5 bg-[#21262d] rounded text-xs text-gray-400 shrink-0">
                  {language}
                </span>
                {fileData && (
                  <span className="text-xs text-gray-500 shrink-0">
                    {fileData.size.toLocaleString()} bytes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {fileData && (
                  <>
                    <button
                      onClick={() => setBlameEnabled(!blameEnabled)}
                      disabled={!isBlameReady}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${
                        !isBlameReady
                          ? "text-gray-600 cursor-not-allowed opacity-50"
                          : blameEnabled
                            ? "bg-[#1f6feb] text-white hover:bg-[#1a5cd8]"
                            : "text-gray-400 hover:text-white hover:bg-[#21262d]"
                      }`}
                      title={
                        !isBlameReady
                          ? "Loading blame data..."
                          : blameEnabled
                            ? "Disable blame view"
                            : "Enable blame view"
                      }
                      aria-label={
                        !isBlameReady
                          ? "Loading blame data..."
                          : blameEnabled
                            ? "Disable blame view"
                            : "Enable blame view"
                      }
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Blame
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                      title="Copy to clipboard"
                      aria-label="Copy to clipboard"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={downloadFile}
                      className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                      title="Download file"
                      aria-label="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0 bg-[#0d1117]">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-t-transparent border-[#1f6feb] rounded-full animate-spin" />
                    <span className="text-sm text-gray-400">
                      Loading file...
                    </span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full text-red-400">
                  <div className="text-center px-4">
                    <p className="text-sm font-medium mb-2">
                      Failed to load file
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      {error instanceof Error ? error.message : String(error)}
                    </p>
                    {effectiveRef && (
                      <p className="text-xs text-gray-600">
                        Trying to load from:{" "}
                        <span className="font-mono">{effectiveRef}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-2">
                      The file may not exist on this branch or the branch name
                      may be invalid.
                    </p>
                  </div>
                </div>
              ) : fileData ? (
                <div ref={codeRef} className="relative overflow-auto h-full">
                  <div className="flex min-h-full">
                    {/* Line numbers */}
                    <div className="shrink-0 bg-[#161b22] border-r border-[#30363d] px-3 py-4 text-right select-none sticky left-0 z-10">
                      <div className="font-mono text-xs text-gray-500">
                        {lines.map((_, index) => (
                          <div
                            key={index}
                            className="h-[1.5em] leading-[1.5em] hover:text-gray-400 transition-colors"
                          >
                            {index + 1}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Code content */}
                    <div className="flex-1 relative min-w-0">
                      <pre className="text-xs font-mono text-gray-200 p-4 m-0 overflow-x-auto">
                        <code className={`language-${language}`}>
                          {lines.map((line, index) => {
                            const lineNumber = index + 1;
                            const hasBlame = blameMap.has(lineNumber);
                            const highlightedLine =
                              highlightedLines[index] || line;

                            return (
                              <div
                                key={index}
                                className={`group relative h-[1.5em] leading-[1.5em] whitespace-pre ${
                                  blameEnabled && hasBlame
                                    ? "cursor-help hover:bg-[#1c2128]/50"
                                    : ""
                                } ${hoveredLine === lineNumber ? "bg-[#1c2128]" : ""}`}
                                onMouseEnter={(e) =>
                                  blameEnabled &&
                                  hasBlame &&
                                  handleLineHover(lineNumber, e)
                                }
                                onMouseLeave={handleLineLeave}
                                dangerouslySetInnerHTML={{
                                  __html: highlightedLine || "&nbsp;",
                                }}
                              />
                            );
                          })}
                        </code>
                      </pre>
                    </div>
                  </div>

                  {/* Blame tooltip */}
                  <AnimatePresence>
                    {hoveredLine &&
                      tooltipPosition &&
                      blameMap.has(hoveredLine) && (
                        <BlameTooltip
                          blame={blameMap.get(hoveredLine)!}
                          x={tooltipPosition.x}
                          y={tooltipPosition.y}
                        />
                      )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  No content
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
