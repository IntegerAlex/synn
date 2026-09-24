import { describe, expect, it } from "vitest";
import {
  analyzeSemanticChanges,
  extractSemanticScope,
} from "@/lib/diff/semanticAnalyzer";

describe("analyzeSemanticChanges (pattern-based, no compiler)", () => {
  it("detects a function signature change", () => {
    const oldCode = "function greet(name) {\n  return name;\n}";
    const newCode = "function greet(name, greeting) {\n  return name;\n}";
    const changes = analyzeSemanticChanges(oldCode, newCode, "typescript");
    expect(
      changes.some(
        (c) => c.type === "function-signature" && c.scope === "greet()",
      ),
    ).toBe(true);
  });

  it("detects an added function", () => {
    const changes = analyzeSemanticChanges(
      "function a() {}",
      "function a() {}\nfunction b() {}",
      "typescript",
    );
    expect(
      changes.some((c) => c.type === "addition" && c.scope === "b()"),
    ).toBe(true);
  });

  it("detects a new initialization variable", () => {
    const changes = analyzeSemanticChanges(
      "const x = 1;",
      "const x = 1;\nconst telemetryClient = init();",
      "typescript",
    );
    expect(changes.some((c) => c.type === "initialization")).toBe(true);
  });

  it("returns no changes for identical code", () => {
    const code = "function a(b) {\n  return b;\n}";
    expect(analyzeSemanticChanges(code, code, "typescript")).toEqual([]);
  });
});

describe("extractSemanticScope", () => {
  it("prefers a function name found in the group changes", () => {
    const scope = extractSemanticScope({
      title: "Group",
      type: "change",
      changes: [{ right: { content: "const handleClick = () => {}" } }],
    });
    expect(scope).toBe("handleClick()");
  });

  it("falls back to the group title", () => {
    const scope = extractSemanticScope({
      title: "Group",
      type: "change",
      changes: [{ right: { content: "return 1;" } }],
    });
    expect(scope).toBe("Group");
  });
});
