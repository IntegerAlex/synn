'use client';

import { CytoscapeGraph } from './CytoscapeGraph';
import { useGraph } from '@/hooks/useGitData';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

interface SharedGraphViewProps {
  shareId: string;
  initialGraphLimit?: number;
}

// Wrapper component that passes shareId to graph queries
export function SharedGraphView({ shareId, initialGraphLimit }: SharedGraphViewProps) {
  const repoInfo = useAppStore((state) => state.repoInfo);
  
  // Override useGraph to include shareId in requests
  // We'll need to modify the hook or create a custom one for shared views
  // For now, we'll use a workaround by storing shareId in the store temporarily
  
  return <CytoscapeGraph initialGraphLimit={initialGraphLimit} readOnly={true} shareId={shareId} />;
}
