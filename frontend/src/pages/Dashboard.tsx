/**
 * Dashboard Page
 * Main dashboard view with statistics and quick actions
 */

import { Activity, Upload, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    {
      title: "Total Jobs",
      value: "24",
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Completed",
      value: "18",
      icon: CheckCircle2,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Processing",
      value: "3",
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Ready to Upload",
      value: "0",
      icon: Upload,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's your analysis overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="rounded-lg border border-border/50 bg-card/50 p-6 hover:bg-card/80 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Card */}
        <div className="rounded-lg border border-border/50 bg-gradient-to-br from-card/50 to-card/20 p-8 hover:border-primary/50 transition-colors">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Upload Logs
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Analyze new log files for threats
              </p>
            </div>
            <Button
              onClick={() => navigate("/jobs")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Start Upload
            </Button>
          </div>
        </div>

        {/* Recent Activity Card */}
        <div className="rounded-lg border border-border/50 bg-card/50 p-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {[
              {
                name: "auth_logs_prod.log",
                status: "Completed",
                time: "2 hours ago",
              },
              {
                name: "system_events.log",
                status: "Processing",
                time: "15 minutes ago",
              },
              {
                name: "network_traffic.log",
                status: "Queued",
                time: "Just now",
              },
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {activity.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    activity.status === "Completed"
                      ? "bg-green-500/20 text-green-500"
                      : activity.status === "Processing"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-blue-500/20 text-blue-500"
                  }`}
                >
                  {activity.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
