import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { DistributionInsightData } from '@/types/insight';

interface EventTypeRadarChartProps {
  data: DistributionInsightData;
}

export const EventTypeRadarChart: React.FC<EventTypeRadarChartProps> = ({ data }) => {
  if (!data?.distribution || data.distribution.length === 0) return null;

  // Format data: shortens labels if they are too long (e.g., "BRUTE_FORCE_ATTEMPT" -> "BRUTE FORCE")
  const chartData = data.distribution.slice(0, 6).map(item => ({
    subject: item.event_type?.replace(/_/g, ' ').replace('ATTEMPT', '') || 'UNKNOWN',
    count: item.count,
    fullMark: data.total_events || 100,
  }));

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="mb-2">
        <h3 className="text-lg font-semibold text-gray-100">Attack Surface Vector</h3>
        <p className="text-sm text-gray-400">Distribution of log event categories</p>
      </div>

      <div className="flex-grow w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <PolarGrid stroke="#333" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#9CA3AF', fontSize: 10 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '8px' }}
              itemStyle={{ color: '#8B5CF6' }}
            />
            <Radar 
              name="Events" 
              dataKey="count" 
              stroke="#8B5CF6" 
              strokeWidth={2}
              fill="#8B5CF6" 
              fillOpacity={0.3} 
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};