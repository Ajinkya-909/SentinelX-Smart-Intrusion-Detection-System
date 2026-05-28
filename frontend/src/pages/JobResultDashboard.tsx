import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { getJobInsights } from "@/services/report"; // Your API service
import { InsightRecord } from "@/types/insight";

// Import all your widgets here
import { KpiMetricGrid } from "@/components/dashboard/KpiMetricGrid";
import { ExecutiveSummaryCard } from "@/components/dashboard/ExecutiveSummaryCard";
import { ActivityTimelineChart } from "@/components/dashboard/ActivityTimelineChart";
import { ThreatTimelineChart } from "@/components/dashboard/ThreatTimelineChart";
import { EventTypeRadarChart } from "@/components/dashboard/EventTypeRadarChart";
import { SeverityDonutChart } from "@/components/dashboard/SeverityDonutChart";
import { TopAttackersTable } from "@/components/dashboard/TopAttackersTable";
import { SecurityAlertFeed } from "@/components/dashboard/SecurityAlertFeed";
import { ActionPlanRemediationList } from "@/components/dashboard/ActionPlanRemediationList";
import { AttackPatternCard } from "@/components/dashboard/AttackPatternCard";
import { GeoAnalysisMap } from "@/components/dashboard/GeoAnalysisMap";
import { AnomalySummaryCard } from '@/components/dashboard/AnomalySummaryCard';

export default function JobResultDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [insights, setInsights] = useState<InsightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // We only need the insights for the visual dashboard
        const data = await getJobInsights(id, 50, 0);
        // console.log("Fetched insights for dashboard:", data);
        setInsights(data.insights || []); 
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load report data",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [id]);

  // Helper to extract specific insight data payloads
const getInsightData = (targetType: string) => {
    const insight = insights.find(i => i.type === targetType);
    return insight ? insight.data : null;
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-primary font-mono tracking-widest uppercase">
          Compiling Intel Report...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-4 text-destructive">
        <AlertTriangle className="w-12 h-12" />
        <h2 className="text-xl font-bold">Failed to load report</h2>
        <p className="text-muted-foreground">{error}</p>
        <button
          onClick={() => navigate("/jobs")}
          className="px-4 py-2 border border-border rounded mt-4 hover:bg-muted text-foreground"
        >
          Return to Jobs
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/jobs/${id}`)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">
              Intel Report{" "}
              <span className="text-primary">#{id?.split("-")[0]}</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              CLASSIFICATION: CONFIDENTIAL // SENTINELX IDS
            </p>
          </div>
        </div>
      </div>

      {/* TOP ROW: KPIs */}
      {getInsightData("KPI") && <KpiMetricGrid data={getInsightData("KPI")} />}

      {/* BAND 1: Activity & Executive Summary (8/12 + 4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          {getInsightData("ACTIVITY_TIMELINE") && (
            <ActivityTimelineChart data={getInsightData("ACTIVITY_TIMELINE")} />
          )}
        </div>
        <div className="lg:col-span-4">
          {getInsightData("OVERVIEW") && (
            <ExecutiveSummaryCard data={getInsightData("OVERVIEW")} />
          )}
        </div>
      </div>

      {/* BAND 2: Tri-Chart Analytics (4/12 + 4/12 + 4/12) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          {getInsightData("EVENT_TYPE_DISTRIBUTION") && (
            <EventTypeRadarChart
              data={getInsightData("EVENT_TYPE_DISTRIBUTION")}
            />
          )}
        </div>
        <div>
          {getInsightData("SEVERITY_DISTRIBUTION") && (
            <SeverityDonutChart
              data={getInsightData("SEVERITY_DISTRIBUTION")}
            />
          )}
        </div>
        <div>
          {getInsightData("TOP_ATTACKERS") ? (
            <TopAttackersTable data={getInsightData("TOP_ATTACKERS")} />
          ) : getInsightData("GEO_ANALYSIS") ? (
            <GeoAnalysisMap data={getInsightData("GEO_ANALYSIS")} />
          ) : null}
        </div>
      </div>

      {/* BAND 3: Threat Timeline & Alerts (8/12 + 4/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          {getInsightData("THREAT_TIMELINE") && (
            <ThreatTimelineChart data={getInsightData("THREAT_TIMELINE")} />
          )}
        </div>
        <div className="lg:col-span-4">
          {getInsightData("ALERT") && (
            <SecurityAlertFeed data={getInsightData("ALERT")} />
          )}
        </div>
      </div>

      {/* BAND 4: AI Analysis & Remediation (6/12 + 6/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {getInsightData("ATTACK_PATTERN") && (
            <AttackPatternCard data={getInsightData("ATTACK_PATTERN")} />
          )}
        </div>
        <div>
          {getInsightData("RECOMMENDATION") && (
            <ActionPlanRemediationList
              data={getInsightData("RECOMMENDATION")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
