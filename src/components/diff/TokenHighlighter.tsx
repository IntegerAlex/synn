'use client';

import { useMemo, memo } from 'react';
import { parseTokens, findChangedTokens, type Token } from '@/lib/diff/tokenParser';

interface TokenHighlighterProps {
  oldLine?: string;
  newLine?: string;
  isAdd?: boolean;
  isRemove?: boolean;
  isModify?: boolean;
}

export const TokenHighlighter = memo(function TokenHighlighter({
  oldLine,
  newLine,
  isAdd,
  isRemove,
  isModify,
}: TokenHighlighterProps) {
  const highlightedContent = useMemo(() => {
    const line = newLine || oldLine || '';
    
    if (isModify && oldLine && newLine) {
      // For modifications, highlight changed tokens
      const { newTokens, changedIndices } = findChangedTokens(oldLine, newLine);
      return renderTokensWithHighlights(newTokens, changedIndices, isAdd ?? false);
    } else if (isAdd && newLine) {
      // For additions, highlight all identifiers
      const tokens = parseTokens(newLine);
      const identifierIndices = new Set(
        tokens
          .map((t, i) => (t.type === 'identifier' ? i : -1))
          .filter(i => i !== -1)
      );
      return renderTokensWithHighlights(tokens, identifierIndices, true);
    } else if (isRemove && oldLine) {
      // For removals, show without special highlighting
      const tokens = parseTokens(oldLine);
      return renderTokens(tokens, false);
    } else {
      // Context line - no highlighting
      return <span className="text-gray-300">{line}</span>;
    }
  }, [oldLine, newLine, isAdd, isRemove, isModify]);

  return highlightedContent;
});

function renderTokensWithHighlights(
  tokens: Token[],
  changedIndices: Set<number>,
  isAdd: boolean
): React.ReactNode {
  return (
    <>
      {tokens.map((token, idx) => {
        const isChanged = changedIndices.has(idx);
        const isIdentifier = token.type === 'identifier';
        
        if (isChanged && isIdentifier) {
          // Highlight changed identifiers with subtle glow
          return (
            <span
              key={idx}
              className={`${
                isAdd
                  ? 'text-[#7ee787] shadow-[0_0_8px_rgba(59,185,80,0.3)]'
                  : 'text-[#ffa198] shadow-[0_0_8px_rgba(248,81,73,0.3)]'
              }`}
            >
              {token.value}
            </span>
          );
        } else if (isChanged) {
          // Highlight other changed tokens
          return (
            <span
              key={idx}
              className={`${
                isAdd
                  ? 'text-[#7ee787] bg-[#3fb950]/20 rounded-sm px-0.5'
                  : 'text-[#ffa198] bg-[#f85149]/20 rounded-sm px-0.5'
              }`}
            >
              {token.value}
            </span>
          );
        } else {
          // Unchanged token
          return (
            <span key={idx} className="text-gray-300">
              {token.value}
            </span>
          );
        }
      })}
    </>
  );
}

function renderTokens(tokens: Token[], isAdd: boolean): React.ReactNode {
  return (
    <>
      {tokens.map((token, idx) => (
        <span
          key={idx}
          className={
            isAdd
              ? token.type === 'identifier'
                ? 'text-[#7ee787]'
                : 'text-gray-300'
              : token.type === 'identifier'
              ? 'text-[#ffa198]'
              : 'text-gray-300'
          }
        >
          {token.value}
        </span>
      ))}
    </>
  );
}
