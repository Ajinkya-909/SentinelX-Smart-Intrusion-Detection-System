import { useMemo } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { getDashboardData } from '@/services/mockApi';
import StatsCards from '@/components/dashboard/StatsCards';
import ActivityChart from '@/components/dashboard/ActivityChart';
import RiskSummaryChart from '@/components/dashboard/RiskSummaryChart';
import LogSourceChart from '@/components/dashboard/LogSourceChart';
import RecentAlerts from '@/components/dashboard/RecentAlerts';
import RiskOverviewTable from '@/components/dashboard/RiskOverviewTable';
import RiskBars from '@/components/dashboard/RiskBars';
import RiskAssessment from '@/components/dashboard/RiskAssessment';

export default function Dashboard() {
  const data = useMemo(() => getDashboardData(), []);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <StatsCards data={data} />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <ActivityChart data={data.activityData} />
          </div>
          <RiskSummaryChart data={data.riskSummary} />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <RecentAlerts alerts={data.recentAlerts} />
          <RiskOverviewTable alerts={data.recentAlerts} />
          <div className="space-y-6">
            <LogSourceChart data={data.logSources} />
            <RiskAssessment alerts={data.recentAlerts} />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <RiskBars data={data.riskOverview} />
        </div>
      </div>
    </DashboardLayout>
  );
}
