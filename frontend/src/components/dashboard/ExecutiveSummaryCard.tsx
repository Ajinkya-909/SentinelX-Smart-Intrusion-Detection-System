import React from 'react';
import { OverviewInsightData } from '@/types/insight';
import { ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

interface ExecutiveSummaryCardProps {
  data: OverviewInsightData;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({ data }) => {
  if (!data) return null;

  const isCritical =
    data.threat_level === 'CRITICAL' ||
    data.threat_level === 'HIGH';

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl p-6 gradient-card relative overflow-hidden">
      {/* Subtle background glow based on threat level */}
      <div
        className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-10 rounded-full pointer-events-none ${
          isCritical
            ? 'bg-critical'
            : 'bg-primary'
        }`}
      />

      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-accent/[0.015] pointer-events-none" />

      <div className="relative z-10 flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Executive Summary
        </h3>

        {/* Threat Level Badge */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border ${
            isCritical
              ? 'bg-critical/10 border-critical/30 text-critical'
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}
        >
          {isCritical ? (
            <ShieldAlert className="w-4 h-4" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}

          <span className="text-xs font-bold tracking-wider">
            {data.threat_level}
          </span>
        </div>
      </div>

      <div className="flex-grow relative z-10">
        <p className="text-sm text-foreground/85 leading-relaxed mb-6">
          {data.summary}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/70 rounded-lg border border-border/60 backdrop-blur-sm">
            <div className="flex items-center space-x-3 text-muted-foreground">
              <ShieldAlert className="w-4 h-4 text-high" />

              <span className="text-sm">
                Total Threats Detected
              </span>
            </div>

            <span className="font-mono font-bold text-foreground">
              {data.total_threats}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-secondary/70 rounded-lg border border-border/60 backdrop-blur-sm">
            <div className="flex items-center space-x-3 text-muted-foreground">
              <Cpu className="w-4 h-4 text-accent" />

              <span className="text-sm">
                Affected Systems
              </span>
            </div>

            <span className="font-mono font-bold text-foreground">
              {data.affected_systems}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};