'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, HelpCircle, Share2 } from 'lucide-react';
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

// SYNN hellfire theme - red color scale
const getContributionColor = (level: 0 | 1 | 2 | 3 | 4): string => {
  const colors = {
    0: '#1a1a1a', // No contributions - dark void
    1: '#4d1515', // Ember glow
    2: '#7d1a1a', // Smoldering flame
    3: '#b91c1c', // Hellfire
    4: '#ef4444', // Inferno
  };
  return colors[level];
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
            // Poll for updates - sync runs in background on server
            let pollCount = 0;
            const pollInterval = setInterval(async () => {
              pollCount++;
              await refetch();
              
              // Stop polling after 2 minutes
              if (pollCount >= 24) {
                clearInterval(pollInterval);
                setIsSyncing(false);
              }
            }, 5000);
            
            // Initial refetch after 3 seconds
            setTimeout(() => refetch(), 3000);
          } else {
            // Sync completed or error
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

  // Manual sync handler - starts sync in background and polls for updates
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      // Trigger background sync
      const response = await fetch('/api/contributions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      if (data.status === 'started' || data.status === 'in_progress') {
        // Poll for updates every 5 seconds for up to 2 minutes
        let pollCount = 0;
        const maxPolls = 24; // 2 minutes
        const pollInterval = setInterval(async () => {
          pollCount++;
          await refetch();
          
          // Stop polling after max attempts or if sync is done
          if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            setIsSyncing(false);
          }
        }, 5000);
        
        // Initial refetch after 2 seconds
        setTimeout(() => refetch(), 2000);
      } else {
        // Sync completed immediately or error
        await refetch();
        setIsSyncing(false);
      }
    } catch (error) {
      console.error('Error syncing contributions:', error);
      setIsSyncing(false);
    }
  };

  // Process contributions from database into contribution data
  const contributionData = useMemo(() => {
    if (!contributionsData || !contributionsData.contributions) {
      return null;
    }

    const dateRange = generateDateRange();
    const contributionsMap = new Map<string, number>();

    // Convert contributions array to map
    contributionsData.contributions.forEach((c) => {
      contributionsMap.set(c.date, c.count);
    });

    // Create contribution days
    const contributionDays: ContributionDay[] = dateRange.map((date) => {
      const dateKey = date.toISOString().split('T')[0];
      const count = contributionsMap.get(dateKey) || 0;
      return {
        date: dateKey,
        count,
        level: 0, // Will be set below
      };
    });

    // Calculate max count for level normalization
    const maxCount = contributionsData.maxCount || Math.max(...contributionDays.map((d) => d.count), 1);

    // Set levels
    contributionDays.forEach((day) => {
      day.level = getContributionLevel(day.count, maxCount);
    });

    return {
      days: contributionDays,
      total: contributionsData.totalCommits || 0,
      maxCount,
    };
  }, [contributionsData]);

  // Group days by weeks
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
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-t-transparent border-[#ef4444] rounded-full animate-spin" />
          <span>Loading contribution data...</span>
        </div>
      </div>
    );
  }

  if (!contributionData) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <p>No contribution data available</p>
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
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#30363d]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#ef4444]" />
            <span className="text-sm text-gray-400">Total sins:</span>
            <span className="text-sm font-semibold text-[#ef4444]">{contributionData.total}</span>
            <div className="group relative">
              <HelpCircle className="w-3.5 h-3.5 text-gray-600 hover:text-[#ef4444] cursor-help transition-colors" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[#21262d] border border-[#ef4444]/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="text-xs mb-1 font-semibold text-[#ef4444]">Why "Sins"?</div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  Each commit is a <span className="text-[#ef4444]">sin</span> — adding tech debt, 
                  making the world worse with garbage code, and sometimes <span className="text-[#ef4444]">breaking production</span>. 
                  Your eternal record of transgressions. 🔥
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#ef4444]/30" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Peak wickedness:</span>
            <span className="text-sm font-semibold text-[#ef4444]">{contributionData.maxCount}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowSharePopover(!showSharePopover)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors border border-transparent hover:border-[#ef4444]/30"
              title="Share profile"
            >
              <Share2 className="w-3 h-3" />
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
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-[#ef4444]/30"
            title="Sync contributions from GitHub"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-1 min-w-fit">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${day.date}-${dayIndex}`}
                  className="w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-[#ef4444]/50 hover:ring-offset-1 hover:ring-offset-[#0d1117]"
                  style={{
                    backgroundColor: getContributionColor(day.level),
                  }}
                  onMouseEnter={(e) => handleDayHover(day, e)}
                  onMouseLeave={handleDayLeave}
                  title={`${day.count} ${day.count === 1 ? 'sin' : 'sins'} on ${formatDate(day.date)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#30363d]">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Pure</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getContributionColor(level as 0 | 1 | 2 | 3 | 4) }}
              />
            ))}
          </div>
          <span className="text-[#ef4444]">Damned</span>
        </div>
        <div className="text-xs text-gray-500">
          {weeks.length} weeks of sins
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-[#161b22] border border-[#ef4444]/30 rounded-lg px-3 py-2 shadow-lg shadow-[#ef4444]/10 pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-8px',
          }}
        >
          <div className="text-sm font-semibold text-[#ef4444] mb-1">
            {hoveredDay.count} {hoveredDay.count === 1 ? 'sin' : 'sins'}
          </div>
          <div className="text-xs text-gray-400">
            {formatDate(hoveredDay.date)}
          </div>
        </div>
      )}
    </div>
  );
}
