'use client';

import { useMemo } from 'react';
import { Chart, AxisOptions } from 'react-charts';
import type { GraphNode } from '@/types/git';

interface CommitActivityChartProps {
  nodes: GraphNode[];
}

type DailyCommitData = {
  date: Date;
  commits: number;
};

type Series = {
  label: string;
  data: DailyCommitData[];
};

export function CommitActivityChart({ nodes }: CommitActivityChartProps) {
  // Group commits by day/week/month based on repository age
  const chartData = useMemo((): Series[] => {
    if (!nodes || nodes.length === 0) return [];

    // Group commits by date
    const commitsByDate = new Map<string, number>();
    
    // Find date range
    let minDate = new Date();
    let maxDate = new Date(0);
    
    for (const node of nodes) {
      const date = new Date(node.date);
      if (date < minDate) minDate = date;
      if (date > maxDate) maxDate = date;
    }
    
    // Calculate time span in days
    const daySpan = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Choose granularity based on time span
    // < 90 days: daily, < 2 years: weekly, > 2 years: monthly
    let granularity: 'day' | 'week' | 'month' = 'day';
    if (daySpan > 730) {
      granularity = 'month';
    } else if (daySpan > 90) {
      granularity = 'week';
    }
    
    for (const node of nodes) {
      const date = new Date(node.date);
      let key: string;
      
      if (granularity === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (granularity === 'week') {
        // Get start of week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      }
      
      commitsByDate.set(key, (commitsByDate.get(key) || 0) + 1);
    }

    // Convert to sorted array - show ALL commits
    const sortedDates = Array.from(commitsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b));

    const data: DailyCommitData[] = sortedDates.map(([dateStr, count]) => ({
      date: new Date(dateStr),
      commits: count,
    }));

    return [
      {
        label: 'Commits',
        data,
      },
    ];
  }, [nodes]);

  const primaryAxis = useMemo(
    (): AxisOptions<DailyCommitData> => ({
      getValue: (datum) => datum.date,
      scaleType: 'time',
    }),
    []
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<DailyCommitData>[] => [
      {
        getValue: (datum) => datum.commits,
        elementType: 'area',
        min: 0,
      },
    ],
    []
  );

  if (chartData.length === 0 || chartData[0].data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No commit activity data
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Chart
        options={{
          data: chartData,
          primaryAxis,
          secondaryAxes,
          dark: true,
          defaultColors: ['#ef4444', '#f97316'],
        }}
      />
    </div>
  );
}

