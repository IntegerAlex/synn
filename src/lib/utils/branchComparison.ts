/**
 * Pure utilities for branch comparison calculations.
 * These are shared between the BranchCompareDrawer component and tests.
 */

export interface DivergenceResult {
  status: "identical" | "ahead" | "behind" | "diverged";
  label: string;
}

/**
 * Derives a human-readable divergence summary from raw ahead_by / behind_by
 * values returned by the GitHub compare API.
 */
export function calculateDivergence(
  aheadBy: number,
  behindBy: number,
): DivergenceResult {
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
 * Derives percentage values for an ahead/behind progress bar.
 * The returned values always sum to 100 (or both are 0 when total is 0).
 */
export function calculateAheadBehindPct(
  ahead: number,
  behind: number,
): { aheadPct: number; behindPct: number } {
  const total = ahead + behind;
  if (total === 0) return { aheadPct: 0, behindPct: 0 };
  const aheadPct = Math.round((ahead / total) * 100);
  return { aheadPct, behindPct: 100 - aheadPct };
}
