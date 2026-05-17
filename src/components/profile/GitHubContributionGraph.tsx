'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, HelpCircle, Share2, Activity } from 'lucide-react';
import { SharePopover } from './SharePopover';

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

// GitHub-style contribution levels
const getContributionLevel = (count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 => {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
};

// Professional Blue theme color scale
const getContributionColor = (level: 0 | 1 | 2 | 3 | 4): string => {
  const colors = {
    0: '#161b22', // Empty
    1: '#0e4429', // Level 1 (GitHub dark green style, let's use blue)
  };
  
  // Actually let's use a nice blue scale
  const blueScale = {
    0: '#161b22',
    1: '#1e3a8a', // blue-900
    2: '#1d4ed8', // blue-700
    3: '#3b82f6', // blue-500
    4: '#60a5fa', // blue-400
  };
  return blueScale[level];
};

// Generate last 371 days (53 weeks)
const generateDateRange = (): Date[] => {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 370; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  
  return dates;
};

// Get week start day (Sunday = 0)
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
};

interface ContributionData {
  date: string;
  count: number;
}

interface ContributionsResponse {
  contributions: ContributionData[];
  totalCommits: number;
  maxCount: number;
  shouldSync: boolean;
}

interface GitHubContributionGraphProps {
  onShareClick?: () => void;
  profileContentRef?: React.RefObject<HTMLDivElement | null>;
}

export function GitHubContributionGraph({ onShareClick, profileContentRef }: GitHubContributionGraphProps) {
  const [hoveredDay, setHoveredDay] = useState<ContributionDay | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSharePopover, setShowSharePopover] = useState(false);

  // Fetch contributions from database
  const { data: contributionsData, isLoading, refetch } = useQuery<ContributionsResponse>({
    queryKey: ['contributions'],
    queryFn: async () => {
      const response = await fetch('/api/contributions?days=371');
      if (!response.ok) {
        throw new Error('Failed to fetch contributions');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Trigger sync if needed (in background)
  useEffect(() => {
    if (contributionsData?.shouldSync && !isSyncing) {
      setIsSyncing(true);
      fetch('/api/contributions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (response) => {
          const data = await response.json();
          
          if (data.status === 'started' || data.status === 'in_progress') {
            let pollCount = 0;
            const pollInterval = setInterval(async () => {
              pollCount++;
              await refetch();
              if (pollCount >= 24) {
                clearInterval(pollInterval);
                setIsSyncing(false);
              }
            }, 5000);
            setTimeout(() => refetch(), 3000);
          } else {
            setTimeout(() => {
              refetch();
              setIsSyncing(false);
            }, 2000);
          }
        })
        .catch((error) => {
          console.error('Error syncing contributions:', error);
          setIsSyncing(false);
        });
    }
  }, [contributionsData?.shouldSync, isSyncing, refetch]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/contributions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.status === 'started' || data.status === 'in_progress') {
        let pollCount = 0;
        const maxPolls = 24;
        const pollInterval = setInterval(async () => {
          pollCount++;
          await refetch();
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsSyncing(false);
          }
        }, 5000);
        setTimeout(() => refetch(), 2000);
      } else {
        await refetch();
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Error syncing contributions:', error);
      setIsSyncing(false);
    }
  };

  const contributionData = useMemo(() => {
    if (!contributionsData || !contributionsData.contributions) {
      return null;
    }

    const dateRange = generateDateRange();
    const contributionsMap = new Map<string, number>();

    contributionsData.contributions.forEach((c) => {
      contributionsMap.set(c.date, c.count);
    });

    const contributionDays: ContributionDay[] = dateRange.map((date) => {
      const dateKey = date.toISOString().split('T')[0];
      const count = contributionsMap.get(dateKey) || 0;
      return {
        date: dateKey,
        count,
        level: 0,
      };
    });

    const maxCount = contributionsData.maxCount || Math.max(...contributionDays.map((d) => d.count), 1);

    contributionDays.forEach((day) => {
      day.level = getContributionLevel(day.count, maxCount);
    });

    return {
      days: contributionDays,
      total: contributionsData.totalCommits || 0,
      maxCount,
    };
  }, [contributionsData]);

  const weeks = useMemo(() => {
    if (!contributionData) return [];

    const weeks: ContributionDay[][] = [];
    let currentWeek: ContributionDay[] = [];
    let currentWeekStart: Date | null = null;

    contributionData.days.forEach((day) => {
      const date = new Date(day.date);
      const weekStart = getWeekStart(date);

      if (!currentWeekStart || weekStart.getTime() !== currentWeekStart.getTime()) {
        if (currentWeek.length > 0) {
          weeks.push(currentWeek);
        }
        currentWeek = [day];
        currentWeekStart = weekStart;
      } else {
        currentWeek.push(day);
      }
    });

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [contributionData]);

  const handleDayHover = (day: ContributionDay, event: React.MouseEvent<HTMLDivElement>) => {
    setHoveredDay(day);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleDayLeave = () => {
    setHoveredDay(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
          <span className="font-medium">Accessing activity records...</span>
        </div>
      </div>
    );
  }

  if (!contributionData) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <p>No activity data discovered.</p>
      </div>
    );
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div className="relative">
      {/* Stats */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-[#30363d]/50">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Total Commits</span>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xl font-black text-white">{contributionData.total.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Highest Daily</span>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="text-xl font-black text-white">{contributionData.maxCount}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowSharePopover(!showSharePopover)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-[#30363d]"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            {showSharePopover && (
              <SharePopover
                profileContentRef={profileContentRef}
                onClose={() => setShowSharePopover(false)}
              />
            )}
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-400 hover:text-white hover:bg-blue-600/10 rounded-xl transition-all border border-blue-500/30 disabled:opacity-30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-1 min-w-fit">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${day.date}-${dayIndex}`}
                  className="w-3 h-3 rounded-[2px] cursor-pointer transition-all hover:ring-2 hover:ring-blue-500/50 hover:ring-offset-2 hover:ring-offset-[#0d1117]"
                  style={{
                    backgroundColor: getContributionColor(day.level),
                  }}
                  onMouseEnter={(e) => handleDayHover(day, e)}
                  onMouseLeave={handleDayLeave}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#30363d]/30">
        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="w-2.5 h-2.5 rounded-[2px]"
                style={{ backgroundColor: getContributionColor(level as 0 | 1 | 2 | 3 | 4) }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
        <div className="text-[10px] font-black text-gray-600 uppercase tracking-tight">
          53 Week Activity Window
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-[#1c2128] border border-[#30363d] rounded-xl px-4 py-2.5 shadow-2xl pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-12px',
          }}
        >
          <div className="text-sm font-black text-white mb-0.5">
            {hoveredDay.count} {hoveredDay.count === 1 ? 'commit' : 'commits'}
          </div>
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            {formatDate(hoveredDay.date)}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-[#1c2128]" />
        </div>
      )}
    </div>
  );
}
