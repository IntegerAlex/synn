"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SemanticChange } from "@/lib/diff/semanticAnalyzer";

interface SemanticSummaryProps {
  semanticChanges: SemanticChange[];
  children: React.ReactNode;
}

export function SemanticSummary({
  semanticChanges,
  children,
}: SemanticSummaryProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }
  }, [isHovered]);

  if (semanticChanges.length === 0) {
    return <>{children}</>;
  }

  const _primaryChange = semanticChanges[0];

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative inline-flex items-center"
      >
        {children}
        <Info className="w-3.5 h-3.5 ml-1.5 text-[#79c0ff] opacity-60 hover:opacity-100 transition-opacity" />
      </div>

      <AnimatePresence>
        {isHovered && tooltipPosition && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl p-3 max-w-xs">
              <div className="text-xs font-medium text-gray-200 mb-2">
                Semantic Change
              </div>
              <div className="space-y-1.5">
                {semanticChanges.map((change, idx) => (
                  <div key={idx} className="text-xs text-gray-300">
                    <div className="font-medium text-[#79c0ff] mb-0.5">
                      {change.description}
                    </div>
                    {change.scope && (
                      <div className="text-gray-500 text-[10px]">
                        Scope: {change.scope}
                      </div>
                    )}
                    {change.oldValue && change.newValue && (
                      <div className="text-gray-500 text-[10px] mt-0.5">
                        <span className="text-[#f85149]">
                          {change.oldValue}
                        </span>
                        {" → "}
                        <span className="text-[#3fb950]">
                          {change.newValue}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#30363d]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
