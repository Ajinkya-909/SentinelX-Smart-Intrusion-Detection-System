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
    <div className="flex flex-col h-full bg-card border border-border rounded-xl p-6 relative overflow-hidden gradient-card">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.015] via-transparent to-accent/[0.015] pointer-events-none" />

      <div className="relative flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 glow-primary">
            <Wrench className="w-5 h-5 text-primary" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-foreground">
              AI Remediation
            </h3>

            <p className="text-sm text-muted-foreground">
              Action {currentIndex + 1} of {data.recommendations.length}
            </p>
          </div>
        </div>

        {/* Carousel Controls */}
        <div className="flex space-x-2">
          <button
            onClick={handlePrev}
            className="p-1.5 bg-secondary hover:bg-muted border border-border rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:border-primary/20"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            className="p-1.5 bg-secondary hover:bg-muted border border-border rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground hover:border-primary/20"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative flex-grow flex flex-col justify-between bg-secondary/60 border border-border rounded-lg p-5 backdrop-blur-sm">
        <div>
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-md font-bold text-foreground">
              {currentRec.title}
            </h4>

            <span
              className={`text-xs font-bold px-2 py-1 rounded shrink-0 ml-3 border ${
                currentRec.priority === 'CRITICAL'
                  ? 'bg-critical/10 text-critical border-critical/20'
                  : 'bg-high/10 text-high border-high/20'
              }`}
            >
              {currentRec.priority}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            {currentRec.description}
          </p>

          <div className="bg-background/80 rounded-md p-4 border border-border/60 mb-4">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Action Steps
            </h5>

            <ul className="space-y-3">
              {currentRec.actions.map((action, actionIdx) => (
                <li
                  key={actionIdx}
                  className="flex items-start space-x-3 text-sm text-foreground/90"
                >
                  <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />

                  <span className="leading-snug">
                    {action}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start space-x-2 pt-3 border-t border-border/60">
          <CheckCircle2 className="w-4 h-4 text-low shrink-0 mt-0.5" />

          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">
              Impact:
            </span>{' '}
            {currentRec.impact}
          </p>
        </div>
      </div>
    </div>
  );
};