import React from 'react';
import { ThreatSummaryInsightData } from '@/types/insight';
import { Target, ShieldAlert } from 'lucide-react';

interface ThreatSummaryCardProps {
  data: ThreatSummaryInsightData;
}

export const ThreatSummaryCard: React.FC<ThreatSummaryCardProps> = ({ data }) => {
  if (!data) return null;

  const isCritical = data.overall_threat_classification === 'CRITICAL';

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2 rounded-lg border ${isCritical ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <Target className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-orange-400'}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Threat Assessment</h3>
          <p className="text-sm text-gray-400">Classification: <span className={isCritical ? 'text-red-400 font-bold' : 'text-orange-400 font-bold'}>{data.overall_threat_classification}</span></p>
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-5">{data.summary_narrative}</p>

      <div className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4 flex-grow">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Immediate Concerns</h4>
        <ul className="space-y-3">
          {data.immediate_concerns.map((concern, idx) => (
            <li key={idx} className="flex items-start space-x-2 text-sm text-gray-300">
              <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>{concern}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};