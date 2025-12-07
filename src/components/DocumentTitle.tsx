'use client';

import { useRef } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Component that updates the document title based on repoInfo state
 * Uses TanStack Query instead of useEffect for reactive updates
 */
export function DocumentTitle() {
    const title = useDocumentTitle();
    const previousTitleRef = useRef<string>('');

    // Update title only when it changes (using ref to track previous value)
    if (typeof document !== 'undefined' && title !== previousTitleRef.current) {
        document.title = title;
        previousTitleRef.current = title;
    }

    return null;
}

