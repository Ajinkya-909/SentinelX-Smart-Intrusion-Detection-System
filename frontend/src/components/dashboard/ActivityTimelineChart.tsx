import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TimelineInsightData } from '@/types/insight';
import { format, parseISO } from 'date-fns'; // Recommended for clean date parsing

interface ActivityTimelineChartProps {
  data: TimelineInsightData;
}

export const ActivityTimelineChart: React.FC<ActivityTimelineChartProps> = ({ data }) => {
  if (!data?.points) return null;

  // Format data for Recharts
  const chartData = data.points.map(point => ({
    time: format(parseISO(point.timestamp), 'HH:mm'),
    events: point.event_count || 0,
    fullDate: point.timestamp
  }));

  return (
    <div className="flex flex-col w-full h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">System Activity Timeline</h3>
          <p className="text-sm text-gray-400">Log event volume mapped over the analysis window</p>
        </div>
        <div className="bg-[#1E1E1E] px-3 py-1 rounded-md border border-gray-800">
          <span className="text-xs font-mono text-blue-400">Total: {data.total_events}</span>
        </div>
      </div>

      <div className="h-[250px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '8px' }}
              itemStyle={{ color: '#60A5FA' }}
              labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="events" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorEvents)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};