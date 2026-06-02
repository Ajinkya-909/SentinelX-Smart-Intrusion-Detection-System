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
    <div className="flex flex-col h-[380px] bg-card border border-border rounded-xl p-5 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-accent/[0.015] pointer-events-none" />

      <div className="relative flex items-center space-x-3 mb-4">
        <div
          className={`p-2 rounded-lg border ${
            isCritical
              ? 'bg-critical/10 border-critical/20 glow-danger'
              : 'bg-high/10 border-high/20'
          }`}
        >
          <ActivitySquare
            className={`w-5 h-5 ${
              isCritical
                ? 'text-critical'
                : 'text-high'
            }`}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Behavioral Anomaly
          </h3>

          <p className="text-sm text-muted-foreground">
            {data.anomaly_type}
          </p>
        </div>
      </div>

      {/* The scrolling container */}
      <div className="relative flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
        <p className="text-sm text-foreground/85 leading-relaxed">
          {data.description}
        </p>

        <div className="bg-secondary/70 border border-border p-3 rounded-lg backdrop-blur-sm">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Deviation from Baseline
          </h4>

          <p
            className={`text-sm italic leading-relaxed ${
              isCritical
                ? 'text-critical/90'
                : 'text-high/90'
            }`}
          >
            "{data.deviation_from_baseline}"
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recommended Immediate Action
          </h4>

          <div className="flex items-start space-x-2">
            <ShieldAlert
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                isCritical
                  ? 'text-critical'
                  : 'text-high'
              }`}
            />

            <p className="text-sm text-foreground/85 leading-relaxed">
              {data.recommended_action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};