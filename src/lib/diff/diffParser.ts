"use client";

import { type Change, diffWords } from "diff";

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changes: DiffChange[];
}

export interface DiffChange {
  type: "add" | "remove" | "context";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  wordChanges?: WordChange[];
}

export interface WordChange {
  type: "add" | "remove" | "unchanged";
  value: string;
}

export interface ParsedFileDiff {
  oldPath: string;
  newPath: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
  isBinary: boolean;
  isRenamed: boolean;
  isNew: boolean;
  isDeleted: boolean;
}

export interface ParsedDiff {
  files: ParsedFileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

/**
 * Parse a unified diff string into structured data
 */
export function parseUnifiedDiff(diffText: string): ParsedDiff {
  const files: ParsedFileDiff[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  // Split by file diffs
  const fileDiffs = diffText.split(/^(?=diff --git)/m).filter(Boolean);

  for (const fileDiff of fileDiffs) {
    const parsed = parseFileDiff(fileDiff);
    if (parsed) {
      files.push(parsed);
      totalAdditions += parsed.additions;
      totalDeletions += parsed.deletions;
    }
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  };
}

/**
 * Parse a single file's diff
 */
function parseFileDiff(fileDiff: string): ParsedFileDiff | null {
  const lines = fileDiff.split("\n");
  if (lines.length === 0) return null;

  // Extract file paths
  const gitDiffMatch = lines[0].match(/diff --git a\/(.+?) b\/(.+)/);
  if (!gitDiffMatch) return null;

  let oldPath = gitDiffMatch[1];
  let newPath = gitDiffMatch[2];

  // Handle quoted paths
  oldPath = oldPath.replace(/^"|"$/g, "");
  newPath = newPath.replace(/^"|"$/g, "");

  // Check for special cases
  const isBinary = fileDiff.includes("Binary files");
  const isNew = fileDiff.includes("new file mode");
  const isDeleted = fileDiff.includes("deleted file mode");
  const isRenamed = oldPath !== newPath;

  // Parse hunks
  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  // Find hunk starts
  const hunkRegex = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g;
  let match: RegExpExecArray | null;
  const hunkPositions: {
    index: number;
    header: string;
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
  }[] = [];

  while ((match = hunkRegex.exec(fileDiff)) !== null) {
    hunkPositions.push({
      index: match.index,
      header: match[0],
      oldStart: parseInt(match[1], 10),
      oldLines: match[2] ? parseInt(match[2], 10) : 1,
      newStart: parseInt(match[3], 10),
      newLines: match[4] ? parseInt(match[4], 10) : 1,
    });
  }

  // Parse each hunk
  for (let i = 0; i < hunkPositions.length; i++) {
    const hunkPos = hunkPositions[i];
    const nextHunkPos = hunkPositions[i + 1];

    // Get hunk content
    const hunkStart = hunkPos.index + hunkPos.header.length + 1;
    const hunkEnd = nextHunkPos ? nextHunkPos.index : fileDiff.length;
    const hunkContent = fileDiff.slice(hunkStart, hunkEnd);

    const changes: DiffChange[] = [];
    const hunkLines = hunkContent.split("\n");

    let oldLineNum = hunkPos.oldStart;
    let newLineNum = hunkPos.newStart;

    for (const line of hunkLines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        changes.push({
          type: "add",
          newLineNumber: newLineNum,
          content: line.slice(1),
        });
        newLineNum++;
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        changes.push({
          type: "remove",
          oldLineNumber: oldLineNum,
          content: line.slice(1),
        });
        oldLineNum++;
        deletions++;
      } else if (line.startsWith(" ") || line === "") {
        changes.push({
          type: "context",
          oldLineNumber: oldLineNum,
          newLineNumber: newLineNum,
          content: line.startsWith(" ") ? line.slice(1) : line,
        });
        oldLineNum++;
        newLineNum++;
      }
    }

    hunks.push({
      oldStart: hunkPos.oldStart,
      oldLines: hunkPos.oldLines,
      newStart: hunkPos.newStart,
      newLines: hunkPos.newLines,
      changes,
    });
  }

  return {
    oldPath,
    newPath,
    hunks,
    additions,
    deletions,
    isBinary,
    isRenamed,
    isNew,
    isDeleted,
  };
}

/**
 * Compute word-level changes between two lines
 */
export function computeWordChanges(
  oldLine: string,
  newLine: string,
): WordChange[] {
  const changes = diffWords(oldLine, newLine);
  return changes.map((change: Change) => ({
    type: change.added ? "add" : change.removed ? "remove" : "unchanged",
    value: change.value,
  }));
}

/**
 * Create side-by-side diff data from hunks
 */
export interface SideBySideLine {
  left?: {
    lineNumber: number;
    content: string;
    type: "remove" | "context";
    wordChanges?: WordChange[];
  };
  right?: {
    lineNumber: number;
    content: string;
    type: "add" | "context";
    wordChanges?: WordChange[];
  };
  type: "add" | "remove" | "modify" | "context";
}

export function createSideBySideData(hunks: DiffHunk[]): SideBySideLine[] {
  const result: SideBySideLine[] = [];

  for (const hunk of hunks) {
    let i = 0;
    while (i < hunk.changes.length) {
      const change = hunk.changes[i];

      if (change.type === "context") {
        result.push({
          left: {
            lineNumber: change.oldLineNumber!,
            content: change.content,
            type: "context",
          },
          right: {
            lineNumber: change.newLineNumber!,
            content: change.content,
            type: "context",
          },
          type: "context",
        });
        i++;
      } else if (change.type === "remove") {
        // Look ahead for matching add (modification)
        const removes: DiffChange[] = [];
        while (i < hunk.changes.length && hunk.changes[i].type === "remove") {
          removes.push(hunk.changes[i]);
          i++;
        }

        const adds: DiffChange[] = [];
        while (i < hunk.changes.length && hunk.changes[i].type === "add") {
          adds.push(hunk.changes[i]);
          i++;
        }

        // Match removes with adds
        const maxLen = Math.max(removes.length, adds.length);
        for (let j = 0; j < maxLen; j++) {
          const remove = removes[j];
          const add = adds[j];

          if (remove && add) {
            // Modification: compute word changes
            const wordChanges = computeWordChanges(remove.content, add.content);
            result.push({
              left: {
                lineNumber: remove.oldLineNumber!,
                content: remove.content,
                type: "remove",
                wordChanges: wordChanges.filter((w) => w.type !== "add"),
              },
              right: {
                lineNumber: add.newLineNumber!,
                content: add.content,
                type: "add",
                wordChanges: wordChanges.filter((w) => w.type !== "remove"),
              },
              type: "modify",
            });
          } else if (remove) {
            // Pure deletion
            result.push({
              left: {
                lineNumber: remove.oldLineNumber!,
                content: remove.content,
                type: "remove",
              },
              type: "remove",
            });
          } else if (add) {
            // Pure addition
            result.push({
              right: {
                lineNumber: add.newLineNumber!,
                content: add.content,
                type: "add",
              },
              type: "add",
            });
          }
        }
      } else if (change.type === "add") {
        // Pure addition (no preceding remove)
        result.push({
          right: {
            lineNumber: change.newLineNumber!,
            content: change.content,
            type: "add",
          },
          type: "add",
        });
        i++;
      }
    }
  }

  return result;
}
