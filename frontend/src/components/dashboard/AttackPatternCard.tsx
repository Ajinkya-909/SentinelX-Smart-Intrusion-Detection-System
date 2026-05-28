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
    <div className="flex flex-col h-[400px] bg-card border border-border rounded-xl p-6 gradient-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] via-transparent to-primary/[0.01] pointer-events-none" />

      <div className="relative flex items-center space-x-3 mb-4 shrink-0">
        <div className="p-2 bg-accent/10 rounded-lg border border-accent/20 glow-info">
          <Network className="w-5 h-5 text-accent" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Attack Pattern
          </h3>

          <p className="text-sm text-muted-foreground">
            {data.pattern_type}
          </p>
        </div>
      </div>

      {/* The scrolling container */}
      <div className="relative flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-sm text-foreground/85 mb-6 leading-relaxed">
          {data.description}
        </p>

        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Execution Flow
            </h4>

            <div className="space-y-1">
              {data.attack_flow.map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="bg-secondary/70 border border-border p-3 rounded-md backdrop-blur-sm hover:border-accent/20 transition-colors duration-200">
                    <span className="text-sm text-foreground/85 leading-relaxed">
                      <span className="text-accent font-mono mr-2">
                        0{idx + 1}
                      </span>

                      {step}
                    </span>
                  </div>

                  {idx < data.attack_flow.length - 1 && (
                    <div className="flex justify-center">
                      <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="bg-critical/5 border border-critical/10 p-4 rounded-lg">
            <h4 className="text-xs font-semibold text-critical/70 uppercase tracking-wider mb-2">
              Likely Objectives
            </h4>

            <div className="flex flex-wrap gap-2">
              {data.likely_goals.map((goal, idx) => (
                <span
                  key={idx}
                  className="bg-critical/10 text-critical border border-critical/20 px-2 py-1 rounded text-xs font-medium"
                >
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