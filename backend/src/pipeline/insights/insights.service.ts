/**
 * INSIGHTS SERVICE
 *
 * Responsibilities:
 * - Load analyzer findings and referenced normalized logs
 * - Generate deterministic insights (timelines, distributions, metrics)
 * - Build AI context for LLM insight generation
 * - Validate insights before persistence
 * - Persist valid insights to database
 * - Handle errors gracefully
 *
 * Location: /pipeline/insights/ (part of pipeline orchestration)
 */

import logger from "@/config/logger";
import { prisma } from "@/config/db";
import { insightValidators } from "@/validators/insight.validator";
import {
  ActivityTimelineInsightData,
  SeverityDistributionInsightData,
  TopAttackersInsightData,
  InsightRecord,
  AttackerInfo,
} from "@/types/insight.types";

// ==========================================
// TYPES
// ==========================================

interface AnalyzerFindingWithLogs {
  finding_id: string;
  analyzer: string;
  finding_type: string;
  severity: string;
  confidence?: number;
  summary?: string;
  title?: string;
  recommendation?: string;
  log_references?: any;
  affected_entities?: any;
  referenced_logs: {
    id: string;
    timestamp: Date;
    source?: string;
    event_type?: string;
    ip_address?: string;
    severity?: string;
    metadata?: any;
  }[];
}

interface InsightGenerationContext {
  jobId: string;
  findings: AnalyzerFindingWithLogs[];
  normalizedLogs: any[];
  timelineData: {
    activityTimeline: ActivityTimelineInsightData;
    threatTimeline?: any;
  };
}

interface InsightGenerationResult {
  job_id: string;
  insights: InsightRecord[];
  deterministic_insights_generated: number;
  validation_errors: any[];
}

// ==========================================
// INSIGHTS SERVICE
// ==========================================

