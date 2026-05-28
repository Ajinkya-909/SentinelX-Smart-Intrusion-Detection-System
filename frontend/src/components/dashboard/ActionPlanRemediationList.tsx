import React from 'react';
import { RecommendationInsightData } from '@/types/insight';
import { CheckCircle2, Wrench, ArrowRight } from 'lucide-react';

interface ActionPlanRemediationListProps {
  data: RecommendationInsightData;
}

export const ActionPlanRemediationList: React.FC<ActionPlanRemediationListProps> = ({ data }) => {
  if (!data?.recommendations || data.recommendations.length === 0) return null;

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-[#FFB000]/10 rounded-lg border border-[#FFB000]/20">
          <Wrench className="w-5 h-5 text-[#FFB000]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-100">AI Remediation Plan</h3>
          <p className="text-sm text-gray-400">Prioritized defensive actions</p>
        </div>
      </div>

      <div className="space-y-4">
        {data.recommendations.map((rec, idx) => (
          <div key={idx} className="bg-[#1A1A1A] border border-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-md font-bold text-gray-200">{rec.title}</h4>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                rec.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
              }`}>
                {rec.priority} PRIORITY
              </span>
            </div>
            
            <p className="text-sm text-gray-400 mb-4">{rec.description}</p>
            
            <div className="bg-[#050505] rounded-md p-3 border border-gray-800/50">
              <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Action Steps</h5>
              <ul className="space-y-2">
                {rec.actions.map((action, actionIdx) => (
                  <li key={actionIdx} className="flex items-start space-x-2 text-sm text-gray-300">
                    <ArrowRight className="w-4 h-4 text-[#FFB000] mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400"><span className="text-gray-300 font-medium">Impact:</span> {rec.impact}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};