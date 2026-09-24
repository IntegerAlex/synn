"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

/**
 * Component that keeps document.title in sync with the selected repository.
 */
export function DocumentTitle() {
  const repoInfo = useAppStore((state) => state.repoInfo);
  const repoName = repoInfo?.path || repoInfo?.name;
  const title = repoName ? `Synn - ${repoName}` : "Synn";

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
