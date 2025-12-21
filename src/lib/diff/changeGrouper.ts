'use client';

import type { DiffHunk, DiffChange, SideBySideLine } from './diffParser';
import { analyzeSemanticChanges, type SemanticChange } from './semanticAnalyzer';

export interface ChangeGroup {
  id: string;
  title: string;
  description?: string;
  type: 'function' | 'class' | 'import' | 'block' | 'misc';
  startLine: number;
  endLine: number;
  changes: SideBySideLine[];
  contextBefore: SideBySideLine[];
  contextAfter: SideBySideLine[];
  collapsed: boolean;
  additions: number;
  deletions: number;
  semanticChanges?: SemanticChange[];
}

export interface GroupedFileDiff {
  filePath: string;
  language: string;
  groups: ChangeGroup[];
  totalAdditions: number;
  totalDeletions: number;
}

// Regex patterns for identifying code boundaries
const PATTERNS = {
  // Function patterns
  jsFunction: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
  jsArrowFunction: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(?/,
  jsMethod: /^\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/,
  
  // Class patterns
  jsClass: /^(?:export\s+)?class\s+(\w+)/,
  
  // Import/Export patterns
  jsImport: /^import\s+/,
  jsExport: /^export\s+(?:default\s+)?/,
  
  // Python patterns
  pyFunction: /^(?:async\s+)?def\s+(\w+)/,
  pyClass: /^class\s+(\w+)/,
  pyImport: /^(?:from\s+.+\s+)?import\s+/,
  
  // Block patterns (generic)
  blockStart: /^\s*(?:if|else|elif|for|while|try|catch|switch|case|with)\s*[\(:]/,
  blockEnd: /^\s*[}\]]/,
};

/**
 * Detect the language from file path
 */
function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    rb: 'ruby',
    php: 'php',
    css: 'css',
    scss: 'scss',
    html: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
  };
  return langMap[ext] || 'text';
}

/**
 * Identify the type of code block from a line
 */
function identifyBlockType(
  line: string,
  language: string
): { type: ChangeGroup['type']; name?: string } | null {
  if (!line.trim()) return null;

  // JavaScript/TypeScript patterns
  if (['typescript', 'javascript'].includes(language)) {
    let match = line.match(PATTERNS.jsFunction);
    if (match) return { type: 'function', name: match[1] };

    match = line.match(PATTERNS.jsArrowFunction);
    if (match) return { type: 'function', name: match[1] };

    match = line.match(PATTERNS.jsClass);
    if (match) return { type: 'class', name: match[1] };

    if (PATTERNS.jsImport.test(line) || PATTERNS.jsExport.test(line)) {
      return { type: 'import' };
    }
  }

  // Python patterns
  if (language === 'python') {
    let match = line.match(PATTERNS.pyFunction);
    if (match) return { type: 'function', name: match[1] };

    match = line.match(PATTERNS.pyClass);
    if (match) return { type: 'class', name: match[1] };

    if (PATTERNS.pyImport.test(line)) {
      return { type: 'import' };
    }
  }

  // Generic block detection
  if (PATTERNS.blockStart.test(line)) {
    return { type: 'block' };
  }

  return null;
}

/**
 * Group changes into logical blocks
 */
