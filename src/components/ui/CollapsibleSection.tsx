"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export function CollapsibleSection({
  title,
  defaultCollapsed = false,
  children,
  right,
}: {
  title: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section className="border-b border-[#30363d]">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#21262d]/40 transition-colors"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-500">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <span className="text-gray-400">
            {collapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </span>
        </div>
      </button>
      {!collapsed && <div className="px-4 pb-3">{children}</div>}
    </section>
  );
}
