import React from 'react';
import {
  Activity,
  AlertTriangle,
  Crosshair,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { KPIInsightData } from '@/types/insight';

interface KpiMetricGridProps {
  data: KPIInsightData;
}

const getSeverityStyles = (severity?: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return {
        text: 'text-critical',
        border: 'bg-critical',
        icon: 'text-critical',
        subtle: 'bg-critical/5',
      };

    case 'HIGH':
      return {
        text: 'text-high',
        border: 'bg-high',
        icon: 'text-high',
        subtle: 'bg-high/5',
      };

    case 'MEDIUM':
      return {
        text: 'text-medium',
        border: 'bg-medium',
        icon: 'text-medium',
        subtle: 'bg-medium/5',
      };

    default:
      return {
        text: 'text-primary',
        border: 'bg-primary',
        icon: 'text-primary',
        subtle: 'bg-primary/5',
      };
  }
};

const getIcon = (label: string, severity?: string) => {
  if (severity === 'CRITICAL' || label.includes('Alert')) {
    return <AlertTriangle className="w-4 h-4" />;
  }

  if (label.includes('Threat')) {
    return <ShieldAlert className="w-4 h-4" />;
  }

  if (label.includes('Source') || label.includes('IP')) {
    return <Crosshair className="w-4 h-4" />;
  }

  if (label.includes('Event')) {
    return <Activity className="w-4 h-4" />;
  }

  return <Zap className="w-4 h-4" />;
};

export const KpiMetricGrid: React.FC<KpiMetricGridProps> = ({ data }) => {
  if (!data?.metrics) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
      {data.metrics.map((metric, idx) => {
        const severityStyles = getSeverityStyles(metric.severity);

        return (
          <div
            key={idx}
            className={`
              relative overflow-hidden
              flex flex-col justify-between
              min-h-[120px]
              px-5 py-4
              rounded-lg
              bg-card
              border border-border
              gradient-card
              transition-all duration-200
              hover:border-primary/20
              hover:translate-y-[-1px]
            `}
          >
            {/* Left Accent Line */}
            <div
              className={`
                absolute left-2 top-3 bottom-3
                w-[2px] rounded-full
                ${severityStyles.border}
              `}
            />

            {/* Subtle Background Glow */}
            <div
              className={`
                absolute inset-0 opacity-[0.03]
                ${severityStyles.subtle}
                pointer-events-none
              `}
            />

            <div className="relative flex justify-between items-start">
              <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium leading-relaxed">
                {metric.label}
              </span>

              <div className={`${severityStyles.icon} opacity-70`}>
                {getIcon(metric.label, metric.severity)}
              </div>
            </div>

            <div className="relative mt-5">
              <h2
                className={`
                  text-3xl font-bold tracking-tight
                  ${severityStyles.text}
                `}
              >
                {metric.value.toLocaleString()}
              </h2>
            </div>
          </div>
        );
      })}
    </div>
  );
};