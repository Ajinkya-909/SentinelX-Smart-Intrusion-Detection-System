import type { Alert } from '@/services/mockApi';

const riskColors: Record<string, string> = {
  Critical: 'bg-critical text-destructive-foreground',
  High: 'bg-high text-primary-foreground',
  Medium: 'bg-medium text-primary-foreground',
  Low: 'bg-low text-primary-foreground',
};

export default function RecentAlerts({ alerts }: { alerts: Alert[] }) {
  const counts = { Critical: 1, High: 2, Medium: 3, Low: 1 };

  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recent Alerts</h3>
        <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">[See All] →</span>
      </div>
      <div className="flex items-center gap-3 mb-4 p-3 bg-secondary rounded-lg">
        <span className="text-sm text-muted-foreground">Total Alerts today</span>
        <span className="text-sm font-medium text-foreground ml-auto">5</span>
      </div>
      <div className="flex gap-2">
        {Object.entries(counts).map(([level, count]) => (
          <div key={level} className={`flex-1 text-center py-2 rounded-lg text-sm font-medium ${riskColors[level]}`}>
            <div className="text-lg font-bold">{count}</div>
            <div className="text-xs opacity-80">{level}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
