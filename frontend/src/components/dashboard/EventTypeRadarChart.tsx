import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DistributionInsightData } from '@/types/insight';

interface EventTypeRadarChartProps {
  data: DistributionInsightData;
}

export const EventTypeRadarChart: React.FC<EventTypeRadarChartProps> = ({ data }) => {
  if (!data?.distribution || data.distribution.length === 0) return null;

  // Format data: shortens labels if they are too long
  const chartData = data.distribution.slice(0, 6).map(item => ({
    subject:
      item.event_type?.replace(/_/g, ' ').replace('ATTEMPT', '') ||
      'UNKNOWN',
    count: item.count,
    fullMark: data.total_events || 100,
  }));

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl p-5 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.015] via-transparent to-primary/[0.015] pointer-events-none" />

      <div className="relative mb-2">
        <h3 className="text-lg font-semibold text-foreground">
          Attack Surface Vector
        </h3>

        <p className="text-sm text-muted-foreground">
          Distribution of log event categories
        </p>
      </div>

      <div className="relative flex-grow w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            cx="50%"
            cy="50%"
            outerRadius="70%"
            data={chartData}
          >
            <PolarGrid
              stroke="hsl(var(--border))"
              opacity={0.4}
            />

            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 10,
              }}
            />

            <PolarRadiusAxis
              angle={30}
              domain={[0, 'dataMax']}
              tick={false}
              axisLine={false}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '12px',
                color: 'hsl(var(--foreground))',
                backdropFilter: 'blur(8px)',
              }}
              itemStyle={{
                color: 'hsl(var(--accent))',
                fontSize: '12px',
              }}
              labelStyle={{
                color: 'hsl(var(--muted-foreground))',
                marginBottom: '6px',
                fontSize: '11px',
              }}
            />

            <Radar
              name="Events"
              dataKey="count"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="hsl(var(--accent))"
              fillOpacity={0.18}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};