export const insightsService = {
  /**
   * Generate all insights for a job
   * Entry point for insights generation stage
   */
  async generateInsightsForJob(
    jobId: string,
  ): Promise<InsightGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[INSIGHTS SERVICE] Starting insights generation for job ${jobId}`,
      );

      // ===== STEP 1: LOAD ANALYZER FINDINGS =====
      logger.info(`[INSIGHTS SERVICE] Loading analyzer findings...`);

      const findings = await this.loadFindingsWithReferences(jobId);

      if (findings.length === 0) {
        logger.warn(
          `[INSIGHTS SERVICE] No analyzer findings found for job ${jobId}`,
        );
        return {
          job_id: jobId,
          insights: [],
          deterministic_insights_generated: 0,
          validation_errors: [
            { error: "No analyzer findings found", severity: "warning" },
          ],
        };
      }

      logger.info(
        `[INSIGHTS SERVICE] Loaded ${findings.length} analyzer findings`,
      );

      // ===== STEP 2: LOAD NORMALIZED LOGS =====
      logger.info(`[INSIGHTS SERVICE] Loading normalized logs...`);

      const normalizedLogs = await prisma.normalized_logs.findMany({
        where: { job_id: jobId },
        orderBy: { timestamp: "asc" },
      });

      if (normalizedLogs.length === 0) {
        logger.warn(
          `[INSIGHTS SERVICE] No normalized logs found for job ${jobId}`,
        );
      } else {
        logger.info(
          `[INSIGHTS SERVICE] Loaded ${normalizedLogs.length} normalized logs`,
        );
      }

      // ===== STEP 3: GENERATE DETERMINISTIC INSIGHTS =====
      logger.info(`[INSIGHTS SERVICE] Generating deterministic insights...`);

      const deterministicInsights = await this.generateDeterministicInsights(
        jobId,
        findings,
        normalizedLogs,
      );

      logger.info(
        `[INSIGHTS SERVICE] Generated ${deterministicInsights.length} deterministic insights`,
      );

      // ===== STEP 4: BUILD AI CONTEXT =====
      logger.info(`[INSIGHTS SERVICE] Building AI context for LLM...`);

      const context = await this.buildAIContext(
        jobId,
        findings,
        normalizedLogs,
        deterministicInsights.find(
          (i) => i.insight_type === "ACTIVITY_TIMELINE",
        )?.data as ActivityTimelineInsightData | undefined,
      );

      logger.info(`[INSIGHTS SERVICE] AI context built successfully`);

      // ===== STEP 5: RETURN FOR LLM PROCESSING =====
      logger.info(
        `[INSIGHTS SERVICE] Returning context for LLM insight generation`,
      );

      logger.info(
        `[INSIGHTS SERVICE] Insights generation prep completed in ${
          Date.now() - startTime
        }ms`,
      );

      return {
        job_id: jobId,
        insights: deterministicInsights,
        deterministic_insights_generated: deterministicInsights.length,
        validation_errors: [],
      };
    } catch (error) {
      logger.error(
        `[INSIGHTS SERVICE] Error generating insights: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Load analyzer findings with their referenced normalized logs
   */
  async loadFindingsWithReferences(
    jobId: string,
  ): Promise<AnalyzerFindingWithLogs[]> {
    try {
      const findings = await prisma.analyzer_findings.findMany({
        where: { job_id: jobId },
        orderBy: { detected_at: "desc" },
      });

      if (findings.length === 0) {
        return [];
      }

      // Enrich findings with referenced logs
      const enrichedFindings: AnalyzerFindingWithLogs[] = [];

      for (const finding of findings) {
        const logIds = (finding.log_references as any)?.log_ids || [];

        let referencedLogs: any[] = [];
        if (logIds.length > 0) {
          referencedLogs = await prisma.normalized_logs.findMany({
            where: {
              id: {
                in: logIds,
              },
            },
          });
        }

        enrichedFindings.push({
          finding_id: finding.id,
          analyzer: finding.analyzer,
          finding_type: finding.finding_type,
          severity: finding.severity,
          confidence: finding.confidence ?? undefined,
          summary: finding.summary ?? undefined,
          title: finding.title ?? undefined,
          recommendation: finding.recommendation ?? undefined,
          log_references: finding.log_references,
          affected_entities: finding.affected_entities,
          referenced_logs: referencedLogs,
        } as any);
      }

      return enrichedFindings;
    } catch (error) {
      logger.error(
        `[INSIGHTS SERVICE] Error loading findings: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Generate deterministic insights (no LLM required)
   */
  async generateDeterministicInsights(
    jobId: string,
    findings: AnalyzerFindingWithLogs[],
    normalizedLogs: any[],
  ): Promise<InsightRecord[]> {
    const insights: InsightRecord[] = [];
    const validationErrors: any[] = [];

    try {
      // ===== ACTIVITY_TIMELINE =====
      logger.info(`[INSIGHTS SERVICE] Generating ACTIVITY_TIMELINE...`);
      const activityTimeline = this.generateActivityTimeline(normalizedLogs);
      const activityInsight: InsightRecord = {
        job_id: jobId,
        insight_type: "ACTIVITY_TIMELINE",
        title: "Activity Timeline",
        description:
          "Timeline of all normalized log events showing system activity over time",
        severity: "INFO",
        data: activityTimeline,
        generated_by: "DETERMINISTIC",
        is_visible: true,
        display_order: 5,
      };

      const activityValidation = insightValidators.validateInsightData(
        "ACTIVITY_TIMELINE",
        activityTimeline,
      );
      if (activityValidation.valid) {
        insights.push(activityInsight);
      } else {
        logger.warn(
          `[INSIGHTS SERVICE] ACTIVITY_TIMELINE validation failed: ${JSON.stringify(
            activityValidation.errors,
          )}`,
        );
        validationErrors.push({
          type: "ACTIVITY_TIMELINE",
          errors: activityValidation.errors,
        });
      }

      // ===== SEVERITY_DISTRIBUTION =====
      logger.info(`[INSIGHTS SERVICE] Generating SEVERITY_DISTRIBUTION...`);
      const severityDist = this.generateSeverityDistribution(findings);
      const severityInsight: InsightRecord = {
        job_id: jobId,
        insight_type: "SEVERITY_DISTRIBUTION",
        title: "Threat Severity Distribution",
        description: "Distribution of findings by severity level",
        data: severityDist,
        generated_by: "DETERMINISTIC",
        is_visible: true,
        display_order: 3,
      };

      const severityValidation = insightValidators.validateInsightData(
        "SEVERITY_DISTRIBUTION",
        severityDist,
      );
      if (severityValidation.valid) {
        insights.push(severityInsight);
      } else {
        logger.warn(
          `[INSIGHTS SERVICE] SEVERITY_DISTRIBUTION validation failed`,
        );
        validationErrors.push({
          type: "SEVERITY_DISTRIBUTION",
          errors: severityValidation.errors,
        });
      }

      // ===== TOP_ATTACKERS =====
      logger.info(`[INSIGHTS SERVICE] Generating TOP_ATTACKERS...`);
      const topAttackers = this.generateTopAttackers(findings);

      if (topAttackers.attackers.length > 0) {
        const topAttackersInsight: InsightRecord = {
          job_id: jobId,
          insight_type: "TOP_ATTACKERS",
          title: "Top Attackers",
          description: "Most suspicious IPs and Entities",
          data: topAttackers,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 4,
        };

        const topAttackersValidation = insightValidators.validateInsightData(
          "TOP_ATTACKERS",
          topAttackers,
        );
        if (topAttackersValidation.valid) {
          insights.push(topAttackersInsight);
        } else {
          logger.warn(`[INSIGHTS SERVICE] TOP_ATTACKERS validation failed`);
          validationErrors.push({
            type: "TOP_ATTACKERS",
            errors: topAttackersValidation.errors,
          });
        }
      }

      // ===== EVENT_TYPE_DISTRIBUTION =====
      logger.info(`[INSIGHTS SERVICE] Generating EVENT_TYPE_DISTRIBUTION...`);
      const eventDist = this.generateEventTypeDistribution(normalizedLogs);

      if (eventDist.distribution.length > 0) {
        const eventDistInsight: InsightRecord = {
          job_id: jobId,
          insight_type: "EVENT_TYPE_DISTRIBUTION",
          title: "Event Type Distribution",
          description: "Distribution of log events by type",
          data: eventDist,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 6,
        };

        const eventDistValidation = insightValidators.validateInsightData(
          "EVENT_TYPE_DISTRIBUTION",
          eventDist,
        );
        if (eventDistValidation.valid) {
          insights.push(eventDistInsight);
        } else {
          logger.warn(
            `[INSIGHTS SERVICE] EVENT_TYPE_DISTRIBUTION validation failed`,
          );
          validationErrors.push({
            type: "EVENT_TYPE_DISTRIBUTION",
            errors: eventDistValidation.errors,
          });
        }
      }

      // ===== KPI METRICS =====
      logger.info(`[INSIGHTS SERVICE] Generating KPI...`);
      const kpi = this.generateKPIMetrics(findings, normalizedLogs);
      const kpiInsight: InsightRecord = {
        job_id: jobId,
        insight_type: "KPI",
        title: "Key Performance Indicators",
        description: "Critical security metrics and indicators",
        data: kpi,
        generated_by: "DETERMINISTIC",
        is_visible: true,
        display_order: 1,
      };

      const kpiValidation = insightValidators.validateInsightData("KPI", kpi);
      if (kpiValidation.valid) {
        insights.push(kpiInsight);
      } else {
        logger.warn(`[INSIGHTS SERVICE] KPI validation failed`);
        validationErrors.push({
          type: "KPI",
          errors: kpiValidation.errors,
        });
      }

      // ===== THREAT_TIMELINE =====
      logger.info(`[INSIGHTS SERVICE] Generating THREAT_TIMELINE...`);
      const threatTimeline = this.generateThreatTimeline(findings);
      if (threatTimeline.points.length > 0) {
        const threatTimelineInsight: InsightRecord = {
          job_id: jobId,
          insight_type: "THREAT_TIMELINE",
          title: "Threat Timeline",
          description: "Timeline of suspicious activity and threat detections",
          severity: "INFO",
          data: threatTimeline,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 7,
        };

        const threatTimelineValidation = insightValidators.validateInsightData(
          "THREAT_TIMELINE",
          threatTimeline,
        );
        if (threatTimelineValidation.valid) {
          insights.push(threatTimelineInsight);
        } else {
          logger.warn(`[INSIGHTS SERVICE] THREAT_TIMELINE validation failed`);
          validationErrors.push({
            type: "THREAT_TIMELINE",
            errors: threatTimelineValidation.errors,
          });
        }
      }

      // ===== GEO_ANALYSIS =====
      logger.info(`[INSIGHTS SERVICE] Generating GEO_ANALYSIS...`);
      const geoAnalysis = this.generateGeoAnalysis(findings);
      if (geoAnalysis.countries && geoAnalysis.countries.length > 0) {
        const geoAnalysisInsight: InsightRecord = {
          job_id: jobId,
          insight_type: "GEO_ANALYSIS",
          title: "Geographic Analysis",
          description: "Geographic distribution of attack sources",
          data: geoAnalysis,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 8,
        };

        const geoValidation = insightValidators.validateInsightData(
          "GEO_ANALYSIS",
          geoAnalysis,
        );
        if (geoValidation.valid) {
          insights.push(geoAnalysisInsight);
        } else {
          logger.warn(`[INSIGHTS SERVICE] GEO_ANALYSIS validation failed`);
          validationErrors.push({
            type: "GEO_ANALYSIS",
            errors: geoValidation.errors,
          });
        }
      }

      // ===== ALERT =====
      logger.info(`[INSIGHTS SERVICE] Generating ALERT...`);
      const alerts = this.generateAlerts(findings);
      if (alerts.alerts && alerts.alerts.length > 0) {
        const alertInsight: InsightRecord = {
          job_id: jobId,
          insight_type: "ALERT",
          title: "Critical Security Alerts",
          description: "Priority security alerts and findings",
          severity: alerts.highest_severity || "MEDIUM",
          data: alerts,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 2,
        };

        const alertValidation = insightValidators.validateInsightData(
          "ALERT",
          alerts,
        );
        if (alertValidation.valid) {
          insights.push(alertInsight);
        } else {
          logger.warn(`[INSIGHTS SERVICE] ALERT validation failed`);
          validationErrors.push({
            type: "ALERT",
            errors: alertValidation.errors,
          });
        }
      }

      logger.info(
        `[INSIGHTS SERVICE] Generated ${insights.length} deterministic insights`,
      );

      if (validationErrors.length > 0) {
        logger.warn(
          `[INSIGHTS SERVICE] ${validationErrors.length} validation errors during deterministic generation`,
        );
      }

      return insights;
    } catch (error) {
      logger.error(
        `[INSIGHTS SERVICE] Error generating deterministic insights: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Generate THREAT_TIMELINE from findings
   */
  generateThreatTimeline(findings: AnalyzerFindingWithLogs[]): any {
    if (findings.length === 0) {
      return {
        points: [],
        total_threats: 0,
        time_range: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
      };
    }

    // Group findings by time buckets (15-minute buckets)
    const bucketMap = new Map<
      string,
      { threat_count: number; severities: Set<string> }
    >();
    const bucketSizeMs = 15 * 60 * 1000; // 15 minutes

    for (const finding of findings) {
      const timestamp = new Date(
        finding.referenced_logs[0]?.timestamp || new Date(),
      );
      const bucketStart = new Date(
        Math.floor(timestamp.getTime() / bucketSizeMs) * bucketSizeMs,
      );
      const bucketKey = bucketStart.toISOString();

      const existing = bucketMap.get(bucketKey) || {
        threat_count: 0,
        severities: new Set(),
      };

      existing.threat_count++;
      existing.severities.add(finding.severity || "MEDIUM");
      bucketMap.set(bucketKey, existing);
    }

    const points = Array.from(bucketMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([timestamp, data]) => {
        const topSeverity =
          ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].find((s) =>
            data.severities.has(s),
          ) || "INFO";

        return {
          timestamp,
          threat_count: data.threat_count,
          severity: topSeverity,
        };
      });

    const sortedFindings = findings.sort(
      (a, b) =>
        new Date(a.referenced_logs[0]?.timestamp || 0).getTime() -
        new Date(b.referenced_logs[0]?.timestamp || 0).getTime(),
    );

    return {
      points,
      total_threats: findings.length,
      time_range: {
        start: (
          sortedFindings[0]?.referenced_logs[0]?.timestamp || new Date()
        ).toISOString(),
        end: (
          sortedFindings[sortedFindings.length - 1]?.referenced_logs[0]
            ?.timestamp || new Date()
        ).toISOString(),
      },
    };
  },

  /**
   * Generate GEO_ANALYSIS from findings
   */
  generateGeoAnalysis(findings: AnalyzerFindingWithLogs[]): any {
    const countryMap = new Map<
      string,
      { request_count: number; threat_count: number; severity: string }
    >();

    // Simple country mapping based on IP ranges (basic implementation)
    const getCountryFromIP = (ip: string): string => {
      if (!ip) return "Unknown";
      // This is a simplified mapping - in production use GeoIP database
      const parts = ip.split(".");
      if (!parts[0]) return "Unknown";
      const firstOctet = parseInt(parts[0]);

      if (firstOctet >= 1 && firstOctet <= 14) return "United States";
      if (firstOctet >= 15 && firstOctet <= 24) return "United States";
      if (firstOctet >= 25 && firstOctet <= 49) return "Europe";
      if (firstOctet >= 50 && firstOctet <= 99) return "Asia";
      if (firstOctet >= 100 && firstOctet <= 149) return "Europe";
      if (firstOctet >= 150 && firstOctet <= 176) return "Asia";
      if (firstOctet >= 177 && firstOctet <= 200) return "South America";
      if (firstOctet >= 201 && firstOctet <= 220) return "Africa";
      return "Other";
    };

    for (const finding of findings) {
      for (const log of finding.referenced_logs) {
        if (log.ip_address) {
          const country = getCountryFromIP(log.ip_address);
          const existing = countryMap.get(country) || {
            request_count: 0,
            threat_count: 0,
            severity: "LOW",
          };

          existing.request_count++;
          existing.threat_count++;

          const severityOrder: Record<string, number> = {
            CRITICAL: 4,
            HIGH: 3,
            MEDIUM: 2,
            LOW: 1,
            INFO: 0,
          };

          if (
            (severityOrder[finding.severity] || 0) >
            (severityOrder[existing.severity] || 0)
          ) {
            existing.severity = finding.severity || "LOW";
          }

          countryMap.set(country, existing);
        }
      }
    }

    const countries = Array.from(countryMap.entries())
      .map(([country, data]) => ({
        country,
        request_count: data.request_count,
        threat_count: data.threat_count,
        severity: data.severity,
      }))
      .sort((a, b) => b.request_count - a.request_count);

    return {
      countries,
      total_countries: countryMap.size,
    };
  },

  /**
   * Generate ALERT insights from findings
   */
  generateAlerts(findings: AnalyzerFindingWithLogs[]): any {
    const criticalAndHighFindings = findings
      .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
      .sort((a, b) => {
        const order: Record<string, number> = {
          CRITICAL: 0,
          HIGH: 1,
        };
        return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
      })
      .slice(0, 10); // Top 10 critical/high alerts

    const alerts = criticalAndHighFindings.map((finding) => ({
      title: finding.title || finding.finding_type,
      severity: finding.severity,
      description:
        finding.summary ||
        `${finding.analyzer} detected ${finding.finding_type}`,
      recommendation:
        finding.recommendation || `Review findings from ${finding.analyzer}`,
      related_findings: [finding.finding_id],
    }));

    const severityOrder: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
      INFO: 0,
    };

    const highestSeverity =
      findings.length > 0
        ? findings.reduce((highest, current) => {
            return (severityOrder[current.severity] ?? 0) >
              (severityOrder[highest.severity] ?? 0)
              ? current
              : highest;
          }).severity
        : "INFO";

    return {
      alerts,
      alert_count: alerts.length,
      highest_severity: highestSeverity,
    };
  },

  /**
   * Load ONLY referenced logs (for LLM context)
   * Returns unique logs that are referenced by analyzer findings
   */
  async loadReferencedLogsSelectively(
    jobId: string,
    findings: AnalyzerFindingWithLogs[],
  ): Promise<any[]> {
    try {
      // Extract all unique log IDs from findings
      const logIds = new Set<string>();

      for (const finding of findings) {
        const refLogIds = (finding.log_references as any)?.log_ids || [];
        for (const logId of refLogIds) {
          logIds.add(logId);
        }
      }

      if (logIds.size === 0) {
        logger.warn(
          `[INSIGHTS SERVICE] No referenced logs found for job ${jobId}`,
        );
        return [];
      }

      // Fetch only these specific logs
      const logs = await prisma.normalized_logs.findMany({
        where: {
          id: {
            in: Array.from(logIds),
          },
        },
        orderBy: { timestamp: "asc" },
      });

      logger.info(
        `[INSIGHTS SERVICE] Loaded ${logs.length} unique referenced logs for LLM context`,
      );

      return logs;
    } catch (error) {
      logger.error(
        `[INSIGHTS SERVICE] Error loading referenced logs: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },

  /**
   * Generate ACTIVITY_TIMELINE from normalized logs
   */
  generateActivityTimeline(logs: any[]): ActivityTimelineInsightData {
    if (logs.length === 0) {
      return {
        points: [],
        total_events: 0,
        time_range: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
        },
      };
    }

    // Group logs by 5-minute buckets
    const bucketMap = new Map<string, number>();
    const bucketSizeMs = 5 * 60 * 1000; // 5 minutes

    for (const log of logs) {
      const timestamp = new Date(log.timestamp);
      const bucketStart = new Date(
        Math.floor(timestamp.getTime() / bucketSizeMs) * bucketSizeMs,
      );
      const bucketKey = bucketStart.toISOString();

      bucketMap.set(bucketKey, (bucketMap.get(bucketKey) || 0) + 1);
    }

    // Sort and convert to points
    const points = Array.from(bucketMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([timestamp, count]) => ({
        timestamp,
        event_count: count,
      }));

    const sortedLogs = logs.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      points,
      total_events: logs.length,
      time_range: {
        start: sortedLogs[0].timestamp.toISOString(),
        end: sortedLogs[sortedLogs.length - 1].timestamp.toISOString(),
      },
    };
  },

  /**
   * Generate SEVERITY_DISTRIBUTION from findings
   */
  generateSeverityDistribution(
    findings: AnalyzerFindingWithLogs[],
  ): SeverityDistributionInsightData {
    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
    };

    for (const finding of findings) {
      const severity = (finding.severity || "INFO").toUpperCase();
      if (severity in severityCounts) {
        severityCounts[severity as keyof typeof severityCounts]++;
      }
    }

    const total = findings.length;
    const distribution = Object.entries(severityCounts)
      .filter(([, count]) => count > 0)
      .map(([severity, count]) => ({
        severity: severity as any,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100, // 2 decimals
      }))
      .sort((a, b) => {
        const order: Record<string, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
          INFO: 4,
        };
        const aOrder = order[a.severity as string] ?? 5;
        const bOrder = order[b.severity as string] ?? 5;
        return aOrder - bOrder;
      });

    return {
      distribution,
      total_findings: total,
    };
  },

  /**
   * Generate TOP_ATTACKERS from findings
   * PATCHED: Context-Aware entity extraction (no longer relying on hardcoded .ips array)
   */
  generateTopAttackers(
    findings: AnalyzerFindingWithLogs[],
  ): TopAttackersInsightData {
    const attackerMap = new Map<
      string,
      {
        request_count: number;
        threat_count: number;
        severities: Set<string>;
        countries: Set<string>;
        last_seen?: Date;
      }
    >();

    // 1. Aggregate data from findings and their logs (IPs from logs)
    for (const finding of findings) {
      for (const log of finding.referenced_logs) {
        if (log.ip_address && log.ip_address !== "unknown") {
          const existing = attackerMap.get(log.ip_address) || {
            request_count: 0,
            threat_count: 0,
            severities: new Set(),
            countries: new Set(),
          };

          existing.request_count++;
          existing.threat_count++;
          existing.severities.add(finding.severity || "INFO");

          if (log.timestamp) {
            if (!existing.last_seen || log.timestamp > existing.last_seen) {
              existing.last_seen = log.timestamp;
            }
          }

          attackerMap.set(log.ip_address, existing);
        }
      }
    }

    // 2. Aggregate from affected_entities dynamically (The Fix!)
    for (const finding of findings) {
      if (finding.affected_entities) {
        const entities = new Set<string>();
        
        // Dynamically scan for IPs or Usernames in the new schema
        for (const [key, value] of Object.entries(finding.affected_entities)) {
          // Check keys that likely contain attacker identities
          if (key.includes('ip') || key.includes('user') || key.includes('attacker') || key.includes('source')) {
            if (typeof value === 'string' && value !== "unknown" && value.trim() !== "") {
              entities.add(value);
            } else if (Array.isArray(value)) {
              value.forEach(v => {
                if (typeof v === 'string' && v !== "unknown" && v.trim() !== "") entities.add(v);
              });
            }
          }
        }

        for (const entity of entities) {
          const existing = attackerMap.get(entity) || {
            request_count: 0,
            threat_count: 0,
            severities: new Set(),
            countries: new Set(),
          };

          existing.threat_count++; // It's in a finding, so it's a threat
          existing.severities.add(finding.severity || "INFO");
          attackerMap.set(entity, existing);
        }
      }
    }

    // Convert to sorted array and get top 10
    const attackers = Array.from(attackerMap.entries())
      .map(([ip, data]) => {
        const severities = Array.from(data.severities);
        const topSeverity = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].find(
          (s) => severities.includes(s),
        ) as any;

        const attacker: AttackerInfo = {
          ip, // Keeping the field named 'ip' to match the type definition, even if it's a username/entity
          request_count: data.request_count,
          threat_count: data.threat_count,
          severity: topSeverity || "LOW",
        };

        if (data.last_seen) {
          attacker.last_seen = data.last_seen.toISOString();
        }

        return attacker;
      })
      .sort((a, b) => b.threat_count - a.threat_count)
      .slice(0, 10);

    return {
      attackers,
      total_unique_ips: attackerMap.size,
    };
  },

  /**
   * Generate EVENT_TYPE_DISTRIBUTION from normalized logs
   */
  generateEventTypeDistribution(logs: any[]): any {
    const eventTypeMap = new Map<string, number>();

    for (const log of logs) {
      const eventType = log.event_type || "UNKNOWN";
      eventTypeMap.set(eventType, (eventTypeMap.get(eventType) || 0) + 1);
    }

    const total = logs.length;
    const distribution = Array.from(eventTypeMap.entries())
      .map(([event_type, count]) => ({
        event_type,
        count,
        percentage: Math.round((count / total) * 100 * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15 event types

    return {
      distribution,
      total_events: total,
    };
  },

  /**
   * Generate KPI metrics
   */
  generateKPIMetrics(findings: AnalyzerFindingWithLogs[], logs: any[]): any {
    const criticalCount = findings.filter(
      (f) => f.severity === "CRITICAL",
    ).length;
    const highCount = findings.filter((f) => f.severity === "HIGH").length;
    const totalThreats = findings.length;
    const uniqueIPs = new Set(
      findings.flatMap((f) =>
        f.referenced_logs.map((l) => l.ip_address).filter(Boolean),
      ),
    ).size;

    return {
      metrics: [
        {
          label: "Total Threats",
          value: totalThreats,
          severity: totalThreats > 0 ? "HIGH" : "INFO",
        },
        {
          label: "Critical Alerts",
          value: criticalCount,
          severity: criticalCount > 0 ? "CRITICAL" : "INFO",
        },
        {
          label: "High Priority",
          value: highCount,
          severity: highCount > 0 ? "HIGH" : "INFO",
        },
        {
          label: "Unique Attack Sources",
          value: uniqueIPs,
          severity: uniqueIPs > 5 ? "HIGH" : "MEDIUM",
        },
        {
          label: "Total Events",
          value: logs.length,
        },
      ],
    };
  },

  /**
   * Build AI context for LLM insight generation
   * Returns findings, logs, and timeline data ready for Gemini
   */
  async buildAIContext(
    jobId: string,
    findings: AnalyzerFindingWithLogs[],
    normalizedLogs: any[],
    activityTimeline?: ActivityTimelineInsightData,
  ): Promise<InsightGenerationContext> {
    return {
      jobId,
      findings,
      normalizedLogs,
      timelineData: {
        activityTimeline: activityTimeline || this.generateActivityTimeline([]),
      },
    };
  },
  /**
   * Load normalized logs for a job
   */
  async loadNormalizedLogs(jobId: string): Promise<any[]> {
    try {
      const logs = await prisma.normalized_logs.findMany({
        where: { job_id: jobId },
        orderBy: { timestamp: "asc" },
      });
      return logs;
    } catch (error) {
      logger.error(
        `[INSIGHTS SERVICE] Error loading normalized logs: ${
          error instanceof Error ? error.message : error
        }`,
      );
      throw error;
    }
  },
  /**
   * Persist insights to database
   */
  async persistInsights(insights: InsightRecord[]): Promise<any> {
    logger.info(`[INSIGHTS SERVICE] Persisting ${insights.length} insights...`);

    const createdInsights = [];
    const skippedInsights = [];

    for (const insight of insights) {
      try {
        // Validate before insert
        const validation = insightValidators.validateInsightRecord({
          insight_type: insight.insight_type,
          data: insight.data,
        });

        if (!validation.valid) {
          logger.warn(
            `[INSIGHTS SERVICE] Skipping invalid insight: ${
              insight.insight_type
            } - ${JSON.stringify(validation.errors)}`,
          );
          skippedInsights.push({
            insight: insight.insight_type,
            reason: `Validation failed: ${validation.errors?.[0]?.message}`,
          });
          continue;
        }

        const created = await prisma.insights.create({
          data: {
            job_id: insight.job_id,
            insight_type: insight.insight_type as any,
            title: insight.title ?? null,
            description: insight.description ?? null,
            severity: insight.severity as any,
            priority_score: insight.priority_score ?? null,
            confidence_score: insight.confidence_score ?? null,
            data: insight.data as any,
            generated_by: insight.generated_by as any,
            model_name: insight.model_name ?? null,
            generation_version: insight.generation_version ?? null,
            finding_references: insight.finding_references ?? null,
            log_references: insight.log_references ?? null,
            is_visible: insight.is_visible ?? true,
            display_order: insight.display_order ?? null,
            metadata: insight.metadata ?? null,
          },
        });

        createdInsights.push(created);
      } catch (error) {
        logger.error(
          `[INSIGHTS SERVICE] Error persisting insight ${
            insight.insight_type
          }: ${error instanceof Error ? error.message : error}`,
        );
        skippedInsights.push({
          insight: insight.insight_type,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.info(
      `[INSIGHTS SERVICE] Persisted ${createdInsights.length} insights, skipped ${skippedInsights.length}`,
    );

    return {
      created: createdInsights,
      skipped: skippedInsights,
      total_persisted: createdInsights.length,
      total_skipped: skippedInsights.length,
    };
  },
};