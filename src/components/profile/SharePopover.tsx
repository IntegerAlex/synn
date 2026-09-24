"use client";

import { useUser } from "@clerk/nextjs";
import { Image as ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { downloadProfileImage } from "@/lib/utils/profileImage";

interface SharePopoverProps {
  profileContentRef?: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
}

export function SharePopover({
  profileContentRef,
  onClose,
}: SharePopoverProps) {
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    setIsGenerating(true);

    // Close popover before capturing
    onClose?.();

    // Small delay to ensure popover is removed from DOM
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const profileContent = profileContentRef?.current;
      if (!profileContent) {
        throw new Error("Profile content not found");
      }

      await downloadProfileImage(
        profileContent,
        `synn-profile-${user?.username || "user"}-${new Date().toISOString().split("T")[0]}.png`,
      );
    } catch (error) {
      console.error("Error generating PNG:", error);
      alert(
        `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}.`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose?.();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl p-2 z-100"
    >
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className="p-2 hover:bg-[#21262d] rounded transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download PNG"
      >
        {isGenerating ? (
          <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
        ) : (
          <ImageIcon className="w-5 h-5 text-[#ef4444] group-hover:scale-110 transition-transform" />
        )}
      </button>
    </div>
  );
}
