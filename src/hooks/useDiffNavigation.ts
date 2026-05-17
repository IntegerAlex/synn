"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseDiffNavigationProps {
  totalChanges: number;
  totalFiles: number;
  onClose?: () => void;
  onFileChange?: (direction: "next" | "prev") => void;
  onToggleSearch?: () => void;
  enabled?: boolean;
}

interface UseDiffNavigationReturn {
  currentChangeIndex: number;
  setCurrentChangeIndex: (index: number) => void;
  goToNextChange: () => void;
  goToPrevChange: () => void;
  goToFirstChange: () => void;
  goToLastChange: () => void;
  goToNextFile: () => void;
  goToPrevFile: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  showShortcuts: boolean;
  setShowShortcuts: (show: boolean) => void;
}

export function useDiffNavigation({
  totalChanges,
  totalFiles,
  onClose,
  onFileChange,
  onToggleSearch,
  enabled = true,
}: UseDiffNavigationProps): UseDiffNavigationReturn {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Track double-key sequences (like 'gg')
  const lastKeyRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const goToNextChange = useCallback(() => {
    setCurrentChangeIndex((prev) => Math.min(prev + 1, totalChanges - 1));
  }, [totalChanges]);

  const goToPrevChange = useCallback(() => {
    setCurrentChangeIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToFirstChange = useCallback(() => {
    setCurrentChangeIndex(0);
  }, []);

  const goToLastChange = useCallback(() => {
    setCurrentChangeIndex(Math.max(0, totalChanges - 1));
  }, [totalChanges]);

  const goToNextFile = useCallback(() => {
    onFileChange?.("next");
  }, [onFileChange]);

  const goToPrevFile = useCallback(() => {
    onFileChange?.("prev");
  }, [onFileChange]);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    onToggleSearch?.();
  }, [onToggleSearch]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  // Keyboard navigation handler
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to close search
        if (event.key === "Escape" && isSearchOpen) {
          closeSearch();
          event.preventDefault();
        }
        return;
      }

      const now = Date.now();
      const key = event.key;

      // Handle double-key sequences
      if (
        key === "g" &&
        lastKeyRef.current === "g" &&
        now - lastKeyTimeRef.current < 500
      ) {
        // 'gg' - go to first change
        goToFirstChange();
        lastKeyRef.current = "";
        event.preventDefault();
        return;
      }

      lastKeyRef.current = key;
      lastKeyTimeRef.current = now;

      // Single key shortcuts
      switch (key) {
        case "j":
        case "ArrowDown":
          if (!event.metaKey && !event.ctrlKey) {
            goToNextChange();
            event.preventDefault();
          }
          break;

        case "k":
        case "ArrowUp":
          if (!event.metaKey && !event.ctrlKey) {
            goToPrevChange();
            event.preventDefault();
          }
          break;

        case "J":
        case "PageDown":
          goToNextFile();
          event.preventDefault();
          break;

        case "K":
        case "PageUp":
          goToPrevFile();
          event.preventDefault();
          break;

        case "G":
          // Shift+G - go to last change
          if (event.shiftKey) {
            goToLastChange();
            event.preventDefault();
          }
          break;

        case "/":
          openSearch();
          event.preventDefault();
          break;

        case "Escape":
          if (isSearchOpen) {
            closeSearch();
          } else if (showShortcuts) {
            setShowShortcuts(false);
          } else {
            onClose?.();
          }
          event.preventDefault();
          break;

        case "?":
          setShowShortcuts((prev) => !prev);
          event.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    isSearchOpen,
    showShortcuts,
    goToNextChange,
    goToPrevChange,
    goToFirstChange,
    goToLastChange,
    goToNextFile,
    goToPrevFile,
    openSearch,
    closeSearch,
    onClose,
  ]);

  return {
    currentChangeIndex,
    setCurrentChangeIndex,
    goToNextChange,
    goToPrevChange,
    goToFirstChange,
    goToLastChange,
    goToNextFile,
    goToPrevFile,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    openSearch,
    closeSearch,
    showShortcuts,
    setShowShortcuts,
  };
}

/**
 * Keyboard shortcuts help content
 */
export const DIFF_SHORTCUTS = [
  { key: "j / ↓", description: "Next change" },
  { key: "k / ↑", description: "Previous change" },
  { key: "J / PageDown", description: "Next file" },
  { key: "K / PageUp", description: "Previous file" },
  { key: "g g", description: "First change" },
  { key: "G", description: "Last change" },
  { key: "/", description: "Search" },
  { key: "Esc", description: "Close" },
  { key: "?", description: "Toggle shortcuts" },
];
