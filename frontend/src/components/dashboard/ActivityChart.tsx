import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { time: string; logs: number; alerts: number }[];
}

export default function ActivityChart({ data }: Props) {
  const [range, setRange] = useState('24h');

  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Suspicious Activities</h3>
          <p className="text-xs text-muted-foreground">over past 24 hours</p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground mr-2">Showing the past</span>
          {['24h', '7d', '30d'].map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-2.5 py-1 rounded-md ${range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="logsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(40, 90%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(40, 90%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(30, 5%, 22%)" />
            <XAxis dataKey="time" stroke="hsl(30, 10%, 55%)" fontSize={11} />
            <YAxis stroke="hsl(30, 10%, 55%)" fontSize={11} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(30, 6%, 13%)', border: '1px solid hsl(30, 5%, 22%)', borderRadius: '8px', color: 'hsl(40, 20%, 90%)' }} />
            <Area type="monotone" dataKey="logs" stroke="hsl(40, 90%, 50%)" fill="url(#logsGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="alerts" stroke="hsl(25, 95%, 53%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block rounded" /> Logs</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> Alerts</span>
      </div>
    </div>
  );
}
