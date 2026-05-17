"use client";

import Prism from "prismjs";

// Load common languages we expect in repos.
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markdown";

export type HighlightedDiffLine = {
  prefix: string; // '+', '-', ' ', or ''
  html: string; // highlighted (escaped) HTML for the remainder (without prefix)
  className: string;
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function detectPrismLanguageFromFilePath(filePath?: string): string {
  if (!filePath) return "typescript";
  const lower = filePath.toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop() || "" : "";

  switch (ext) {
    case "ts":
      return "typescript";
    case "tsx":
      return "tsx";
    case "js":
      return "javascript";
    case "jsx":
      return "jsx";
    case "json":
      return "json";
    case "py":
      return "python";
    case "sh":
    case "bash":
      return "bash";
    case "md":
    case "markdown":
      return "markdown";
    case "css":
      return "css";
    case "html":
    case "htm":
      return "markup";
    default:
      return "typescript";
  }
}

function highlight(content: string, languageId: string): string {
  const grammar = (Prism.languages as any)[languageId] as
    | Prism.Grammar
    | undefined;
  if (!grammar) return escapeHtml(content);
  try {
    return Prism.highlight(content, grammar, languageId);
  } catch {
    return escapeHtml(content);
  }
}

export function highlightUnifiedDiffLines(
  diffText: string,
  languageHintFilePath?: string,
): HighlightedDiffLine[] {
  const languageId = detectPrismLanguageFromFilePath(languageHintFilePath);

  const lines = diffText.split("\n");
  return lines.map((line) => {
    const isAdded = line.startsWith("+") && !line.startsWith("+++");
    const isRemoved = line.startsWith("-") && !line.startsWith("---");
    const isHunk = line.startsWith("@@");
    const isFileHeader =
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("+++") ||
      line.startsWith("---");

    if (isHunk) {
      return {
        prefix: "",
        html: escapeHtml(line),
        className: "text-[#ef4444]",
      };
    }

    if (isFileHeader) {
      return {
        prefix: "",
        html: escapeHtml(line),
        className: "text-gray-400",
      };
    }

    const prefix = line.length > 0 ? line[0] : "";
    const rest =
      prefix && ["+", "-", " "].includes(prefix) ? line.slice(1) : line;

    if (isAdded) {
      return {
        prefix: "+",
        html: highlight(rest, languageId),
        className: "text-[#3fb950]",
      };
    }

    if (isRemoved) {
      return {
        prefix: "-",
        html: highlight(rest, languageId),
        className: "text-[#f85149]",
      };
    }

    if (prefix === " ") {
      return {
        prefix: " ",
        html: highlight(rest, languageId),
        className: "text-gray-300",
      };
    }

    return {
      prefix: "",
      html: escapeHtml(line),
      className: "text-gray-300",
    };
  });
}
