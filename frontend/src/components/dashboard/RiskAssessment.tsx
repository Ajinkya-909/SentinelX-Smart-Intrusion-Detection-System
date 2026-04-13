import type { Alert } from '@/services/mockApi';

const riskColors: Record<string, string> = {
  Critical: 'bg-critical/20 text-critical border-critical/30',
  High: 'bg-high/20 text-high border-high/30',
  Medium: 'bg-medium/20 text-medium border-medium/30',
  Low: 'bg-low/20 text-low border-low/30',
};

export default function RiskAssessment({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-4">Risk Assessment</h3>
      <div className="space-y-3">
        {alerts.slice(0, 3).map((a) => (
          <div key={a.id} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-16">{a.timestamp}</span>
            <span className="text-foreground font-medium">{a.category}</span>
            <span className={`px-2 py-0.5 rounded text-xs border ${riskColors[a.risk_level]}`}>▲ {a.risk_level}</span>
            <span className="ml-auto font-medium text-foreground">{a.risk_score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
