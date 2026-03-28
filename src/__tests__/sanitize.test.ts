import { describe, it, expect } from "vitest";
import { sanitizeHtml, escapeHtml, sanitizeDiffHtml } from "@/lib/utils/sanitize";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("escapes ampersands", () => {
    expect(escapeHtml("foo & bar")).toBe("foo &amp; bar");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });

  it("handles empty strings", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("does not double-escape already escaped content", () => {
    const result = escapeHtml("&lt;");
    expect(result).toBe("&amp;lt;");
  });
});

describe("sanitizeHtml", () => {
  it("removes script tags", () => {
    const result = sanitizeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("preserves safe HTML tags", () => {
    const result = sanitizeHtml("<b>bold</b> <em>italic</em>");
    expect(result).toContain("<b>bold</b>");
    expect(result).toContain("<em>italic</em>");
  });

  it("removes event handlers", () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain("onerror");
  });

  it("allows safe attributes", () => {
    const result = sanitizeHtml('<a href="https://example.com" title="link">text</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain("text</a>");
  });

  it("handles empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("removes data attributes", () => {
    const result = sanitizeHtml('<div data-evil="payload">test</div>');
    expect(result).not.toContain("data-evil");
  });
});

describe("sanitizeDiffHtml", () => {
  it("preserves span tags with class attributes", () => {
    const result = sanitizeDiffHtml(
      '<span class="token keyword">const</span> x = 1;',
    );
    expect(result).toContain('<span class="token keyword">const</span>');
  });

  it("removes dangerous tags from highlighted code", () => {
    const result = sanitizeDiffHtml(
      '<span class="token">safe</span><script>evil</script>',
    );
    expect(result).not.toContain("<script>");
    expect(result).toContain("safe");
  });

  it("removes non-class attributes from spans", () => {
    const result = sanitizeDiffHtml(
      '<span class="token" onclick="alert(1)">text</span>',
    );
    expect(result).not.toContain("onclick");
  });

  it("handles plain text", () => {
    const result = sanitizeDiffHtml("just plain text");
    expect(result).toBe("just plain text");
  });
});
