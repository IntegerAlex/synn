"use client";

import { useQuery } from "@tanstack/react-query";
import { gitApi } from "@/lib/api/client";
import { useAppStore } from "@/store/useAppStore";
import type { FileHistoryEntry } from "@/types/git";

export function useFileHistory(
  filepath: string | null,
  options?: { ref?: string; limit?: number },
) {
  const repoInfo = useAppStore((state) => state.repoInfo);

  return useQuery<FileHistoryEntry[]>({
    queryKey: [
      "fileHistory",
      repoInfo?.path,
      filepath,
      options?.ref,
      options?.limit,
    ],
    queryFn: () => gitApi.getFileHistory(repoInfo, filepath!, options),
    enabled: !!repoInfo && !!filepath,
    staleTime: 30_000,
  });
}
