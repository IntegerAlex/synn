import { describe, expect, it } from "vitest";
import {
  buildHighlightedCommitsSet,
  normalizeBranchLabel,
} from "@/lib/graph/highlightCommits";
import type { GraphData, GraphNode } from "@/types/git";

function node(hash: string, parents: string[], refs: string[] = []): GraphNode {
  return {
    id: hash,
    hash,
    shortHash: hash.slice(0, 7),
    message: hash,
    author: "a",
    date: "2024-01-01T00:00:00Z",
    column: 0,
    row: 0,
    refs,
    color: "#fff",
    parentHashes: parents,
  };
}

// main: m2 -> m1 -> base ; feature: f1 -> base ; base is shared
const graph: GraphData = {
  nodes: [
    node("m2", ["m1"], ["main"]),
    node("m1", ["base"]),
    node("f1", ["base"], ["feature"]),
    node("base", []),
  ],
  edges: [],
  columns: 2,
  branches: ["main", "feature"],
  currentBranch: "main",
  branchHeads: { main: "m2", feature: "f1" },
};

describe("normalizeBranchLabel", () => {
  it("strips HEAD, remote and tag prefixes", () => {
    expect(normalizeBranchLabel("HEAD -> main")).toBe("main");
    expect(normalizeBranchLabel("origin/feature")).toBe("feature");
    expect(normalizeBranchLabel("tag: v1.0")).toBe("v1.0");
  });
});

describe("buildHighlightedCommitsSet", () => {
  it("returns empty when nothing is highlighted", () => {
    expect(buildHighlightedCommitsSet(graph, new Set()).size).toBe(0);
  });

  it("walks ancestry from the branch head", () => {
    const result = buildHighlightedCommitsSet(graph, new Set(["feature"]));
    expect([...result].sort()).toEqual(["base", "f1"]);
  });

  it("includes shared ancestry for multiple branches", () => {
    const result = buildHighlightedCommitsSet(
      graph,
      new Set(["main", "feature"]),
    );
    expect([...result].sort()).toEqual(["base", "f1", "m1", "m2"]);
  });

  it("ignores a branch whose head is outside the graph", () => {
    const partial: GraphData = { ...graph, branchHeads: { gone: "nope" } };
    expect(buildHighlightedCommitsSet(partial, new Set(["gone"])).size).toBe(0);
  });

  it("terminates on a cycle without revisiting nodes", () => {
    const cyc: GraphData = {
      nodes: [node("a", ["b"]), node("b", ["a"])],
      edges: [],
      columns: 1,
      branches: ["main"],
      currentBranch: "main",
      branchHeads: { main: "a" },
    };
    expect(
      [...buildHighlightedCommitsSet(cyc, new Set(["main"]))].sort(),
    ).toEqual(["a", "b"]);
  });
});
