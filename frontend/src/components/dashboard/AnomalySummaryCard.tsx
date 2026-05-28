import React from 'react';
import { AnomalySummaryInsightData } from '@/types/insight';
import { ActivitySquare, ShieldAlert } from 'lucide-react';

interface AnomalySummaryCardProps {
  data: AnomalySummaryInsightData;
}

export const AnomalySummaryCard: React.FC<AnomalySummaryCardProps> = ({ data }) => {
  if (!data) return null;

  const isCritical = data.severity === 'CRITICAL';

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-4">
        <div className={`p-2 rounded-lg border ${isCritical ? 'bg-red-500/10 border-red-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <ActivitySquare className={`w-5 h-5 ${isCritical ? 'text-red-400' : 'text-orange-400'}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Behavioral Anomaly</h3>
          <p className="text-sm text-gray-400">{data.anomaly_type}</p>
        </div>
      </div>

      <div className="flex-grow space-y-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          {data.description}
        </p>

        <div className="bg-[#1A1A1A] border border-gray-800 p-3 rounded-lg">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Deviation from Baseline</h4>
          <p className="text-sm text-red-400/90 italic">
            "{data.deviation_from_baseline}"
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommended Immediate Action</h4>
          <div className="flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-300">{data.recommended_action}</p>
          </div>
        </div>
      </div>
    </div>
  );
};