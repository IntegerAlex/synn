import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gitApi } from '@/lib/api/client';
import { useAppSelector } from '@/store/hooks';

// Query keys
export const queryKeys = {
    repo: ['repo'] as const,
    branches: ['branches'] as const,
    graph: (limit: number) => ['graph', limit] as const,
    commits: (limit: number) => ['commits', limit] as const,
    commitDetails: (hash: string) => ['commitDetails', hash] as const,
    search: (query: string) => ['search', query] as const,
};

// Repo info
export function useRepoInfo() {
    const repoInfo = useAppSelector((state) => state.app.repoInfo);

    return useQuery({
        queryKey: queryKeys.repo,
        queryFn: () => gitApi.getRepoInfo(repoInfo),
        enabled: !!repoInfo,
    });
}

// Set repo
export function useSetRepo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: gitApi.setRepo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.repo });
            queryClient.invalidateQueries({ queryKey: queryKeys.branches });
            queryClient.invalidateQueries({ queryKey: ['graph'] });
        },
    });
}

// Branches
export function useBranches() {
    const repoInfo = useAppSelector((state) => state.app.repoInfo);

    return useQuery({
        queryKey: queryKeys.branches,
        queryFn: () => gitApi.getBranches(repoInfo),
        enabled: !!repoInfo,
    });
}

// Graph - simplified, TanStack Query v5 doesn't support onSuccess
export function useGraph(limit = 100) {
    const repoInfo = useAppSelector((state) => state.app.repoInfo);

    return useQuery({
        queryKey: queryKeys.graph(limit),
        queryFn: () => gitApi.getGraph(repoInfo, limit),
        enabled: !!repoInfo,
        staleTime: 10000,
        placeholderData: (previousData) => previousData,
    });
}

// Commit details
export function useCommitDetails(hash: string | null) {
    const repoInfo = useAppSelector((state) => state.app.repoInfo);
    
    return useQuery({
        queryKey: queryKeys.commitDetails(hash || ''),
        queryFn: () => gitApi.getCommitDetails(repoInfo, hash!),
        enabled: !!hash && !!repoInfo,
    });
}

// Checkout
export function useCheckoutBranch() {
    const queryClient = useQueryClient();
    const repoInfo = useAppSelector((state) => state.app.repoInfo);

    return useMutation({
        mutationFn: (branch: string) => gitApi.checkoutBranch(repoInfo, branch),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.repo });
            queryClient.invalidateQueries({ queryKey: queryKeys.branches });
            queryClient.invalidateQueries({ queryKey: ['graph'] });
        },
    });
}

// Search
export function useSearch(query: string) {
    const repoInfo = useAppSelector((state) => state.app.repoInfo);
    
    return useQuery({
        queryKey: queryKeys.search(query),
        queryFn: () => gitApi.search(repoInfo, query),
        enabled: query.length > 0 && !!repoInfo,
        staleTime: 5000,
    });
}
