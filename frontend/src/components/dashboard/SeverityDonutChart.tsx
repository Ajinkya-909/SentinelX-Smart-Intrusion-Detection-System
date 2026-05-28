import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { DistributionInsightData } from '@/types/insight';

interface SeverityDonutChartProps {
  data: DistributionInsightData;
}

const COLORS: Record<string, string> = {
  CRITICAL: 'hsl(var(--critical))',
  HIGH: 'hsl(var(--high))',
  MEDIUM: 'hsl(var(--medium))',
  LOW: 'hsl(var(--low))',
  INFO: 'hsl(var(--accent))',
};

export const SeverityDonutChart: React.FC<SeverityDonutChartProps> = ({ data }) => {
  if (!data?.distribution || data.distribution.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl p-5 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-critical/[0.01] pointer-events-none" />

      <div className="relative mb-2">
        <h3 className="text-lg font-semibold text-foreground">
          Threat Severity
        </h3>

        <p className="text-sm text-muted-foreground">
          Proportional threat distribution
        </p>
      </div>

      <div className="relative flex-grow w-full min-h-[250px]">
        {/* Center Text overlay for the donut hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4 z-10">
          <span className="text-3xl font-bold text-foreground">
            {data.total_findings}
          </span>

          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            Total
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.distribution}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={4}
              dataKey="count"
              nameKey="severity"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {data.distribution.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    COLORS[entry.severity || 'INFO'] ||
                    COLORS.INFO
                  }
                />
              ))}
            </Pie>

            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
                borderRadius: '12px',
                color: 'hsl(var(--foreground))',
                backdropFilter: 'blur(8px)',
              }}
              itemStyle={{
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
              labelStyle={{
                color: 'hsl(var(--muted-foreground))',
                marginBottom: '6px',
                fontSize: '11px',
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} (${props.payload.percentage}%)`,
                name,
              ]}
            />

            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{
                fontSize: '12px',
                color: 'hsl(var(--muted-foreground))',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};