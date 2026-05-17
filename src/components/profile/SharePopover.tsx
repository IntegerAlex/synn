"use client";

import { useUser } from "@clerk/nextjs";
import { Image as ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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

  const generateImageBlob = async (): Promise<Blob> => {
    const profileContent = profileContentRef?.current;
    if (!profileContent) {
      throw new Error("Profile content not found");
    }

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

    const clonedContent = profileContent.cloneNode(true) as HTMLElement;

    const headerInClone = clonedContent.querySelector("header");
    if (headerInClone) {
      headerInClone.remove();
    }

    const allElements = Array.from(clonedContent.querySelectorAll("*"));
    allElements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      try {
        const computedStyle = window.getComputedStyle(htmlEl);
        const zIndex = computedStyle.zIndex;
        if (
          zIndex &&
          !Number.isNaN(parseInt(zIndex, 10)) &&
          parseInt(zIndex, 10) >= 50
        ) {
          htmlEl.remove();
        }
      } catch (_e) {
        // Ignore errors
      }
    });

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
        } catch (_e) {
          // Ignore errors
        }
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
    clonedContent.offsetHeight;

    const fullWidth = Math.max(wrapper.scrollWidth, wrapper.offsetWidth, 1200);
    const fullHeight = Math.max(
      wrapper.scrollHeight,
      wrapper.offsetHeight,
      clonedContent.scrollHeight + 200,
    );

    if (fullWidth === 0 || fullHeight === 0) {
      document.body.removeChild(wrapper);
      throw new Error("Wrapper has no dimensions");
    }

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
      style: {
        width: `${fullWidth}px`,
        height: `${fullHeight}px`,
      },
    });

    document.body.removeChild(wrapper);

    if (!dataUrl || dataUrl.length < 100) {
      throw new Error("Generated image appears to be empty");
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return blob;
  };

  const handleDownload = async () => {
    setIsGenerating(true);

    // Close popover before capturing
    onClose?.();

    // Small delay to ensure popover is removed from DOM
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      const blob = await generateImageBlob();

      // Convert blob to data URL for download
      const dataUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.download = `synn-profile-${user?.username || "user"}-${new Date().toISOString().split("T")[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      URL.revokeObjectURL(dataUrl);
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
