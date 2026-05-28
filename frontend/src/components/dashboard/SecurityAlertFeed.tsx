import React from 'react';
import { AlertInsightData } from '@/types/insight';
import { ShieldAlert, ChevronRight, Siren } from 'lucide-react';

interface SecurityAlertFeedProps {
  data: AlertInsightData;
}

export const SecurityAlertFeed: React.FC<SecurityAlertFeedProps> = ({ data }) => {
  if (!data?.alerts || data.alerts.length === 0) return null;

  return (
    <div className="flex flex-col h-[350px] bg-[#121212] border border-gray-800 rounded-xl p-5 shadow-lg">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Siren className="w-5 h-5 text-red-500 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-100">Live Alert Feed</h3>
        </div>
        <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded-full">{data.alert_count} Alerts</span>
      </div>

      {/* Custom Scrollbar Area */}
      <div className="flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {data.alerts.map((alert, idx) => {
          const isCritical = alert.severity === 'CRITICAL';
          
          return (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border ${
                isCritical 
                  ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10' 
                  : 'bg-[#1A1A1A] border-gray-800 hover:border-gray-700'
              } transition-colors group cursor-pointer`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                  {isCritical && <ShieldAlert className="w-4 h-4 text-red-500" />}
                  <h4 className={`text-sm font-bold ${isCritical ? 'text-red-400' : 'text-orange-400'}`}>
                    {alert.title}
                  </h4>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors" />
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mt-1">{alert.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};