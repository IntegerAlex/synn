'use client';

import type { ParsedFileDiff } from './diffParser';

export interface FileGroup {
  name: string;
  files: ParsedFileDiff[];
  impact: 'low' | 'medium' | 'high';
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Group files by directory path patterns
 */
export function groupFiles(files: ParsedFileDiff[]): FileGroup[] {
  const groups = new Map<string, ParsedFileDiff[]>();

  // Group by directory
  for (const file of files) {
    const pathParts = file.newPath.split('/');
    const fileName = pathParts.pop() || file.newPath;
    const directory = pathParts.length > 0 ? pathParts.join('/') : 'root';

    // Extract directory name for grouping
    const dirName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'root';
    
    // Check for common prefixes (e.g., telemetry-*, config-*)
    const prefixMatch = fileName.match(/^(\w+)-/);
    const groupKey = prefixMatch ? prefixMatch[1] : dirName;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(file);
  }

  // Convert to FileGroup array
  const fileGroups: FileGroup[] = [];

  for (const [name, groupFiles] of groups.entries()) {
    const totalAdditions = groupFiles.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = groupFiles.reduce((sum, f) => sum + f.deletions, 0);
    const totalChanges = totalAdditions + totalDeletions;

    // Determine impact level
    let impact: 'low' | 'medium' | 'high' = 'low';
    if (totalChanges >= 50) {
      impact = 'high';
    } else if (totalChanges >= 10) {
      impact = 'medium';
    }

    // Capitalize group name
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);

    fileGroups.push({
      name: displayName,
      files: groupFiles,
      impact,
      totalAdditions,
      totalDeletions,
    });
  }

  // Sort by impact (high first), then by name
  fileGroups.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[b.impact] - impactOrder[a.impact];
    }
    return a.name.localeCompare(b.name);
  });

  return fileGroups;
}

/**
 * Get file type icon name based on file extension
 */
export function getFileTypeIcon(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, string> = {
    ts: 'FileCode',
    tsx: 'FileCode',
    js: 'FileCode',
    jsx: 'FileCode',
    json: 'FileJson',
    yaml: 'FileText',
    yml: 'FileText',
    md: 'FileText',
    txt: 'FileText',
    css: 'FileCode',
    scss: 'FileCode',
    html: 'FileCode',
    xml: 'FileCode',
    py: 'FileCode',
    go: 'FileCode',
    rs: 'FileCode',
    java: 'FileCode',
    cpp: 'FileCode',
    c: 'FileCode',
    rb: 'FileCode',
    php: 'FileCode',
  };

  return iconMap[ext] || 'File';
}
