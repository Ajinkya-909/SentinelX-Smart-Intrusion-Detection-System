import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { getAlerts, type Alert } from '@/services/mockApi';

const riskColors: Record<string, string> = {
  Critical: 'bg-critical/20 text-critical border-critical/30',
  High: 'bg-high/20 text-high border-high/30',
  Medium: 'bg-medium/20 text-medium border-medium/30',
  Low: 'bg-low/20 text-low border-low/30',
};

export default function Alerts() {
  const alerts = getAlerts();
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<Alert | null>(null);

  const filtered = filter === 'All' ? alerts : alerts.filter((a) => a.risk_level === filter);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
          <p className="text-sm text-muted-foreground mt-1">Security alerts and notifications</p>
        </div>

        <div className="flex gap-2">
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {filtered.map((a) => (
              <div key={a.id} onClick={() => setSelected(a)} className={`gradient-card border rounded-xl p-4 cursor-pointer transition-all hover:glow-amber ${selected?.id === a.id ? 'border-primary' : 'border-border'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded text-xs font-medium border ${riskColors[a.risk_level]}`}>{a.risk_level}</span>
                    <span className="text-sm font-medium text-foreground">{a.category}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{a.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Actor: {a.actor}</span>
                  <span>Score: {a.risk_score}</span>
                  <span className={a.resolved ? 'text-low' : 'text-critical'}>{a.resolved ? 'Resolved' : 'Active'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="gradient-card border border-border rounded-xl p-5 h-fit sticky top-24">
            <h3 className="font-semibold text-foreground mb-4">Alert Details</h3>
            {selected ? (
              <div className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Category:</span> <span className="text-foreground ml-2">{selected.category}</span></div>
                <div><span className="text-muted-foreground">Actor:</span> <span className="text-foreground ml-2">{selected.actor}</span></div>
                <div><span className="text-muted-foreground">Description:</span> <p className="text-foreground mt-1">{selected.description}</p></div>
                <div><span className="text-muted-foreground">Risk Score:</span> <span className="text-foreground ml-2 font-bold">{selected.risk_score}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className={`ml-2 ${selected.resolved ? 'text-low' : 'text-critical'}`}>{selected.resolved ? 'Resolved' : 'Active'}</span></div>
                <div className="pt-3 border-t border-border">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${riskColors[selected.risk_level]}`}>{selected.risk_level}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select an alert to view details</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
