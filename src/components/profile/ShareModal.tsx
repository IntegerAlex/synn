"use client";

import { useUser } from "@clerk/nextjs";
import {
  Circle,
  Download,
  Image as ImageIcon,
  Linkedin,
  MessageSquare,
  Share2,
  X,
} from "lucide-react";
import { useState } from "react";
import { logger } from "@/lib/utils/logger";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributionsData: {
    contributions: Array<{ date: string; count: number }>;
    totalCommits: number;
    maxCount: number;
  } | null;
  profileContentRef?: React.RefObject<HTMLDivElement | null>;
}

export function ShareModal({
  isOpen,
  onClose,
  contributionsData,
  profileContentRef,
}: ShareModalProps) {
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const getShareUrl = () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://synn.gossorg.in";
    return `${baseUrl}/profile`;
  };

  const getShareText = () => {
    const totalCommits = contributionsData?.totalCommits || 0;
    const peakActivity = contributionsData?.maxCount || 0;
    return `Check out my developer profile on Synn! 🚀\n\n${totalCommits.toLocaleString()} total commits • Peak daily activity: ${peakActivity}\n\n${getShareUrl()}`;
  };

  const handleShare = (
    platform: "linkedin" | "twitter" | "peerlist" | "reddit",
  ) => {
    const url = encodeURIComponent(getShareUrl());
    const text = encodeURIComponent(getShareText());
    const title = encodeURIComponent(
      `${user?.fullName || user?.username || "My"} Developer Profile - Synn`,
    );

    let shareUrl = "";

    switch (platform) {
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case "reddit":
        shareUrl = `https://reddit.com/submit?url=${url}&title=${title}`;
        break;
      case "peerlist":
        shareUrl = `https://peerlist.io/share?url=${url}&text=${text}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "width=600,height=400");
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);

    try {
      // Get the profile content
      const profileContent = profileContentRef?.current;
      if (!profileContent) {
        throw new Error("Profile content not found");
      }

      // Create a wrapper element with logo and profile content
      const wrapper = document.createElement("div");
      wrapper.id = "profile-export-wrapper";
      wrapper.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 1200px;
        background-color: #0d1117;
        padding: 0 40px 40px 40px;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: -9999;
        visibility: visible;
        opacity: 1;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      `;

      // Add logo at the top
      const logoContainer = document.createElement("div");
      logoContainer.style.cssText =
        "display: flex; justify-content: flex-start; margin-bottom: 32px; width: 100%;";
      const logoImg = document.createElement("img");
      logoImg.src = "/logo.png";
      logoImg.alt = "Synn Logo";
      logoImg.style.cssText =
        "width: 120px; height: 120px; object-fit: contain; display: block;";
      logoContainer.appendChild(logoImg);
      wrapper.appendChild(logoContainer);

      // Clone the profile content
      const clonedContent = profileContent.cloneNode(true) as HTMLElement;

      const headerInClone = clonedContent.querySelector("header");
      if (headerInClone) {
        headerInClone.remove();
      }

      // Copy computed styles
      const copyStyles = (source: Element, target: Element) => {
        const computedStyle = window.getComputedStyle(source);
        const targetEl = target as HTMLElement;
        Array.from(computedStyle).forEach((key) => {
          try {
            targetEl.style.setProperty(
              key,
              computedStyle.getPropertyValue(key),
              computedStyle.getPropertyPriority(key),
            );
          } catch (_e) {}
        });
      };

      const originalElements = profileContent.querySelectorAll("*");
      const clonedElements = clonedContent.querySelectorAll("*");
      originalElements.forEach((original, index) => {
        if (clonedElements[index]) {
          copyStyles(original, clonedElements[index]);
        }
      });

      copyStyles(profileContent, clonedContent);

      clonedContent.style.cssText += `
        width: 100%;
        background-color: transparent;
        position: relative;
        margin: 0;
        padding: 0;
      `;

      wrapper.appendChild(clonedContent);
      document.body.appendChild(wrapper);

      await new Promise((resolve) => {
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          resolve(true);
        } else {
          logoImg.onload = () => resolve(true);
          logoImg.onerror = () => resolve(true);
          setTimeout(() => resolve(true), 3000);
        }
      });

      const images = clonedContent.querySelectorAll("img");
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000);
          });
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
      wrapper.offsetHeight;

      const fullWidth = Math.max(
        wrapper.scrollWidth,
        wrapper.offsetWidth,
        1200,
      );
      const fullHeight = Math.max(
        wrapper.scrollHeight,
        wrapper.offsetHeight,
        clonedContent.scrollHeight + 200,
      );

      logger.debug("Capturing wrapper", { fullWidth, fullHeight });

      wrapper.style.width = `${fullWidth}px`;
      wrapper.style.minHeight = `${fullHeight}px`;
      wrapper.style.overflow = "visible";

      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(wrapper, {
        backgroundColor: "#0d1117",
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        width: fullWidth,
        height: fullHeight,
      });

      document.body.removeChild(wrapper);

      if (!dataUrl || dataUrl.length < 100) {
        throw new Error("Generated image appears to be empty");
      }

      const link = document.createElement("a");
      link.download = `synn-profile-${user?.username || "user"}-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating PNG:", error);
      alert(
        `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-8 border-b border-[#30363d]">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Download className="w-6 h-6 text-blue-500" />
            Share Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-white hover:bg-[#21262d] rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-gray-400 font-medium mb-8">
            Share your developer profile or download it as a high-quality PNG
            image.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => handleShare("linkedin")}
              className="flex items-center gap-4 p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl hover:border-blue-500/50 hover:bg-[#21262d] transition-all group"
            >
              <Linkedin className="w-6 h-6 text-[#0077b5] group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-sm">LinkedIn</span>
            </button>

            <button
              onClick={() => handleShare("twitter")}
              className="flex items-center gap-4 p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl hover:border-blue-400/50 hover:bg-[#21262d] transition-all group"
            >
              <Share2 className="w-6 h-6 text-[#1da1f2] group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-sm">X (Twitter)</span>
            </button>

            <button
              onClick={() => handleShare("peerlist")}
              className="flex items-center gap-4 p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl hover:border-blue-500/50 hover:bg-[#21262d] transition-all group"
            >
              <MessageSquare className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-white font-bold text-sm">Peerlist</span>
            </button>

            <button
              onClick={() => handleShare("reddit")}
              className="flex items-center gap-4 p-5 bg-[#0d1117] border border-[#30363d] rounded-2xl hover:border-orange-500/50 hover:bg-[#21262d] transition-all group"
            >
              <div className="relative w-6 h-6">
                <Circle
                  className="w-6 h-6 text-[#ff4500] group-hover:scale-110 transition-transform"
                  fill="#ff4500"
                />
                <Circle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white" />
              </div>
              <span className="text-white font-bold text-sm">Reddit</span>
            </button>
          </div>

          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full flex flex-col items-center gap-4 p-8 bg-blue-600 hover:bg-blue-500 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-900/20"
          >
            {isGenerating ? (
              <>
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <div className="text-white font-black uppercase tracking-widest">
                  Generating Blueprint...
                </div>
              </>
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                <div className="text-center">
                  <div className="text-white font-black uppercase tracking-widest mb-1">
                    Download PNG Image
                  </div>
                  <div className="text-blue-200 text-xs font-bold">
                    High quality profile snapshot
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
