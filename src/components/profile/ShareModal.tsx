'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Image as ImageIcon } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  contributionsData: {
    contributions: Array<{ date: string; count: number }>;
    totalCommits: number;
    maxCount: number;
  } | null;
  roastData: { roast?: string } | null;
  profileContentRef?: React.RefObject<HTMLDivElement | null>;
}

export function ShareModal({ isOpen, onClose, contributionsData, roastData, profileContentRef }: ShareModalProps) {
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      // Get the profile content
      const profileContent = profileContentRef?.current;
      if (!profileContent) {
        throw new Error('Profile content not found');
      }

      // Create a wrapper element with logo and profile content
      const wrapper = document.createElement('div');
      wrapper.id = 'profile-export-wrapper';
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

      // Add logo at the top (no top margin/padding)
      const logoContainer = document.createElement('div');
      logoContainer.style.cssText = 'display: flex; justify-content: flex-start; margin-bottom: 32px; width: 100%;';
      const logoImg = document.createElement('img');
      logoImg.src = '/logo.png';
      logoImg.alt = 'Synn Logo';
      logoImg.style.cssText = 'width: 120px; height: 120px; object-fit: contain; display: block;';
      logoContainer.appendChild(logoImg);
      wrapper.appendChild(logoContainer);

      // Clone the profile content with deep clone to preserve styles
      const clonedContent = profileContent.cloneNode(true) as HTMLElement;
      
      // Remove header if exists
      const headerInClone = clonedContent.querySelector('header');
      if (headerInClone) {
        headerInClone.remove();
      }

      // Copy computed styles to cloned elements
      const copyStyles = (source: Element, target: Element) => {
        const computedStyle = window.getComputedStyle(source);
        const targetEl = target as HTMLElement;
        Array.from(computedStyle).forEach((key) => {
          try {
            targetEl.style.setProperty(key, computedStyle.getPropertyValue(key), computedStyle.getPropertyPriority(key));
          } catch (e) {
            // Ignore errors for certain properties
          }
        });
      };

      // Copy styles from original to clone
      const originalElements = profileContent.querySelectorAll('*');
      const clonedElements = clonedContent.querySelectorAll('*');
      originalElements.forEach((original, index) => {
        if (clonedElements[index]) {
          copyStyles(original, clonedElements[index]);
        }
      });

      // Copy styles for the main element
      copyStyles(profileContent, clonedContent);

      clonedContent.style.cssText += `
        width: 100%;
        background-color: transparent;
        position: relative;
        margin: 0;
        padding: 0;
      `;

      wrapper.appendChild(clonedContent);

      // Add to DOM
      document.body.appendChild(wrapper);

      // Wait for logo to load
      await new Promise((resolve) => {
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          resolve(true);
        } else {
          logoImg.onload = () => resolve(true);
          logoImg.onerror = () => resolve(true);
          setTimeout(() => resolve(true), 3000);
        }
      });

      // Wait for all images in cloned content to load
      const images = clonedContent.querySelectorAll('img');
      await Promise.all(
        Array.from(images).map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 3000);
          });
        })
      );

      // Wait for rendering and force reflow
      await new Promise(resolve => setTimeout(resolve, 1500));
      wrapper.offsetHeight;
      clonedContent.offsetHeight;

      // Calculate full dimensions including scroll
      const fullWidth = Math.max(wrapper.scrollWidth, wrapper.offsetWidth, 1200);
      const fullHeight = Math.max(wrapper.scrollHeight, wrapper.offsetHeight, clonedContent.scrollHeight + 200);

      // Verify dimensions
      if (fullWidth === 0 || fullHeight === 0) {
        console.error('Wrapper dimensions:', {
          scrollWidth: wrapper.scrollWidth,
          scrollHeight: wrapper.scrollHeight,
          offsetWidth: wrapper.offsetWidth,
          offsetHeight: wrapper.offsetHeight,
        });
        throw new Error('Wrapper has no dimensions');
      }

      console.log('Capturing wrapper:', fullWidth, 'x', fullHeight);

      // Ensure wrapper has enough space
      wrapper.style.width = `${fullWidth}px`;
      wrapper.style.minHeight = `${fullHeight}px`;
      wrapper.style.overflow = 'visible';

      const htmlToImage = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(wrapper, {
        backgroundColor: '#0d1117',
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
      
      // Remove wrapper from DOM
      document.body.removeChild(wrapper);
      
      // Check if image was generated
      if (!dataUrl || dataUrl.length < 100) {
        throw new Error('Generated image appears to be empty');
      }
      
      console.log('Image generated, length:', dataUrl.length);
      
      const link = document.createElement('a');
      link.download = `synn-profile-${user?.username || 'user'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}. Please check console for details.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#30363d]">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-[#ef4444]" />
              Download Profile Image
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-400 text-sm mb-6">
              Download your profile as a high-quality PNG image. The exported file will include your contribution graph and stats with the Synn logo.
            </p>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full flex flex-col items-center gap-3 p-8 bg-[#0d1117] border border-[#30363d] rounded-lg hover:border-[#ef4444]/50 hover:bg-[#21262d] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-12 h-12 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
                  <div className="text-white font-medium">Generating image...</div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-12 h-12 text-[#ef4444] group-hover:scale-110 transition-transform" />
                  <div className="text-center">
                    <div className="text-white font-medium text-lg mb-1">Download PNG Image</div>
                    <div className="text-xs text-gray-400">High quality profile image</div>
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </>
  );
}

