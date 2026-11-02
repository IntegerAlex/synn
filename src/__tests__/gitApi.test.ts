import { afterEach, describe, expect, it, vi } from "vitest";
import { gitApi } from "@/lib/api/client";
import type { RepoInfo } from "@/types/git";

const repoInfo: RepoInfo = {
  path: "owner/repo",
  name: "repo",
  currentBranch: "main",
  isClean: true,
  ahead: 0,
  behind: 0,
  remotes: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gitApi", () => {
  it("sends GET headers, encodes the repo, and unwraps data", async () => {
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => (key === "visitorId" ? "visitor-1" : null),
    });
    const data = { commits: [], branches: [], total: 0 };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(gitApi.getGraph(repoInfo, 20, 5, "share-1")).resolves.toEqual(
      data,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/git/graph?repo=owner%2Frepo&limit=20&offset=5",
      {
        headers: {
          "Content-Type": "application/json",
          "x-visitor-id": "visitor-1",
          "x-share-id": "share-1",
        },
      },
    );
  });

  it("sends JSON for POST and surfaces API errors", async () => {
    const repo = { ...repoInfo, defaultBranch: "main" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: repo }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Denied" } }), {
          status: 403,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      gitApi.setRepo({ repoFullName: "owner/repo", defaultBranch: "main" }),
    ).resolves.toEqual(repo);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/git/repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repo_full_name: "owner/repo",
        default_branch: "main",
      }),
    });
    await expect(
      gitApi.setRepo({ repoFullName: "owner/repo" }),
    ).rejects.toThrow("Denied");
  });

  it("rejects when no repository is selected", async () => {
    await expect(gitApi.getRepoInfo(null)).rejects.toThrow(
      "Repository not selected",
    );
  });
});
