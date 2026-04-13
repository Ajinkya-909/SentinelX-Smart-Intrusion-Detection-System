import DashboardLayout from '@/layouts/DashboardLayout';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Generate and view security reports</p>
        </div>
        <div className="gradient-card border border-border rounded-xl p-16 flex flex-col items-center gap-4">
          <BarChart3 className="w-16 h-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">Reports Coming Soon</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">Automated security reports with PDF export, scheduled delivery, and compliance templates will be available in V2.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
