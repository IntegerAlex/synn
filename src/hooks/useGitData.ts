import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gitApi } from "@/lib/api/client";
import { useAppStore } from "@/store/useAppStore";

// Query keys
export const queryKeys = {
  repo: ["repo"] as const,
  branches: (repoFullName?: string) =>
    ["branches", repoFullName || ""] as const,
  graph: (repoFullName: string | undefined, limit: number, offset: number) =>
    ["graph", repoFullName || "", limit, offset] as const,
  commits: (limit: number) => ["commits", limit] as const,
  commitDetails: (hash: string) => ["commitDetails", hash] as const,
  search: (query: string) => ["search", query] as const,
  files: (ref?: string) => ["files", ref || "HEAD"] as const,
};

// Repo info
export function useRepoInfo() {
  const repoInfo = useAppStore((state) => state.repoInfo);

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
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    },
  });
}

// Branches
export function useBranches() {
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useQuery({
    queryKey: queryKeys.branches(repoInfo?.path),
    queryFn: () => gitApi.getBranches(repoInfo),
    enabled: !!repoInfo,
  });
}

// Graph - simplified, TanStack Query v5 doesn't support onSuccess
export function useGraph(limit = 100, offset = 0, shareId?: string) {
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useQuery({
    queryKey: queryKeys.graph(repoInfo?.path, limit, offset),
    queryFn: () => gitApi.getGraph(repoInfo, limit, offset, shareId),
    enabled: !!repoInfo,
    staleTime: 2 * 60 * 1000, // Graph data rarely changes mid-session; 2 min reduces redundant refetches
    placeholderData: (previousData) => previousData,
  });
}

// Commit details
export function useCommitDetails(hash: string | null) {
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useQuery({
    queryKey: queryKeys.commitDetails(hash || ""),
    queryFn: () => gitApi.getCommitDetails(repoInfo, hash!),
    enabled: !!hash && !!repoInfo,
  });
}

// Checkout
export function useCheckoutBranch() {
  const queryClient = useQueryClient();
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useMutation({
    mutationFn: (branch: string) => gitApi.checkoutBranch(repoInfo, branch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repo });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["graph"] });
    },
  });
}

// Search
export function useSearch(query: string) {
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => gitApi.search(repoInfo, query),
    enabled: query.length > 0 && !!repoInfo,
    staleTime: 5000,
  });
}

// Repo files
export function useRepoFiles(ref?: string) {
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useQuery({
    queryKey: queryKeys.files(ref),
    queryFn: () => gitApi.getFiles(repoInfo, ref),
    enabled: !!repoInfo,
    staleTime: 60_000,
  });
}

// File contents
export function useFileContents(filePath: string | null, ref?: string) {
  const repoInfo = useAppStore((state) => state.repoInfo);
  // Content at a full commit SHA is immutable – cache it for the session.
  const isCommitSha = ref ? /^[0-9a-f]{40}$/i.test(ref) : false;

  return useQuery({
    queryKey: ["fileContents", repoInfo?.path || "", filePath, ref || "HEAD"],
    queryFn: () => gitApi.getFileContents(repoInfo, filePath!, ref),
    enabled: !!filePath && !!repoInfo,
    staleTime: isCommitSha ? Number.POSITIVE_INFINITY : 60_000,
    gcTime: isCommitSha ? 30 * 60 * 1000 : 10 * 60 * 1000,
  });
}

// File blame
export function useFileBlame(filePath: string | null, ref?: string) {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const isCommitSha = ref ? /^[0-9a-f]{40}$/i.test(ref) : false;

  return useQuery({
    queryKey: ["fileBlame", repoInfo?.path || "", filePath, ref || "HEAD"],
    queryFn: () => gitApi.getFileBlame(repoInfo, filePath!, ref),
    enabled: !!filePath && !!repoInfo,
    staleTime: isCommitSha ? Number.POSITIVE_INFINITY : 60_000,
    gcTime: isCommitSha ? 30 * 60 * 1000 : 10 * 60 * 1000,
  });
}
