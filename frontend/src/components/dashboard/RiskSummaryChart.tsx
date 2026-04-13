import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Props {
  data: { name: string; value: number; color: string }[];
}

export default function RiskSummaryChart({ data }: Props) {
  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Risk Level Summary</h3>
        <span className="text-xs text-muted-foreground">Vulnerability assessment scores</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">27</span>
          </div>
        </div>
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground">{d.name}</span>
              <span className="text-foreground font-medium ml-auto">{d.value}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
        {['API', 'Database', 'Auth 16%', 'System 15%'].map((s) => (
          <span key={s} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" />{s}</span>
        ))}
      </div>
    </div>
  );
}
