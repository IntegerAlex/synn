'use client';

import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, File as FileIcon, Folder, RefreshCw } from 'lucide-react';
import { useRepoFiles } from '@/hooks/useGitData';

type TreeNode =
  | { type: 'folder'; name: string; path: string; children: TreeNode[] }
  | { type: 'file'; name: string; path: string };

function buildTree(paths: string[]): TreeNode[] {
  const root: { children: TreeNode[] } = { children: [] };

  const getOrCreateFolder = (children: TreeNode[], name: string, path: string) => {
    const existing = children.find((n) => n.type === 'folder' && n.name === name) as
      | Extract<TreeNode, { type: 'folder' }>
      | undefined;
    if (existing) return existing;
    const folder: Extract<TreeNode, { type: 'folder' }> = { type: 'folder', name, path, children: [] };
    children.push(folder);
    return folder;
  };

  for (const fullPath of paths) {
    const parts = fullPath.split('/').filter(Boolean);
    let currentChildren = root.children;
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLeaf = i === parts.length - 1;
      if (isLeaf) {
        currentChildren.push({ type: 'file', name: part, path: fullPath });
      } else {
        const folder = getOrCreateFolder(currentChildren, part, currentPath);
        currentChildren = folder.children;
      }
    }
  }

  const sortTree = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) {
      if (n.type === 'folder') sortTree(n.children);
    }
  };
  sortTree(root.children);

  return root.children;
}

export function FileTree({ ref }: { ref?: string }) {
  const { data: files, isLoading, error, refetch, isFetching } = useRepoFiles(ref);
  const [query, setQuery] = useState('');

  const filteredPaths = useMemo(() => {
    const list = files || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => p.toLowerCase().includes(q));
  }, [files, query]);

  const tree = useMemo(() => buildTree(filteredPaths), [filteredPaths]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set<string>());

  const toggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const searchExpanded = useMemo(() => {
    if (!query.trim()) return null;
    const folders = new Set<string>();
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        if (n.type === 'folder') {
          folders.add(n.path);
          walk(n.children);
        }
      }
    };
    walk(tree);
    return folders;
  }, [query, tree]);

  const effectiveExpanded = searchExpanded ?? expanded;

  const rows = useMemo(() => {
    const out: Array<{ node: TreeNode; depth: number }> = [];
    const walk = (nodes: TreeNode[], depth: number) => {
      for (const node of nodes) {
        out.push({ node, depth });
        if (node.type === 'folder' && effectiveExpanded.has(node.path)) {
          walk(node.children, depth + 1);
        }
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, effectiveExpanded]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 28,
    overscan: 10,
  });

  if (isLoading) {
    return <div className="px-4 py-2 text-sm text-gray-500">Loading files…</div>;
  }

  if (error) {
    return (
      <div className="px-4 py-2 text-sm text-red-400 flex items-center justify-between gap-2">
        <span>Failed to load files</span>
        <button
          type="button"
          onClick={() => refetch()}
          className="p-1 rounded hover:bg-[#21262d]"
          aria-label="Retry loading files"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="py-2 flex flex-col min-h-0">
      <div className="px-3 pb-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files…"
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-xs text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#1f6feb]/40"
        />
      </div>
      {query.trim() && filteredPaths.length === 0 ? (
        <div className="px-4 py-2 text-sm text-gray-500">No matches</div>
      ) : (
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((v) => {
              const row = rows[v.index];
              if (!row) return null;
              const pad = row.depth * 12;
              const node = row.node;
              const isOpen = node.type === 'folder' ? effectiveExpanded.has(node.path) : false;
              return (
                <div
                  key={`${node.type}:${node.path}`}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${v.start}px)`, height: `${v.size}px` }}
                >
                  {node.type === 'folder' ? (
                    <button
                      type="button"
                      onClick={() => toggle(node.path)}
                      className="w-full flex items-center gap-2 text-xs py-1 rounded hover:bg-[#21262d] transition-colors text-left"
                      style={{ paddingLeft: 8 + pad }}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <Folder className="w-4 h-4 text-gray-500" />
                      <span className="truncate text-gray-200">{node.name}</span>
                    </button>
                  ) : (
                    <div
                      className="w-full flex items-center gap-2 text-xs py-1 rounded px-1 text-gray-300"
                      style={{ paddingLeft: 8 + pad }}
                      title={node.path}
                    >
                      <FileIcon className="w-4 h-4 text-gray-500" />
                      <span className="truncate">{node.name}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

