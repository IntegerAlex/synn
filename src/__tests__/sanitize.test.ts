import { describe, expect, it } from "vitest";
import { escapeHtml, sanitizeDiffHtml } from "@/lib/utils/sanitize";

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
