import { ReactNode, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [timeRange, setTimeRange] = useState('24h');
  const ranges = ['24h', '7d', '30d', 'Custom'];

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-64">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Overview</h1>
          <div className="flex items-center gap-4">
            <div className="flex bg-secondary rounded-lg p-1">
              {ranges.map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    timeRange === r ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="w-9 h-9 rounded-full gradient-amber flex items-center justify-center cursor-pointer">
              <span className="text-sm font-bold text-primary-foreground">A</span>
            </div>
          </div>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
