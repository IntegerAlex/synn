import { describe, expect, it } from "vitest";
import type { GitHubBranchInfo } from "@/hooks/useGitHubData";

/**
 * Test the branch filtering and sorting logic used in BranchSelector.
 * These are pure functions extracted from the component logic.
 */

function filterBranches(
  branches: GitHubBranchInfo[],
  query: string,
): GitHubBranchInfo[] {
  if (!query.trim()) return branches;
  const lowerQuery = query.toLowerCase();
  return branches.filter((b) => b.name.toLowerCase().includes(lowerQuery));
}

function sortBranches(branches: GitHubBranchInfo[]): GitHubBranchInfo[] {
  return [...branches].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    if (a.protected && !b.protected) return -1;
    if (!a.protected && b.protected) return 1;
    return a.name.localeCompare(b.name);
  });
}

const mockBranches: GitHubBranchInfo[] = [
  { name: "develop", sha: "abc123", protected: false, isDefault: false },
  { name: "main", sha: "def456", protected: true, isDefault: true },
  {
    name: "feature/auth",
    sha: "ghi789",
    protected: false,
    isDefault: false,
  },
  {
    name: "release/v2",
    sha: "jkl012",
    protected: true,
    isDefault: false,
  },
  {
    name: "hotfix/urgent",
    sha: "mno345",
    protected: false,
    isDefault: false,
  },
];

describe("branch filtering", () => {
  it("returns all branches with empty query", () => {
    const result = filterBranches(mockBranches, "");
    expect(result).toHaveLength(5);
  });

  it("filters by name substring", () => {
    const result = filterBranches(mockBranches, "feature");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("feature/auth");
  });

  it("is case insensitive", () => {
    const result = filterBranches(mockBranches, "MAIN");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("main");
  });

  it("returns empty array when no match", () => {
    const result = filterBranches(mockBranches, "nonexistent");
    expect(result).toHaveLength(0);
  });

  it("filters with partial match", () => {
    const result = filterBranches(mockBranches, "re");
    // matches: release/v2
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((b) => b.name === "release/v2")).toBe(true);
  });
});

describe("branch sorting", () => {
  it("puts default branch first", () => {
    const result = sortBranches(mockBranches);
    expect(result[0].name).toBe("main");
  });

  it("puts protected branches before unprotected", () => {
    const result = sortBranches(mockBranches);
    // main (default+protected) should be first
    // release/v2 (protected) should be second
    expect(result[0].name).toBe("main");
    expect(result[1].name).toBe("release/v2");
  });

  it("sorts alphabetically within same priority", () => {
    const result = sortBranches(mockBranches);
    // After main and release/v2, remaining should be: develop, feature/auth, hotfix/urgent
    const unprotected = result.slice(2).map((b) => b.name);
    expect(unprotected).toEqual(["develop", "feature/auth", "hotfix/urgent"]);
  });

  it("handles empty array", () => {
    const result = sortBranches([]);
    expect(result).toEqual([]);
  });
});
