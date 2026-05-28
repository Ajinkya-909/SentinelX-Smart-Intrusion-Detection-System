import React, { useState } from 'react';
import { RecommendationInsightData } from '@/types/insight';
import { CheckCircle2, Wrench, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface ActionPlanRemediationListProps {
  data: RecommendationInsightData;
}

export const ActionPlanRemediationList: React.FC<ActionPlanRemediationListProps> = ({ data }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!data?.recommendations || data.recommendations.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % data.recommendations.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + data.recommendations.length) % data.recommendations.length);
  };

  const currentRec = data.recommendations[currentIndex];

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-gray-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#FFB000]/10 rounded-lg border border-[#FFB000]/20">
            <Wrench className="w-5 h-5 text-[#FFB000]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-100">AI Remediation</h3>
            <p className="text-sm text-gray-400">Action {currentIndex + 1} of {data.recommendations.length}</p>
          </div>
        </div>
        
        {/* Carousel Controls */}
        <div className="flex space-x-2">
          <button onClick={handlePrev} className="p-1.5 bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 rounded-md transition-colors text-gray-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleNext} className="p-1.5 bg-[#1A1A1A] hover:bg-gray-800 border border-gray-800 rounded-md transition-colors text-gray-400 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-between bg-[#1A1A1A] border border-gray-800 rounded-lg p-5">
        <div>
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-md font-bold text-gray-200">{currentRec.title}</h4>
            <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ml-3 ${
              currentRec.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
            }`}>
              {currentRec.priority}
            </span>
          </div>
          
          <p className="text-sm text-gray-400 mb-5">{currentRec.description}</p>
          
          <div className="bg-[#050505] rounded-md p-4 border border-gray-800/50 mb-4">
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Action Steps</h5>
            <ul className="space-y-3">
              {currentRec.actions.map((action, actionIdx) => (
                <li key={actionIdx} className="flex items-start space-x-3 text-sm text-gray-300">
                  <ArrowRight className="w-4 h-4 text-[#FFB000] mt-0.5 shrink-0" />
                  <span className="leading-snug">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start space-x-2 pt-3 border-t border-gray-800/50">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400"><span className="text-gray-300 font-medium">Impact:</span> {currentRec.impact}</p>
        </div>
      </div>
    </div>
  );
};