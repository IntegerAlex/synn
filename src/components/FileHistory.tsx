'use client';

import { X } from 'lucide-react';
import { useFileHistory } from '@/hooks/useFileHistory';

export function FileHistory({
  filepath,
  open,
  onClose,
  onSelectCommit,
}: {
  filepath: string | null;
  open: boolean;
  onClose: () => void;
  onSelectCommit: (hash: string) => void;
}) {
  const { data, isLoading, error, refetch, isFetching } = useFileHistory(filepath, { limit: 50 });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-[#30363d] bg-[#0d1117] shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-200">File history</div>
            <div className="text-xs text-gray-400 truncate">{filepath}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-[#21262d]"
            aria-label="Close file history"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-gray-500">Loading…</div>
          ) : error ? (
            <div className="px-4 py-6 text-sm text-red-400 flex items-center justify-between gap-2">
              <span>Failed to load history</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1 rounded border border-[#30363d] hover:bg-[#21262d] text-xs text-gray-200"
              >
                {isFetching ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          ) : !data || data.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500">No history found</div>
          ) : (
            <div className="divide-y divide-[#30363d]">
              {data.map((c) => (
                <button
                  key={c.hash}
                  type="button"
                  onClick={() => onSelectCommit(c.hash)}
                  className="w-full text-left px-4 py-3 hover:bg-[#161b22] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <code className="text-xs font-mono text-[#ef4444]">
                      {c.shortHash}
                    </code>
                    <span className="text-xs text-gray-200 truncate">{c.message}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500">
                    {c.author.name} • {c.date ? new Date(c.date).toLocaleString() : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

