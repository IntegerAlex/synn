/**
 * HTML sanitization utilities for preventing XSS attacks.
 * Uses DOMPurify for robust sanitization of any HTML content.
 */

import DOMPurify from "dompurify";

/**
 * Escape HTML special characters to prevent injection.
 * Use this for plain text that should never contain HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sanitize diff content specifically.
 * Preserves Prism.js highlighting spans while removing dangerous content.
 */
export function sanitizeDiffHtml(dirty: string): string {
  if (typeof window === "undefined") {
    return escapeHtml(dirty);
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["span"],
    ALLOWED_ATTR: ["class"],
    ALLOW_DATA_ATTR: false,
  });
}
