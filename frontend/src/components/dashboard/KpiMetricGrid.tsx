import React from 'react';
import { Activity, AlertTriangle, Crosshair, ShieldAlert, Zap } from 'lucide-react';
import { KPIInsightData } from '@/types/insight'; // Adjust path as needed

interface KpiMetricGridProps {
  data: KPIInsightData;
}

const getSeverityStyles = (severity?: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'text-red-500 shadow-red-500/20';
    case 'HIGH': return 'text-orange-500 shadow-orange-500/20';
    case 'MEDIUM': return 'text-yellow-500 shadow-yellow-500/20';
    default: return 'text-blue-400 shadow-blue-500/20';
  }
};

const getIcon = (label: string, severity?: string) => {
  if (severity === 'CRITICAL' || label.includes('Alert')) return <AlertTriangle className="w-5 h-5" />;
  if (label.includes('Threat')) return <ShieldAlert className="w-5 h-5" />;
  if (label.includes('Source') || label.includes('IP')) return <Crosshair className="w-5 h-5" />;
  if (label.includes('Event')) return <Activity className="w-5 h-5" />;
  return <Zap className="w-5 h-5" />;
};

export const KpiMetricGrid: React.FC<KpiMetricGridProps> = ({ data }) => {
  if (!data?.metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
      {data.metrics.map((metric, idx) => {
        const severityClass = getSeverityStyles(metric.severity);
        
        return (
          <div 
            key={idx} 
            className="flex flex-col p-4 rounded-xl bg-[#121212] border border-gray-800 hover:border-gray-700 transition-colors shadow-lg"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-400 tracking-wide">{metric.label}</span>
              <div className={`${severityClass} opacity-80`}>
                {getIcon(metric.label, metric.severity)}
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <h2 className={`text-3xl font-bold ${severityClass} drop-shadow-md`}>
                {metric.value.toLocaleString()}
              </h2>
            </div>
          </div>
        );
      })}
    </div>
  );
};