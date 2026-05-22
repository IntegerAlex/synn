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

// ============ Ahead/Behind Calculation Tests ============

/**
 * Pure helper that derives a human-readable divergence summary from raw
 * ahead_by / behind_by values returned by the GitHub compare API.
 */
function calculateDivergence(
  aheadBy: number,
  behindBy: number,
): { status: string; label: string } {
  if (aheadBy === 0 && behindBy === 0) {
    return { status: "identical", label: "Branches are identical" };
  }
  if (aheadBy > 0 && behindBy === 0) {
    return {
      status: "ahead",
      label: `Target is ${aheadBy} commit${aheadBy !== 1 ? "s" : ""} ahead`,
    };
  }
  if (aheadBy === 0 && behindBy > 0) {
    return {
      status: "behind",
      label: `Target is ${behindBy} commit${behindBy !== 1 ? "s" : ""} behind`,
    };
  }
  return {
    status: "diverged",
    label: `Branches have diverged: ${aheadBy} ahead, ${behindBy} behind`,
  };
}

/**
 * Derive a percentage split for the ahead/behind progress bar.
 * Returns values that always sum to 100.
 */
function calculateAheadBehindPct(
  ahead: number,
  behind: number,
): { aheadPct: number; behindPct: number } {
  const total = ahead + behind;
  if (total === 0) return { aheadPct: 0, behindPct: 0 };
  const aheadPct = Math.round((ahead / total) * 100);
  return { aheadPct, behindPct: 100 - aheadPct };
}

describe("calculateDivergence", () => {
  it("returns identical when both are zero", () => {
    const result = calculateDivergence(0, 0);
    expect(result.status).toBe("identical");
  });

  it("returns ahead when only ahead_by > 0", () => {
    const result = calculateDivergence(3, 0);
    expect(result.status).toBe("ahead");
    expect(result.label).toContain("3 commits ahead");
  });

  it("uses singular commit when ahead_by is 1", () => {
    const result = calculateDivergence(1, 0);
    expect(result.label).toContain("1 commit ahead");
    expect(result.label).not.toContain("commits");
  });

  it("returns behind when only behind_by > 0", () => {
    const result = calculateDivergence(0, 5);
    expect(result.status).toBe("behind");
    expect(result.label).toContain("5 commits behind");
  });

  it("uses singular commit when behind_by is 1", () => {
    const result = calculateDivergence(0, 1);
    expect(result.label).toContain("1 commit behind");
    expect(result.label).not.toContain("commits");
  });

  it("returns diverged when both ahead and behind", () => {
    const result = calculateDivergence(4, 2);
    expect(result.status).toBe("diverged");
    expect(result.label).toContain("4 ahead");
    expect(result.label).toContain("2 behind");
  });
});

describe("calculateAheadBehindPct", () => {
  it("returns zeros when both are zero", () => {
    const result = calculateAheadBehindPct(0, 0);
    expect(result.aheadPct).toBe(0);
    expect(result.behindPct).toBe(0);
  });

  it("returns 100% ahead when only ahead", () => {
    const result = calculateAheadBehindPct(5, 0);
    expect(result.aheadPct).toBe(100);
    expect(result.behindPct).toBe(0);
  });

  it("returns 100% behind when only behind", () => {
    const result = calculateAheadBehindPct(0, 8);
    expect(result.aheadPct).toBe(0);
    expect(result.behindPct).toBe(100);
  });

  it("percentages always sum to 100", () => {
    const cases = [
      [3, 1],
      [1, 3],
      [10, 7],
      [1, 1],
    ] as const;
    for (const [a, b] of cases) {
      const { aheadPct, behindPct } = calculateAheadBehindPct(a, b);
      expect(aheadPct + behindPct).toBe(100);
    }
  });

  it("50/50 split for equal values", () => {
    const result = calculateAheadBehindPct(5, 5);
    expect(result.aheadPct).toBe(50);
    expect(result.behindPct).toBe(50);
  });
});
