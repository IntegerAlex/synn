import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hooks';

/**
 * Hook to observe repoInfo state via TanStack Query and return the appropriate document title
 * This avoids using useEffect by using TanStack Query's reactive system
 */
export function useDocumentTitle() {
    const repoInfo = useAppSelector((state) => state.app.repoInfo);

    // Use TanStack Query to observe the repoInfo state
    const { data: title } = useQuery({
        queryKey: ['documentTitle', repoInfo?.path, repoInfo?.name],
        queryFn: () => {
            if (repoInfo) {
                // Use path if available (full repo name like owner/repo), otherwise use name
                const repoName = repoInfo.path || repoInfo.name;
                return `Synn - ${repoName}`;
            }
            return 'Synn';
        },
        enabled: true,
        staleTime: Infinity, // Title doesn't need to be refetched
        gcTime: Infinity, // Keep in cache
    });

    return title || 'Synn';
}

