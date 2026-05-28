import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DistributionInsightData } from '@/types/insight';

interface SeverityDonutChartProps {
  data: DistributionInsightData;
}

const COLORS: Record<string, string> = {
  CRITICAL: '#EF4444', // Red
  HIGH: '#F97316',     // Orange
  MEDIUM: '#EAB308',   // Yellow
  LOW: '#3B82F6',      // Blue
  INFO: '#6B7280',     // Gray
};

export const SeverityDonutChart: React.FC<SeverityDonutChartProps> = ({ data }) => {
  if (!data?.distribution || data.distribution.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-100">Threat Severity</h3>
        <p className="text-sm text-gray-400">Proportional threat distribution</p>
      </div>

      <div className="flex-grow w-full min-h-[250px] relative">
        {/* Center Text overlay for the donut hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
          <span className="text-3xl font-bold text-gray-200">{data.total_findings}</span>
          <span className="text-xs text-gray-500 uppercase tracking-widest">Total</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.distribution}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={5}
              dataKey="count"
              nameKey="severity"
              stroke="none"
            >
              {data.distribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.severity || 'INFO'] || COLORS.INFO} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number, name: string, props: any) => [`${value} (${props.payload.percentage}%)`, name]}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};