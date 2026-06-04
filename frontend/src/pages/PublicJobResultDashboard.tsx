import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { mockInsights } from "@/constants/sampleInsightData";
import { InsightRecord } from "@/types/insight";
import { Navbar } from "@/components/landing/Navbar";

import { KpiMetricGrid } from "@/components/dashboard/KpiMetricGrid";
import { ActivityTimelineChart } from "@/components/dashboard/ActivityTimelineChart";
import { TopAttackersTable } from "@/components/dashboard/TopAttackersTable";
import { EventTypeRadarChart } from "@/components/dashboard/EventTypeRadarChart";
import { SeverityDonutChart } from "@/components/dashboard/SeverityDonutChart";
import { AttackPatternCard } from "@/components/dashboard/AttackPatternCard";
import { ThreatTimelineChart } from "@/components/dashboard/ThreatTimelineChart";
import { SecurityAlertFeed } from "@/components/dashboard/SecurityAlertFeed";
import { ExecutiveSummaryCard } from "@/components/dashboard/ExecutiveSummaryCard";
import { ThreatSummaryCard } from "@/components/dashboard/ThreatSummaryCard";
import { AnomalySummaryCard } from "@/components/dashboard/AnomalySummaryCard";
import { ActionPlanRemediationList } from "@/components/dashboard/ActionPlanRemediationList";
import { GeoAnalysisMap } from "@/components/dashboard/GeoAnalysisMap";

export default function PublicJobResultDashboard() {
  const navigate = useNavigate();

  const [insights, setInsights] = useState<InsightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDemoData = () => {
      try {
        setLoading(true);
        // Simulate a realistic compilation delay to mimic real ingestion
        const timer = setTimeout(() => {
          setInsights(mockInsights);
          setLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
      } catch (err) {
        setError("Failed to load demo report data");
        setLoading(false);
      }
    };

    loadDemoData();
  }, []);

  const getInsightData = (targetType: string) => {
    const insight = insights.find((i) => i.type === targetType);
    return insight ? insight.data : null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#040811] text-foreground space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-primary font-mono tracking-widest uppercase">Compiling Intel Report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#040811] text-foreground space-y-4 text-destructive">
        <AlertTriangle className="w-12 h-12" />
        <h2 className="text-xl font-bold">Failed to load report</h2>
        <p className="text-muted-foreground">{error}</p>
        <button onClick={() => navigate("/")} className="px-4 py-2 border border-border rounded mt-4">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040811] text-foreground selection:bg-primary/30">
      <Navbar />

      <div className="pt-24 pb-12 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/`)}
              className="p-2 hover:bg-muted rounded-full transition-colors text-white"
              title="Return to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-[1.65rem] font-bold uppercase tracking-wide text-white">
                Demo Intel Report{" "}
                <span className="text-primary">
                  #DEMO-REPORT
                </span>
              </h1>

              <p className="text-xs text-muted-foreground font-mono tracking-wide">
                CLASSIFICATION: CONFIDENTIAL // SENTINELX IDS // PUBLIC DEMO
              </p>
            </div>
          </div>
        </div>

        {/* Demo Notice Banner */}
        <div className="relative overflow-hidden p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative space-y-1">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>💡 Interactive Demo Mode</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              You are viewing a pre-compiled sample analysis report. To audit your own system logs in real-time, please launch the console and upload a file.
            </p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="relative shrink-0 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold tracking-wide text-xs rounded-lg transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_10px_rgba(132,255,13,0.15)]"
          >
            Upload Your Logs
          </button>
        </div>

        {/* TOP ROW: KPIs */}
        {getInsightData("KPI") && (
          <KpiMetricGrid data={getInsightData("KPI")} />
        )}

        {/* BAND 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-5">
          <div className="lg:col-span-8">
            {getInsightData("ACTIVITY_TIMELINE") && (
              <ActivityTimelineChart
                data={getInsightData("ACTIVITY_TIMELINE")}
              />
            )}
          </div>

          <div className="lg:col-span-4">
            {getInsightData("TOP_ATTACKERS") && (
              <TopAttackersTable
                data={getInsightData("TOP_ATTACKERS")}
              />
            )}
          </div>
        </div>

        {/* BAND 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="scale-[0.985] origin-center">
            {getInsightData("EVENT_TYPE_DISTRIBUTION") && (
              <EventTypeRadarChart
                data={getInsightData("EVENT_TYPE_DISTRIBUTION")}
              />
            )}
          </div>

          <div className="scale-[0.985] origin-center">
            {getInsightData("SEVERITY_DISTRIBUTION") && (
              <SeverityDonutChart
                data={getInsightData("SEVERITY_DISTRIBUTION")}
              />
            )}
          </div>

          <div className="scale-[0.985] origin-center">
            {getInsightData("ATTACK_PATTERN") && (
              <AttackPatternCard
                data={getInsightData("ATTACK_PATTERN")}
              />
            )}
          </div>
        </div>

        {/* BAND 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            {getInsightData("THREAT_TIMELINE") && (
              <ThreatTimelineChart
                data={getInsightData("THREAT_TIMELINE")}
              />
            )}
          </div>

          <div className="lg:col-span-4">
            {getInsightData("ALERT") && (
              <SecurityAlertFeed
                data={getInsightData("ALERT")}
              />
            )}
          </div>
        </div>

        {/* BAND 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="scale-[0.985] origin-center">
            {getInsightData("OVERVIEW") && (
              <ExecutiveSummaryCard
                data={getInsightData("OVERVIEW")}
              />
            )}
          </div>

          <div className="scale-[0.985] origin-center">
            {getInsightData("THREAT_SUMMARY") && (
              <ThreatSummaryCard
                data={getInsightData("THREAT_SUMMARY")}
              />
            )}
          </div>

          <div className="scale-[0.985] origin-center">
            {getInsightData("ANOMALY_SUMMARY") && (
              <AnomalySummaryCard
                data={getInsightData("ANOMALY_SUMMARY")}
              />
            )}
          </div>
        </div>

        {/* BAND 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4">
            {getInsightData("RECOMMENDATION") && (
              <ActionPlanRemediationList
                data={getInsightData("RECOMMENDATION")}
              />
            )}
          </div>

          <div className="lg:col-span-8">
            {getInsightData("GEO_ANALYSIS") && (
              <GeoAnalysisMap
                data={getInsightData("GEO_ANALYSIS")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
