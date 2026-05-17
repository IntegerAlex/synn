"use client";

import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import type { ChangeGroup } from "@/lib/diff/changeGrouper";
import { extractSemanticScope } from "@/lib/diff/semanticAnalyzer";

interface BreadcrumbItem {
  type: "file" | "function" | "class" | "block";
  name: string;
  lineNumber?: number;
}

interface BreadcrumbsProps {
  filePath: string;
  currentGroup?: ChangeGroup;
  semanticScope?: string;
}

export function Breadcrumbs({
  filePath,
  currentGroup,
  semanticScope,
}: BreadcrumbsProps) {
  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [];

    // File path
    const pathParts = filePath.split("/");
    const fileName = pathParts.pop() || filePath;
    items.push({
      type: "file",
      name: fileName,
    });

    // Scope (function/class)
    if (semanticScope || currentGroup) {
      const scope =
        semanticScope ||
        (currentGroup ? extractSemanticScope(currentGroup) : null);
      if (scope && scope !== currentGroup?.title) {
        items.push({
          type: currentGroup?.type === "class" ? "class" : "function",
          name: scope,
          lineNumber: currentGroup?.startLine,
        });
      }
    }

    // Change description
    if (currentGroup?.description) {
      const desc =
        currentGroup.description.split(" - ")[1] || currentGroup.description;
      if (desc && desc !== currentGroup.title) {
        items.push({
          type: "block",
          name: desc,
        });
      }
    }

    return items;
  }, [filePath, currentGroup, semanticScope]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 z-20 bg-[#161b22] border-b border-[#30363d] px-4 py-2 shrink-0"
    >
      <div className="flex items-center gap-2 text-xs">
        {breadcrumbs.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-500" />}
            <span
              className={
                item.type === "file"
                  ? "font-mono text-gray-300"
                  : item.type === "function" || item.type === "class"
                    ? "text-[#79c0ff]"
                    : "text-gray-400"
              }
            >
              {item.name}
            </span>
            {item.lineNumber && (
              <span className="text-gray-500">:{item.lineNumber}</span>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
