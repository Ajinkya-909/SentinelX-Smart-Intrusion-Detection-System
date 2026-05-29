import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  Upload, 
  TerminalSquare, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Loader2,
  ShieldAlert
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dashboardService from "@/services/dashboard";

// --- Helper Components ---

const KpiCard = ({ title, value, subtext, icon: Icon, accentColor }: any) => (
  <div className="bg-card border border-border p-2 relative overflow-hidden flex flex-col justify-between h-32 group rounded-xl">
    <div className="p-2 m-1 border-l-primary border-l-4 h-full flex flex-col">
      
      <div className="flex justify-between items-start pl-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 rounded-lg bg-background border border-border/50`}>
          <Icon className={`w-4 h-4 ${accentColor}`} />
        </div>
      </div>
      <div className="pl-1 mt-auto">
        <h3 className="text-3xl font-bold text-foreground">{value}</h3>
        {subtext && <p className="text-xs font-medium text-muted-foreground mt-1">{subtext}</p>}
      </div>

    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: () => dashboardService.getDashboardData(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium text-sm">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mt-8">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Failed to load dashboard data. Please check your connection or try again.
        </AlertDescription>
      </Alert>
    );
  }

  const { overview, timeline, recentJobs, severityDistribution, analytics, totalLogsProcessed } = data!;

  const SEVERITY_COLORS: Record<string, string> = {
    CRITICAL: "hsl(var(--critical))",
    HIGH: "hsl(var(--high))",
    MEDIUM: "hsl(var(--medium))",
    LOW: "hsl(var(--low))",
    INFO: "hsl(var(--info))",
  };

  return (
    <div className="min-h-screen text-foreground space-y-6 pb-10">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and analyze your security logs and threat intelligence.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/jobs")}
            className="border-border hover:bg-muted text-sm font-medium h-10 rounded-lg"
          >
            <TerminalSquare className="w-4 h-4 mr-2" /> View Jobs
          </Button>
          <Button
            onClick={() => navigate("/jobs/upload")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium h-10 rounded-lg shadow-sm"
          >
            <Upload className="w-4 h-4 mr-2" /> Upload Logs
          </Button>
        </div>
      </div>

      {/* --- KPI GRID --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard 
          title="Total Analyses" 
          value={overview.totalJobs} 
          subtext="Lifetime jobs run"
          icon={Activity} 
          accentColor="text-primary" 
        />
        <KpiCard 
          title="Completed" 
          value={overview.completedJobs} 
          subtext={`${analytics.successRate}% success rate`}
          icon={CheckCircle2} 
          accentColor="text-status-online" 
        />
        <KpiCard 
          title="Failed Jobs" 
          value={overview.failedJobs} 
          subtext="Requires attention"
          icon={AlertTriangle} 
          accentColor="text-destructive" 
        />
        <KpiCard 
          title="Processing" 
          value={overview.processingJobs} 
          subtext="Active pipelines"
          icon={Clock} 
          accentColor="text-status-processing" 
        />
      </div>

      {/* --- MAIN DASHBOARD AREA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Timeline Chart */}
          <div className="bg-card border border-border p-6 rounded-xl flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Activity Timeline
                </h3>
                <p className="text-sm text-muted-foreground">Analyses run over the last 30 days</p>
              </div>
            </div>
            <div className="flex-grow w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    dy={10}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontSize: '14px', fontWeight: 500 }}
                  />
                  <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Row inside Left Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 h-[250px]">
            
            {/* System Analytics */}
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col justify-center">
               <h3 className="text-base font-semibold text-foreground mb-6">
                System Telemetry
              </h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-muted-foreground">Logs Processed</span>
                    <span className="text-foreground font-semibold">{totalLogsProcessed.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full w-[100%] rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-muted-foreground">Avg Processing Time</span>
                    <span className="text-foreground font-semibold">{analytics.averageProcessingTimeSeconds}s</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div className="bg-accent h-full w-[65%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="bg-card border border-border p-6 rounded-xl flex flex-col items-center justify-center relative">
              <h3 className="text-base font-semibold text-foreground absolute top-6 left-6">
                Threat Distribution
              </h3>
              <div className="h-[160px] w-full mt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="count"
                      stroke="none"
                    >
                      {severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.INFO} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '13px', color: 'hsl(var(--foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Action Required Banner (Conditional) */}
          {overview.failedJobs > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">Attention Required</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{overview.failedJobs} job(s) failed processing</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 border-destructive/30 text-destructive hover:bg-destructive hover:text-white" onClick={() => navigate('/jobs?status=failed')}>
                Review
              </Button>
            </div>
          )}

          {/* Recent Jobs Feed */}
          <div className="bg-card border border-border rounded-xl flex-grow flex flex-col overflow-hidden">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="text-base font-semibold text-foreground">
                Recent Activity
              </h3>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">Live</span>
            </div>
            
            <div className="flex-grow overflow-auto p-3 space-y-2 custom-scrollbar">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center mt-10">No recent activity</p>
              ) : (
                recentJobs.slice(0, 5).map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors group flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                        {job.jobName || job.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {job.fileName}
                      </p>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        job.status === 'COMPLETED' ? 'text-primary bg-primary/10' :
                        job.status === 'FAILED' ? 'text-destructive bg-destructive/10' :
                        'text-status-processing bg-status-processing/10'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-border mt-auto">
              <Button 
                variant="ghost" 
                className="w-full text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/jobs')}
              >
                View all jobs
              </Button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}