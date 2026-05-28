import React from 'react';
import { AlertInsightData } from '@/types/insight';
import { ShieldAlert, ChevronRight, Siren } from 'lucide-react';

interface SecurityAlertFeedProps {
  data: AlertInsightData;
}

export const SecurityAlertFeed: React.FC<SecurityAlertFeedProps> = ({ data }) => {
  if (!data?.alerts || data.alerts.length === 0) return null;

  return (
    <div className="flex flex-col h-[350px] bg-card border border-border rounded-xl p-5 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-critical/[0.015] via-transparent to-primary/[0.01] pointer-events-none" />

      <div className="relative flex justify-between items-center mb-4 pb-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <Siren className="w-5 h-5 text-critical animate-pulse" />

          <h3 className="text-lg font-semibold text-foreground">
            Live Alert Feed
          </h3>
        </div>

        <span className="text-xs bg-secondary/80 text-foreground px-2 py-1 rounded-full border border-border font-medium backdrop-blur-sm">
          {data.alert_count} Alerts
        </span>
      </div>

      {/* Custom Scrollbar Area */}
      <div className="relative flex-grow overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {data.alerts.map((alert, idx) => {
          const isCritical = alert.severity === 'CRITICAL';

          return (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all duration-200 group cursor-pointer backdrop-blur-sm ${
                isCritical
                  ? 'bg-critical/5 border-critical/25 hover:bg-critical/10 hover:border-critical/40'
                  : 'bg-secondary/70 border-border hover:border-high/20 hover:bg-secondary'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                  {isCritical && (
                    <ShieldAlert className="w-4 h-4 text-critical shrink-0" />
                  )}

                  <h4
                    className={`text-sm font-bold ${
                      isCritical
                        ? 'text-critical'
                        : 'text-high'
                    }`}
                  >
                    {alert.title}
                  </h4>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {alert.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};