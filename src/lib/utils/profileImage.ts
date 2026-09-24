"use client";

/**
 * Captures an element as a PNG (with a Synn logo header) and downloads it.
 * Shared by the profile ShareModal and SharePopover.
 */
export async function downloadProfileImage(
  profileContent: HTMLElement,
  filename: string,
): Promise<void> {
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

  clonedContent.querySelector("header")?.remove();

  // Drop floating overlays (z-index >= 50) from the clone.
  for (const el of Array.from(clonedContent.querySelectorAll("*"))) {
    const zIndex = window.getComputedStyle(el as HTMLElement).zIndex;
    if (
      zIndex &&
      !Number.isNaN(parseInt(zIndex, 10)) &&
      parseInt(zIndex, 10) >= 50
    ) {
      el.remove();
    }
  }

  const copyStyles = (source: Element, target: Element) => {
    const computedStyle = window.getComputedStyle(source);
    const targetEl = target as HTMLElement;
    for (const key of Array.from(computedStyle)) {
      targetEl.style.setProperty(
        key,
        computedStyle.getPropertyValue(key),
        computedStyle.getPropertyPriority(key),
      );
    }
  };

  const originalElements = profileContent.querySelectorAll("*");
  const clonedElements = clonedContent.querySelectorAll("*");
  originalElements.forEach((original, index) => {
    if (clonedElements[index]) copyStyles(original, clonedElements[index]);
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

  await new Promise<void>((resolve) => {
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      resolve();
    } else {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      setTimeout(resolve, 3000);
    }
  });

  await Promise.all(
    Array.from(clonedContent.querySelectorAll("img")).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    }),
  );

  await new Promise((resolve) => setTimeout(resolve, 1500));

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
    style: { width: `${fullWidth}px`, height: `${fullHeight}px` },
  });

  document.body.removeChild(wrapper);

  if (!dataUrl || dataUrl.length < 100) {
    throw new Error("Generated image appears to be empty");
  }

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
