"use client";

export interface Token {
  type:
    | "identifier"
    | "string"
    | "number"
    | "keyword"
    | "operator"
    | "punctuation"
    | "whitespace"
    | "other";
  value: string;
  start: number;
  end: number;
}

/**
 * Parse a line of code into tokens
 */
export function parseTokens(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  // Simple tokenizer for common patterns
  const patterns = [
    // Strings (single or double quoted)
    { regex: /^(["'])(?:(?=(\\?))\2.)*?\1/, type: "string" as const },
    // Numbers (integers and floats)
    { regex: /^-?\d+\.?\d*/, type: "number" as const },
    // Identifiers (variable names, function names)
    { regex: /^[a-zA-Z_$][a-zA-Z0-9_$]*/, type: "identifier" as const },
    // Keywords (common JS/TS keywords)
    {
      regex:
        /^(const|let|var|function|class|if|else|for|while|return|import|export|async|await|new|this|typeof|instanceof)\b/,
      type: "keyword" as const,
    },
    // Operators
    {
      regex: /^(===|!==|==|!=|<=|>=|=>|&&|\|\||\+|-|\*|\/|%|=|>|<|!)/,
      type: "operator" as const,
    },
    // Punctuation
    { regex: /^[{}()[\];,.:]/, type: "punctuation" as const },
    // Whitespace
    { regex: /^\s+/, type: "whitespace" as const },
  ];

  while (i < line.length) {
    let matched = false;

    for (const pattern of patterns) {
      const match = line.slice(i).match(pattern.regex);
      if (match) {
        const value = match[0];
        tokens.push({
          type: pattern.type,
          value,
          start: i,
          end: i + value.length,
        });
        i += value.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Single character fallback
      tokens.push({
        type: "other",
        value: line[i],
        start: i,
        end: i + 1,
      });
      i++;
    }
  }

  return tokens;
}

/**
 * Compare tokens between old and new lines to identify changed tokens
 */
export function findChangedTokens(
  oldLine: string,
  newLine: string,
): { oldTokens: Token[]; newTokens: Token[]; changedIndices: Set<number> } {
  const oldTokens = parseTokens(oldLine);
  const newTokens = parseTokens(newLine);
  const changedIndices = new Set<number>();

  // Simple comparison: tokens at same position with different values
  const maxLen = Math.max(oldTokens.length, newTokens.length);

  for (let i = 0; i < maxLen; i++) {
    const oldToken = oldTokens[i];
    const newToken = newTokens[i];

    if (!oldToken || !newToken) {
      // Token added or removed
      if (oldToken) changedIndices.add(i);
      if (newToken) changedIndices.add(i);
    } else if (
      oldToken.value !== newToken.value &&
      oldToken.type === newToken.type
    ) {
      // Same type but different value (likely a rename or value change)
      changedIndices.add(i);
    } else if (oldToken.type !== newToken.type) {
      // Type changed
      changedIndices.add(i);
    }
  }

  // Also check for identifier changes (variable/function names)
  const oldIdentifiers = oldTokens
    .filter((t) => t.type === "identifier")
    .map((t) => t.value);
  const newIdentifiers = newTokens
    .filter((t) => t.type === "identifier")
    .map((t) => t.value);

  // Find renamed identifiers (same position, different name)
  for (
    let i = 0;
    i < Math.min(oldIdentifiers.length, newIdentifiers.length);
    i++
  ) {
    if (oldIdentifiers[i] !== newIdentifiers[i]) {
      // Find the token indices
      let oldIdx = 0;
      let newIdx = 0;
      for (let j = 0; j < oldTokens.length; j++) {
        if (
          oldTokens[j].type === "identifier" &&
          oldTokens[j].value === oldIdentifiers[i]
        ) {
          oldIdx = j;
          break;
        }
      }
      for (let j = 0; j < newTokens.length; j++) {
        if (
          newTokens[j].type === "identifier" &&
          newTokens[j].value === newIdentifiers[i]
        ) {
          newIdx = j;
          break;
        }
      }
      if (oldIdx === newIdx) {
        changedIndices.add(oldIdx);
      }
    }
  }

  return { oldTokens, newTokens, changedIndices };
}