export function groupChanges(
  sideBySideLines: SideBySideLine[],
  filePath: string
): GroupedFileDiff {
  const language = detectLanguage(filePath);
  const groups: ChangeGroup[] = [];
  
  let currentGroup: ChangeGroup | null = null;
  let groupIdCounter = 0;
  
  // Track context lines
  const contextWindow = 3; // Show 3 lines of context
  let pendingContext: SideBySideLine[] = [];

  for (let i = 0; i < sideBySideLines.length; i++) {
    const line = sideBySideLines[i];
    const content = line.left?.content || line.right?.content || '';
    
    if (line.type === 'context') {
      // If we have an active group, this might be context after
      if (currentGroup && currentGroup.changes.length > 0) {
        // Check if there are more changes coming within the context window
        let moreChanges = false;
        for (let j = i + 1; j < Math.min(i + contextWindow * 2, sideBySideLines.length); j++) {
          if (sideBySideLines[j].type !== 'context') {
            moreChanges = true;
            break;
          }
        }
        
        if (moreChanges) {
          // This is context between changes - add to current group
          currentGroup.changes.push(line);
        } else {
          // This is trailing context
          currentGroup.contextAfter.push(line);
          if (currentGroup.contextAfter.length >= contextWindow) {
            // End the group
            groups.push(currentGroup);
            currentGroup = null;
          }
        }
      } else {
        // Buffer context for next group
        pendingContext.push(line);
        if (pendingContext.length > contextWindow) {
          pendingContext.shift();
        }
      }
    } else {
      // This is a change (add, remove, or modify)
      if (!currentGroup) {
        // Start a new group
        const blockType = identifyBlockType(content, language);
        
        currentGroup = {
          id: `group-${groupIdCounter++}`,
          title: blockType?.name || 'Changes',
          type: blockType?.type || 'misc',
          startLine: line.left?.lineNumber || line.right?.lineNumber || 0,
          endLine: line.left?.lineNumber || line.right?.lineNumber || 0,
          changes: [],
          contextBefore: [...pendingContext],
          contextAfter: [],
          collapsed: false,
          additions: 0,
          deletions: 0,
        };
        pendingContext = [];
      }
      
      // Update group
      currentGroup.changes.push(line);
      currentGroup.endLine = line.left?.lineNumber || line.right?.lineNumber || currentGroup.endLine;
      
      if (line.type === 'add' || line.type === 'modify') {
        currentGroup.additions++;
      }
      if (line.type === 'remove' || line.type === 'modify') {
        currentGroup.deletions++;
      }
      
      // Check if this line defines a new block
      const blockType = identifyBlockType(content, language);
      if (blockType?.name && currentGroup.title === 'Changes') {
        currentGroup.title = blockType.name;
        currentGroup.type = blockType.type;
      }
    }
  }
  
  // Finalize last group
  if (currentGroup && currentGroup.changes.length > 0) {
    groups.push(currentGroup);
  }
  
  // Generate descriptions and semantic analysis for groups
  for (const group of groups) {
    group.description = generateGroupDescription(group);
    
    // Perform semantic analysis on change groups
    try {
      const oldCode = group.changes
        .filter(c => c.left)
        .map(c => c.left!.content)
        .join('\n');
      const newCode = group.changes
        .filter(c => c.right)
        .map(c => c.right!.content)
        .join('\n');
      
      if (oldCode || newCode) {
        group.semanticChanges = analyzeSemanticChanges(oldCode, newCode, language);
      }
    } catch (error) {
      // Silently fail semantic analysis
      console.warn('Semantic analysis failed for group:', error);
    }
  }
  
  // Calculate totals
  const totalAdditions = groups.reduce((sum, g) => sum + g.additions, 0);
  const totalDeletions = groups.reduce((sum, g) => sum + g.deletions, 0);
  
  return {
    filePath,
    language,
    groups,
    totalAdditions,
    totalDeletions,
  };
}

/**
 * Generate a human-readable description for a change group
 */
function generateGroupDescription(group: ChangeGroup): string {
  const parts: string[] = [];
  
  if (group.additions > 0 && group.deletions > 0) {
    parts.push(`Modified ${group.additions + group.deletions} lines`);
  } else if (group.additions > 0) {
    parts.push(`Added ${group.additions} line${group.additions > 1 ? 's' : ''}`);
  } else if (group.deletions > 0) {
    parts.push(`Removed ${group.deletions} line${group.deletions > 1 ? 's' : ''}`);
  }
  
  if (group.type === 'function') {
    parts.unshift(`Function: ${group.title}`);
  } else if (group.type === 'class') {
    parts.unshift(`Class: ${group.title}`);
  } else if (group.type === 'import') {
    parts.unshift('Import statements');
  }
  
  return parts.join(' - ');
}

/**
 * Merge adjacent small groups
 */
export function mergeSmallGroups(groups: ChangeGroup[], minSize: number = 3): ChangeGroup[] {
  if (groups.length <= 1) return groups;
  
  const merged: ChangeGroup[] = [];
  let current: ChangeGroup | null = null;
  
  for (const group of groups) {
    if (!current) {
      current = { ...group };
      continue;
    }
    
    // Merge if both are small or same type
    const shouldMerge = 
      (current.changes.length < minSize && group.changes.length < minSize) ||
      (current.type === group.type && current.type !== 'misc');
    
    if (shouldMerge) {
      // Merge groups
      current.changes = [
        ...current.changes,
        ...current.contextAfter,
        ...group.contextBefore,
        ...group.changes,
      ];
      current.contextAfter = group.contextAfter;
      current.endLine = group.endLine;
      current.additions += group.additions;
      current.deletions += group.deletions;
      if (current.title === 'Changes' && group.title !== 'Changes') {
        current.title = group.title;
        current.type = group.type;
      }
    } else {
      merged.push(current);
      current = { ...group };
    }
  }
  
  if (current) {
    merged.push(current);
  }
  
  return merged;
}
