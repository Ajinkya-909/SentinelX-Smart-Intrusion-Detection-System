import { FileText, AlertTriangle, Activity, ShieldAlert, TrendingUp } from 'lucide-react';
import type { DashboardData } from '@/services/mockApi';

const cards = [
  { key: 'totalLogs', label: 'Total Logs Processed', icon: FileText, trend: 'totalLogsTrend', suffix: 'today' },
  { key: 'alertsGenerated', label: 'Alerts Generated', icon: AlertTriangle, trend: 'alertsTrend', suffix: 'today' },
  { key: 'avgRiskScore', label: 'Average Risk Score', icon: Activity, trend: 'avgRiskTrend', suffix: '' },
  { key: 'criticalEvents', label: 'Critical Events', icon: ShieldAlert, trend: 'criticalTrend', suffix: 'today' },
] as const;

export default function StatsCards({ data }: { data: DashboardData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.key} className="gradient-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{c.label}</span>
            <c.icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-foreground">{data[c.key].toLocaleString()}</span>
            <span className="flex items-center text-xs text-low mb-1">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {data[c.trend]} {c.suffix}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Feb 26 — Feb 27</p>
        </div>
      ))}
    </div>
  );
}
