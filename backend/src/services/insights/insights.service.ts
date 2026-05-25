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
          description: "Most suspicious IP addresses and entities",
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
   */
  generateTopAttackers(
    findings: AnalyzerFindingWithLogs[],
  ): TopAttackersInsightData {
    const ipMap = new Map<
      string,
      {
        request_count: number;
        threat_count: number;
        severities: Set<string>;
        countries: Set<string>;
        last_seen?: Date;
      }
    >();

    // Aggregate data from findings and their logs
    for (const finding of findings) {
      for (const log of finding.referenced_logs) {
        if (log.ip_address) {
          const existing = ipMap.get(log.ip_address) || {
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

          ipMap.set(log.ip_address, existing);
        }
      }
    }

    // Get affected entities from findings too
    for (const finding of findings) {
      if (finding.affected_entities) {
        const entities = finding.affected_entities as any;
        if (entities.ips && Array.isArray(entities.ips)) {
          for (const ip of entities.ips) {
            const existing = ipMap.get(ip) || {
              request_count: 0,
              threat_count: 1,
              severities: new Set(),
              countries: new Set(),
            };

            existing.threat_count++;
            existing.severities.add(finding.severity || "INFO");
            ipMap.set(ip, existing);
          }
        }
      }
    }

    // Convert to sorted array and get top 10
    const attackers = Array.from(ipMap.entries())
      .map(([ip, data]) => {
        const severities = Array.from(data.severities);
        const topSeverity = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].find(
          (s) => severities.includes(s),
        ) as any;

        const attacker: AttackerInfo = {
          ip,
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
      total_unique_ips: ipMap.size,
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
