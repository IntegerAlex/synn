/**
 * HTML sanitization utilities for preventing XSS attacks.
 * Uses DOMPurify for robust sanitization of any HTML content.
 */

import DOMPurify from "dompurify";

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Strips all potentially dangerous elements and attributes.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // Server-side: strip all HTML tags as a safe fallback
    return escapeHtml(dirty);
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "code",
      "pre",
      "span",
      "div",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "img",
      "del",
      "ins",
      "sup",
      "sub",
    ],
    ALLOWED_ATTR: [
      "href",
      "title",
      "class",
      "style",
      "src",
      "alt",
      "width",
      "height",
      "target",
      "rel",
    ],
    ALLOW_DATA_ATTR: false,
  });
}

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
