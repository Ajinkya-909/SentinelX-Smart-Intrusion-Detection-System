import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { TimelineInsightData } from '@/types/insight';
import { format, parseISO } from 'date-fns';

interface ActivityTimelineChartProps {
  data: TimelineInsightData;
}

export const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({ data }) => {
  if (!data?.points) return null;

  // Format data for Recharts
  const chartData = data.points.map(point => ({
    time: format(parseISO(point.timestamp), 'HH:mm'),
    events: point.event_count || 0,
    fullDate: point.timestamp,
  }));

  return (
    <div className="flex flex-col w-full h-[380px] bg-card border border-border rounded-xl p-5 gradient-card overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-accent/[0.015] pointer-events-none" />

      <div className="relative flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            System Activity Timeline
          </h3>

          <p className="text-sm text-muted-foreground">
            Log event volume mapped over the analysis window
          </p>
        </div>

        <div className="bg-secondary/80 px-3 py-1 rounded-md border border-border backdrop-blur-sm">
          <span className="text-xs font-mono text-primary">
            Total: {data.total_events}
          </span>
        </div>
      </div>

      <div className="h-[250px] w-full mt-2 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0.22}
                />

                <stop
                  offset="95%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.35}
            />

            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />

            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
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
                color: 'hsl(var(--primary))',
                fontSize: '12px',
              }}
              labelStyle={{
                color: 'hsl(var(--muted-foreground))',
                marginBottom: '6px',
                fontSize: '11px',
              }}
              cursor={{
                stroke: 'hsl(var(--primary))',
                strokeOpacity: 0.15,
              }}
            />

            <Area
              type="monotone"
              dataKey="events"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorEvents)"
              activeDot={{
                r: 4,
                fill: 'hsl(var(--primary))',
                stroke: 'hsl(var(--background))',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};