import React from 'react';
import { OverviewInsightData } from '@/types/insight';
import { ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

interface ExecutiveSummaryCardProps {
  data: OverviewInsightData;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({ data }) => {
  if (!data) return null;

  const isCritical = data.threat_level === 'CRITICAL' || data.threat_level === 'HIGH';

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
      {/* Subtle background glow based on threat level */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none ${isCritical ? 'bg-red-500' : 'bg-blue-500'}`} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-lg font-semibold text-gray-100">Executive Summary</h3>
        
        {/* Threat Level Badge */}
        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border ${isCritical ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'}`}>
          {isCritical ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          <span className="text-xs font-bold tracking-wider">{data.threat_level}</span>
        </div>
      </div>

      <div className="flex-grow relative z-10">
        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          {data.summary}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-gray-800/50">
            <div className="flex items-center space-x-3 text-gray-400">
              <ShieldAlert className="w-4 h-4 text-orange-400" />
              <span className="text-sm">Total Threats Detected</span>
            </div>
            <span className="font-mono font-bold text-gray-200">{data.total_threats}</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-gray-800/50">
            <div className="flex items-center space-x-3 text-gray-400">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span className="text-sm">Affected Systems</span>
            </div>
            <span className="font-mono font-bold text-gray-200">{data.affected_systems}</span>
          </div>
        </div>
      </div>
    </div>
  );
};