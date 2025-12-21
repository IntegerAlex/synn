'use client';

import type { ParsedFileDiff } from './diffParser';
import type { ChangeGroup } from './changeGrouper';

/**
 * Calculate impact level for a file diff
 */
export function calculateFileImpact(file: ParsedFileDiff): 'low' | 'medium' | 'high' {
  const totalChanges = file.additions + file.deletions;
  
  // Binary or deleted files are always low impact (can't review easily)
  if (file.isBinary || file.isDeleted) {
    return 'low';
  }
  
  // High impact: > 50 lines changed
  if (totalChanges >= 50) {
    return 'high';
  }
  
  // Medium impact: 10-50 lines changed
  if (totalChanges >= 10) {
    return 'medium';
  }
  
  // Low impact: < 10 lines changed
  return 'low';
}

/**
 * Calculate impact level for a change group
 */
export function calculateGroupImpact(group: ChangeGroup): 'low' | 'medium' | 'high' {
  const totalChanges = group.additions + group.deletions;
  
  // High impact: > 20 lines changed or function signature changes
  if (totalChanges >= 20 || group.type === 'function') {
    return 'high';
  }
  
  // Medium impact: 5-20 lines changed
  if (totalChanges >= 5) {
    return 'medium';
  }
  
  // Low impact: < 5 lines changed
  return 'low';
}

/**
 * Get impact color class
 */
export function getImpactColor(impact: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-gray-400';
  }
}

/**
 * Get impact badge class
 */
export function getImpactBadgeClass(impact: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'low':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}
