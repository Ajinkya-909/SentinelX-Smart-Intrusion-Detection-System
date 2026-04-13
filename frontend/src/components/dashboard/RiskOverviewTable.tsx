import type { Alert } from '@/services/mockApi';
import { Shield, Globe, Database, Lock, CreditCard } from 'lucide-react';

const catIcons: Record<string, typeof Shield> = { AUTH: Lock, API: Globe, DB: Database, SYSTEM: Shield, Payments: CreditCard };
const riskColors: Record<string, string> = {
  Critical: 'bg-critical/20 text-critical',
  High: 'bg-high/20 text-high',
  Medium: 'bg-medium/20 text-medium',
  Low: 'bg-low/20 text-low',
};

export default function RiskOverviewTable({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-4">Risk Overview</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs border-b border-border">
              <th className="text-left py-2 font-medium">Time</th>
              <th className="text-left py-2 font-medium">Category</th>
              <th className="text-left py-2 font-medium">Actor</th>
              <th className="text-left py-2 font-medium">Description</th>
              <th className="text-left py-2 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => {
              const Icon = catIcons[a.category] || Shield;
              return (
                <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-2.5 text-muted-foreground">{a.timestamp}</td>
                  <td className="py-2.5"><span className="flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-muted-foreground" />{a.category}</span></td>
                  <td className="py-2.5 text-foreground">{a.actor}</td>
                  <td className="py-2.5 text-muted-foreground text-xs max-w-[140px] truncate">{a.description}</td>
                  <td className="py-2.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${riskColors[a.risk_level]}`}>{a.risk_level}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="text-xs text-primary hover:underline mt-3">View All →</button>
    </div>
  );
}
