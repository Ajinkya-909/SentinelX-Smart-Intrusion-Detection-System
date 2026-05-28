import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
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
    fullDate: point.timestamp
  }));

  const getBarColor = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return '#EF4444'; // Red
      case 'HIGH': return '#F97316';     // Orange
      case 'MEDIUM': return '#EAB308';   // Yellow
      default: return '#3B82F6';         // Blue
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Threat Detection Spikes</h3>
          <p className="text-sm text-gray-400">Chronological mapping of triggered security events</p>
        </div>
        <div className="bg-red-500/10 px-3 py-1 rounded-md border border-red-500/30">
          <span className="text-xs font-mono font-bold text-red-400">Total Threats: {data.total_threats}</span>
        </div>
      </div>

      <div className="h-[250px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              cursor={{ fill: '#1A1A1A' }}
              contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '8px' }}
              itemStyle={{ color: '#F87171' }}
              labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
            />
            <Bar dataKey="threats" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.severity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};