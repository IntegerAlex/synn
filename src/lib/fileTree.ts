export type FileTreeNode<T> =
  | { type: "folder"; name: string; path: string; children: FileTreeNode<T>[] }
  | { type: "file"; name: string; path: string; value: T };

export function buildFileTree<T>(
  items: T[],
  getPath: (item: T) => string,
): FileTreeNode<T>[] {
  const root: { children: FileTreeNode<T>[] } = { children: [] };

  for (const item of items) {
    const path = getPath(item);
    const parts = path.split("/").filter(Boolean);
    let children = root.children;
    let currentPath = "";

    for (const [i, name] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}/${name}` : name;
      if (i === parts.length - 1) {
        children.push({ type: "file", name, path, value: item });
        continue;
      }

      let folder = children.find(
        (node): node is Extract<FileTreeNode<T>, { type: "folder" }> =>
          node.type === "folder" && node.name === name,
      );
      if (!folder) {
        folder = { type: "folder", name, path: currentPath, children: [] };
        children.push(folder);
      }
      children = folder.children;
    }
  }

  const sortTree = (nodes: FileTreeNode<T>[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.type === "folder") sortTree(node.children);
    }
  };

  sortTree(root.children);
  return root.children;
}
