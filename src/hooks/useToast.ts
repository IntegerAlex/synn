"use client";

import { create } from "zustand";
import type { ToastType } from "@/components/ui/Toast";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id"> & { id?: string }) => void;
  removeToast: (id: string) => void;
  clear: () => void;
}

const MAX_TOASTS = 4;
const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  addToast: (toast) => {
    const id =
      toast.id ??
      (typeof crypto !== "undefined" &&
      "randomUUID" in crypto &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`);
    const duration = toast.duration ?? DEFAULT_DURATION;
    set((state) => {
      const next = [...state.toasts, { ...toast, id, duration }].slice(
        -MAX_TOASTS,
      );
      return { toasts: next };
    });

    // auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        const exists = get().toasts.some((t) => t.id === id);
        if (exists) {
          get().removeToast(id);
        }
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);
  const removeToast = useToastStore((s) => s.removeToast);

  return {
    show: (message: string, type: ToastType = "info", duration?: number) =>
      addToast({ message, type, duration }),
    showSuccess: (message: string, duration?: number) =>
      addToast({ message, type: "success", duration }),
    showError: (message: string, duration?: number) =>
      addToast({ message, type: "error", duration }),
    showInfo: (message: string, duration?: number) =>
      addToast({ message, type: "info", duration }),
    showWarning: (message: string, duration?: number) =>
      addToast({ message, type: "warning", duration }),
    remove: removeToast,
  };
}
