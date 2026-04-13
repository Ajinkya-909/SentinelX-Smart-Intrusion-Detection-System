interface Props {
  data: { level: string; count: number; color: string }[];
}

export default function RiskBars({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="gradient-card border border-border rounded-xl p-5">
      <h3 className="font-semibold text-foreground mb-4">Risk Overview</h3>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.level} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">{d.level}</span>
            <div className="flex-1 h-6 bg-secondary rounded-md overflow-hidden">
              <div className="h-full rounded-md transition-all" style={{ width: `${(d.count / max) * 100}%`, backgroundColor: d.color }} />
            </div>
            <span className="text-sm font-medium text-foreground w-8 text-right">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
