import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffView } from "@/components/tabs/DiffView";
import type { PRFile } from "@/hooks/useGitHubData";

const mockFiles: PRFile[] = [
  {
    filename: "src/components/App.tsx",
    status: "modified",
    additions: 5,
    deletions: 2,
    changes: 7,
    patch: `@@ -1,5 +1,8 @@
 import React from 'react';
-import { OldComponent } from './OldComponent';
+import { NewComponent } from './NewComponent';
+import { AnotherComponent } from './AnotherComponent';
 
 function App() {
-  return <OldComponent />;
+  return (
+    <NewComponent />
+  );
 }`,
  },
  {
    filename: "src/utils/helpers.ts",
    status: "added",
    additions: 3,
    deletions: 0,
    changes: 3,
    patch: `@@ -0,0 +1,3 @@
+export function helper() {
+  return true;
+}`,
  },
];

describe("DiffView", () => {
  it("renders file count and stats", () => {
    render(<DiffView files={mockFiles} />);
    expect(screen.getByText(/2 files changed/)).toBeInTheDocument();
  });

  it("renders file names", () => {
    render(<DiffView files={mockFiles} />);
    expect(screen.getByText("src/components/App.tsx")).toBeInTheDocument();
    expect(screen.getByText("src/utils/helpers.ts")).toBeInTheDocument();
  });

  it("renders unified and split view toggle buttons", () => {
    render(<DiffView files={mockFiles} />);
    expect(screen.getByTitle("Unified view")).toBeInTheDocument();
    expect(screen.getByTitle("Split view")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<DiffView files={[]} isLoading />);
    // Should show spinner, not the no files message
    expect(screen.queryByText("No file changes.")).not.toBeInTheDocument();
  });

  it("shows empty state when no files", () => {
    render(<DiffView files={[]} />);
    expect(screen.getByText("No file changes.")).toBeInTheDocument();
  });

  it("shows file tree sidebar when multiple files", () => {
    render(<DiffView files={mockFiles} />);
    // File tree shows file count
    expect(screen.getByText("Files (2)")).toBeInTheDocument();
  });

  it("renders addition and deletion counts", () => {
    render(<DiffView files={mockFiles} />);
    // Total additions: 5+3=8, deletions: 2+0=2
    // The text appears in toolbar and per-file, so use getAllByText
    const additions = screen.getAllByText("+8");
    expect(additions.length).toBeGreaterThanOrEqual(1);
    const deletions = screen.getAllByText("-2");
    expect(deletions.length).toBeGreaterThanOrEqual(1);
  });

  it("handles files with no patch gracefully", () => {
    const filesNoPatch: PRFile[] = [
      {
        filename: "binary.png",
        status: "added",
        additions: 0,
        deletions: 0,
        changes: 0,
      },
    ];
    render(<DiffView files={filesNoPatch} />);
    expect(
      screen.getByText("No diff available (binary file or too large)."),
    ).toBeInTheDocument();
  });
});

describe("DiffView view mode switching", () => {
  it("switches between unified and split modes", () => {
    render(<DiffView files={mockFiles} />);
    const splitButton = screen.getByTitle("Split view");
    fireEvent.click(splitButton);
    // Split button should now be active (bg-[#21262d] class)
    expect(splitButton.className).toContain("text-white");
  });
});
