import React from 'react';
import { ThreatSummaryInsightData } from '@/types/insight';
import { Target, ShieldAlert } from 'lucide-react';

interface ThreatSummaryCardProps {
  data: ThreatSummaryInsightData;
}

export const ThreatSummaryCard: React.FC<ThreatSummaryCardProps> = ({ data }) => {
  if (!data) return null;

  const isCritical =
    data.overall_threat_classification === 'CRITICAL';

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl p-6 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-critical/[0.015] via-transparent to-primary/[0.01] pointer-events-none" />

      <div className="relative flex items-center space-x-3 mb-4">
        <div
          className={`p-2 rounded-lg border ${
            isCritical
              ? 'bg-critical/10 border-critical/20 glow-danger'
              : 'bg-high/10 border-high/20'
          }`}
        >
          <Target
            className={`w-5 h-5 ${
              isCritical
                ? 'text-critical'
                : 'text-high'
            }`}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Threat Assessment
          </h3>

          <p className="text-sm text-muted-foreground">
            Classification:{' '}
            <span
              className={`font-bold ${
                isCritical
                  ? 'text-critical'
                  : 'text-high'
              }`}
            >
              {data.overall_threat_classification}
            </span>
          </p>
        </div>
      </div>

      <p className="relative text-sm text-foreground/85 mb-5 leading-relaxed">
        {data.summary_narrative}
      </p>

      <div className="relative bg-secondary/70 border border-border rounded-lg p-4 flex-grow backdrop-blur-sm">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Immediate Concerns
        </h4>

        <ul className="space-y-3">
          {data.immediate_concerns.map((concern, idx) => (
            <li
              key={idx}
              className="flex items-start space-x-2 text-sm text-foreground/85 leading-relaxed"
            >
              <ShieldAlert
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isCritical
                    ? 'text-critical'
                    : 'text-high'
                }`}
              />

              <span>{concern}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};