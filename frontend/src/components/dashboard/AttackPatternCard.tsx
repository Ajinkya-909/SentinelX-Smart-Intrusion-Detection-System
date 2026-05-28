import React from 'react';
import { AttackPatternInsightData } from '@/types/insight';
import { Network, ArrowDown } from 'lucide-react';

interface AttackPatternCardProps {
  data: AttackPatternInsightData;
}

export const AttackPatternCard: React.FC<AttackPatternCardProps> = ({ data }) => {
  if (!data) return null;

  return (
    // Note the h-[400px] to match chart heights exactly
    <div className="flex flex-col h-[400px] bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
      <div className="flex items-center space-x-3 mb-4 shrink-0">
        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Network className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">Attack Pattern</h3>
          <p className="text-sm text-gray-400">{data.pattern_type}</p>
        </div>
      </div>

      {/* The scrolling container */}
      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-sm text-gray-300 mb-6">{data.description}</p>

        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Execution Flow</h4>
            <div className="space-y-1">
              {data.attack_flow.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="bg-[#1A1A1A] border border-gray-800 p-3 rounded-md">
                    <span className="text-sm text-gray-300"><span className="text-purple-500 font-mono mr-2">0{idx + 1}</span> {step}</span>
                  </div>
                  {idx < data.attack_flow.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg">
            <h4 className="text-xs font-semibold text-red-500/70 uppercase tracking-wider mb-2">Likely Objectives</h4>
            <div className="flex flex-wrap gap-2">
              {data.likely_goals.map((goal, idx) => (
                <span key={idx} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-medium">
                  {goal}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};