import type { GraphData, GraphNode } from "@/types/git";

export function normalizeBranchLabel(branch: string): string {
  return branch
    .replace("HEAD -> ", "")
    .replace("origin/", "")
    .replace("remote/", "")
    .replace("tag: ", "")
    .trim();
}

/**
 * Builds the set of commit hashes belonging to the highlighted branches by
 * traversing from each branch head through its parents.
 */
export function buildHighlightedCommitsSet(
  graphData: GraphData,
  highlightedBranches: Set<string>,
): Set<string> {
  const highlightedCommits = new Set<string>();
  if (highlightedBranches.size === 0) {
    return highlightedCommits;
  }

  const hashToNode = new Map<string, GraphNode>();
  for (const node of graphData.nodes) {
    hashToNode.set(node.hash, node);
  }

  // normalized branch name -> branch head hash
  const branchNameToHead = new Map<string, string>();
  if (graphData.branchHeads) {
    for (const [branchName, headHash] of Object.entries(
      graphData.branchHeads,
    )) {
      branchNameToHead.set(normalizeBranchLabel(branchName), headHash);
      branchNameToHead.set(branchName, headHash);
    }
  }

  // Fallback: derive heads from node refs when branchHeads is missing/incomplete
  for (const node of graphData.nodes) {
    if (!node.refs || node.refs.length === 0) continue;
    for (const ref of node.refs) {
      if (ref.includes("tag:")) continue;
      const normalizedBranch = normalizeBranchLabel(ref);
      if (
        highlightedBranches.has(normalizedBranch) &&
        !branchNameToHead.has(normalizedBranch)
      ) {
        branchNameToHead.set(normalizedBranch, node.hash);
      }
      if (highlightedBranches.has(ref) && !branchNameToHead.has(ref)) {
        branchNameToHead.set(ref, node.hash);
      }
    }
  }

  for (const highlightedBranch of highlightedBranches) {
    const headHash = branchNameToHead.get(highlightedBranch);
    if (!headHash || !hashToNode.has(headHash)) continue;

    const visited = new Set<string>();
    const queue: string[] = [headHash];
    // Index pointer instead of queue.shift() to keep traversal O(n).
    for (let qi = 0; qi < queue.length; qi++) {
      const currentHash = queue[qi];
      if (visited.has(currentHash)) continue;
      visited.add(currentHash);
      highlightedCommits.add(currentHash);

      const node = hashToNode.get(currentHash);
      if (!node?.parentHashes) continue;
      for (const parentHash of node.parentHashes) {
        if (!visited.has(parentHash) && hashToNode.has(parentHash)) {
          queue.push(parentHash);
        }
      }
    }
  }

  return highlightedCommits;
}
