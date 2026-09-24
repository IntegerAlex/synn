"use client";

export interface SemanticChange {
  type:
    | "function-signature"
    | "variable-rename"
    | "initialization"
    | "refactor"
    | "addition"
    | "deletion";
  description: string;
  scope: string; // e.g., "userInfo()"
  oldValue?: string;
  newValue?: string;
  lineNumber?: number;
}

/**
 * Analyze semantic changes between old and new code using line patterns.
 *
 * Note: this deliberately avoids the TypeScript compiler API. Importing
 * `typescript` into a client module pulled ~1MB gzip into the browser bundle,
 * which dominated the diff/commit UX. The pattern analyzer below covers the
 * same high-signal cases (signature changes, function additions, init vars).
 */
export function analyzeSemanticChanges(
  oldCode: string,
  newCode: string,
  language: string,
): SemanticChange[] {
  return analyzeWithPatterns(oldCode, newCode, language);
}

/**
 * Pattern matching for common languages.
 */
function analyzeWithPatterns(
  oldCode: string,
  newCode: string,
  language: string,
): SemanticChange[] {
  const changes: SemanticChange[] = [];
  const oldLines = oldCode.split("\n");
  const newLines = newCode.split("\n");

  // Detect function signature changes (basic regex)
  const funcPatterns: Record<string, RegExp> = {
    typescript: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    javascript: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    python: /^def\s+(\w+)\s*\(([^)]*)\)/,
  };

  const pattern = funcPatterns[language];
  if (pattern) {
    const oldFuncs = new Map<string, string>();
    const newFuncs = new Map<string, string>();

    oldLines.forEach((line) => {
      const match = line.match(pattern);
      if (match) {
        oldFuncs.set(match[1], match[2] || "");
      }
    });

    newLines.forEach((line, idx) => {
      const match = line.match(pattern);
      if (match) {
        newFuncs.set(match[1], match[2] || "");
        const oldParams = oldFuncs.get(match[1]);
        if (oldParams !== undefined && oldParams !== match[2]) {
          changes.push({
            type: "function-signature",
            description: `Function signature changed: "${match[1]}"`,
            scope: `${match[1]}()`,
            oldValue: oldParams,
            newValue: match[2] || "",
            lineNumber: idx + 1,
          });
        } else if (oldParams === undefined) {
          changes.push({
            type: "addition",
            description: `Function "${match[1]}" added`,
            scope: `${match[1]}()`,
            lineNumber: idx + 1,
          });
        }
      }
    });
  }

  // Detect initialization patterns
  const initPatterns = [
    /(?:const|let|var)\s+(\w*telemetry\w*)\s*=/,
    /(?:const|let|var)\s+(\w*config\w*)\s*=/,
    /(?:const|let|var)\s+(\w*init\w*)\s*=/,
  ];

  newLines.forEach((line, idx) => {
    for (const initPattern of initPatterns) {
      const match = line.match(initPattern);
      if (match) {
        const varName = match[1];
        const wasInOld = oldLines.some((l) => l.includes(varName));
        if (!wasInOld) {
          changes.push({
            type: "initialization",
            description: `${capitalize(varName)} initialization added`,
            scope: "global",
            lineNumber: idx + 1,
          });
        }
      }
    }
  });

  return changes;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extract semantic scope from a change group
 */
export function extractSemanticScope(group: {
  title: string;
  type: string;
  changes: Array<{ left?: { content: string }; right?: { content: string } }>;
}): string {
  // Try to find function/class name from changes
  for (const change of group.changes) {
    const content = change.right?.content || change.left?.content || "";

    // Match function patterns
    const funcMatch = content.match(
      /(?:function|const|let|var)\s+(\w+)\s*[=(]/,
    );
    if (funcMatch) {
      return `${funcMatch[1]}()`;
    }

    // Match class patterns
    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
      return classMatch[1];
    }
  }

  // Fallback to group title
  return group.title;
}
