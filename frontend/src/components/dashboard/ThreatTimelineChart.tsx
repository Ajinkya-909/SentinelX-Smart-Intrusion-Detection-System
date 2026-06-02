import React from 'react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts';
import { TimelineInsightData } from '@/types/insight';
import { format, parseISO } from 'date-fns';

interface ThreatTimelineChartProps {
  data: TimelineInsightData;
}

export const ThreatTimelineChart: React.FC<ThreatTimelineChartProps> = ({ data }) => {
  if (!data?.points || data.points.length === 0) return null;

  const chartData = data.points.map(point => ({
    time: format(parseISO(point.timestamp), 'HH:mm'),
    threats: point.threat_count || 0,
    severity: point.severity || 'INFO',
    fullDate: point.timestamp,
  }));

  const getBarColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'hsl(var(--critical))';

      case 'HIGH':
        return 'hsl(var(--high))';

      case 'MEDIUM':
        return 'hsl(var(--medium))';

      default:
        return 'hsl(var(--accent))';
    }
  };

  return (
    <div className="flex flex-col w-full h-[380px] bg-card border border-border rounded-xl p-5 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-critical/[0.015] via-transparent to-primary/[0.01] pointer-events-none" />

      <div className="relative flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Threat Detection Spikes
          </h3>

          <p className="text-sm text-muted-foreground">
            Chronological mapping of triggered security events
          </p>
        </div>

        <div className="bg-critical/10 px-3 py-1 rounded-md border border-critical/30 backdrop-blur-sm">
          <span className="text-xs font-mono font-bold text-critical">
            Total Threats: {data.total_threats}
          </span>
        </div>
      </div>

      <div className="relative h-[250px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
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
              cursor={{
                fill: 'hsl(var(--secondary))',
                fillOpacity: 0.45,
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '12px',
                color: 'hsl(var(--foreground))',
                backdropFilter: 'blur(8px)',
              }}
              itemStyle={{
                color: 'hsl(var(--critical))',
                fontSize: '12px',
              }}
              labelStyle={{
                color: 'hsl(var(--muted-foreground))',
                marginBottom: '6px',
                fontSize: '11px',
              }}
            />

            <Bar
              dataKey="threats"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.severity)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};