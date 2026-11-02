import { describe, expect, it } from "vitest";
import { buildFileTree } from "@/lib/fileTree";

describe("buildFileTree", () => {
  it("builds nested folders, sorts folders before files, and keeps leaf values", () => {
    const files = [
      { path: "src/z.ts", id: 1 },
      { path: "README.md", id: 2 },
      { path: "src/lib/a.ts", id: 3 },
      { path: "docs/guide.md", id: 4 },
    ];

    expect(buildFileTree(files, (file) => file.path)).toEqual([
      {
        type: "folder",
        name: "docs",
        path: "docs",
        children: [
          {
            type: "file",
            name: "guide.md",
            path: "docs/guide.md",
            value: files[3],
          },
        ],
      },
      {
        type: "folder",
        name: "src",
        path: "src",
        children: [
          {
            type: "folder",
            name: "lib",
            path: "src/lib",
            children: [
              {
                type: "file",
                name: "a.ts",
                path: "src/lib/a.ts",
                value: files[2],
              },
            ],
          },
          {
            type: "file",
            name: "z.ts",
            path: "src/z.ts",
            value: files[0],
          },
        ],
      },
      {
        type: "file",
        name: "README.md",
        path: "README.md",
        value: files[1],
      },
    ]);
  });
});
