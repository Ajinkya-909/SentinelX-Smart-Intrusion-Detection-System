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
import { GeoIPUtil } from "@/utils/geoip";

// ==========================================
// TYPES
// ==========================================

// FIX: Added `evidence` and `detected_at` fields.
// `evidence` is needed so buildMasterContext can forward forensic data to the LLM.
// `detected_at` is needed as a reliable timestamp fallback in generateThreatTimeline.
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
  evidence?: any;        // FIX: was missing — LLM never received forensic evidence
  detected_at?: Date;    // FIX: was missing — needed as timestamp fallback
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

interface InsightSourceData {
  findings: AnalyzerFindingWithLogs[];
  normalizedLogs: any[];
}

interface InsightGenerationResult {
  job_id: string;
  insights: InsightRecord[];
  deterministic_insights_generated: number;
  validation_errors: any[];
}

// IPv4 regex — same pattern used in insight.validator.ts so we can pre-filter
// before validation and avoid silent drops of the entire TOP_ATTACKERS insight.
// NOTE: If insight.validator.ts is updated to accept any string (to support
// usernames/hostnames), this filter can be removed from generateTopAttackers().
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

// ==========================================
// INSIGHTS SERVICE
// ==========================================

export const insightsService = {
  /**
   * Load findings and normalized logs once for both deterministic and LLM
   * insight generation. Calling this once in the orchestrator prevents the
   * double DB round-trip that existed in the previous architecture.
   */
  async loadInsightSourceData(jobId: string): Promise<InsightSourceData> {
    const [findings, normalizedLogs] = await Promise.all([
      this.loadFindingsWithReferences(jobId),
      this.loadNormalizedLogs(jobId),
    ]);

    return { findings, normalizedLogs };
  },

  /**
   * Generate all deterministic insights for a job.
   * Accepts pre-loaded source data from the orchestrator to avoid re-fetching.
   */
  async generateInsightsForJob(
    jobId: string,
    preloadedData?: InsightSourceData,
  ): Promise<InsightGenerationResult> {
    const startTime = Date.now();

    try {
      logger.info(
        `[INSIGHTS SERVICE] Starting insights generation for job ${jobId}`,
      );

      const sourceData =
        preloadedData || (await this.loadInsightSourceData(jobId));
      const { findings, normalizedLogs } = sourceData;

      logger.info(
        `[INSIGHTS SERVICE] Source data: ${findings.length} findings, ${normalizedLogs.length} logs`,
      );

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

      // Generate all deterministic insights
      logger.info(`[INSIGHTS SERVICE] Generating deterministic insights...`);

      const deterministicInsights = await this.generateDeterministicInsights(
        jobId,
        findings,
        normalizedLogs,
      );

      logger.info(
        `[INSIGHTS SERVICE] Generated ${deterministicInsights.length} deterministic insights in ${Date.now() - startTime}ms`,
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
   * Load analyzer findings with their referenced normalized logs.
   * FIX: Now also loads `evidence` and `detected_at` from each finding so the
   * LLM prompt builder receives full forensic context.
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

      const enrichedFindings: AnalyzerFindingWithLogs[] = [];

      for (const finding of findings) {
        const logIds = Array.isArray(finding.log_references)
          ? finding.log_references
          : (finding.log_references as any)?.log_ids || [];

        let referencedLogs: any[] = [];
        if (logIds.length > 0) {
          referencedLogs = await prisma.normalized_logs.findMany({
            where: { id: { in: logIds } },
          });
        }

        enrichedFindings.push({
          finding_id: finding.id,
          analyzer: finding.analyzer,
          finding_type: finding.finding_type,
          severity: finding.severity,
          log_references: finding.log_references,
          affected_entities: finding.affected_entities,
          // FIX: Include evidence so buildMasterContext can inject it into the
          // LLM prompt. Previously this field was never loaded, causing the LLM
          // to receive no forensic data and generate generic/hallucinated insights.
          ...(finding.confidence !== null && finding.confidence !== undefined
            ? { confidence: finding.confidence }
            : {}),
          ...(finding.summary !== null && finding.summary !== undefined
            ? { summary: finding.summary }
            : {}),
          ...(finding.title !== null && finding.title !== undefined
            ? { title: finding.title }
            : {}),
          ...(finding.recommendation !== null && finding.recommendation !== undefined
            ? { recommendation: finding.recommendation }
            : {}),
          ...(finding.evidence !== null && finding.evidence !== undefined
            ? { evidence: finding.evidence }
            : {}),
          // FIX: Include detected_at so generateThreatTimeline has a reliable
          // fallback timestamp when referenced_logs is empty.
          ...(finding.detected_at !== null && finding.detected_at !== undefined
            ? { detected_at: finding.detected_at }
            : {}),
          referenced_logs: referencedLogs,
        });
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
   * Generate all deterministic insights (no LLM required).
   * Each insight type is independently validated so a failure in one type
   * does not prevent the others from being generated.
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
      const activityValidation = insightValidators.validateInsightData(
        "ACTIVITY_TIMELINE",
        activityTimeline,
      );
      if (activityValidation.valid) {
        insights.push({
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
        });
      } else {
        logger.warn(
          `[INSIGHTS SERVICE] ACTIVITY_TIMELINE validation failed: ${JSON.stringify(activityValidation.errors)}`,
        );
        validationErrors.push({ type: "ACTIVITY_TIMELINE", errors: activityValidation.errors });
      }

      // ===== SEVERITY_DISTRIBUTION =====
      logger.info(`[INSIGHTS SERVICE] Generating SEVERITY_DISTRIBUTION...`);
      const severityDist = this.generateSeverityDistribution(findings);
      const severityValidation = insightValidators.validateInsightData(
        "SEVERITY_DISTRIBUTION",
        severityDist,
      );
      if (severityValidation.valid) {
        insights.push({
          job_id: jobId,
          insight_type: "SEVERITY_DISTRIBUTION",
          title: "Threat Severity Distribution",
          description: "Distribution of findings by severity level",
          data: severityDist,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 3,
        });
      } else {
        logger.warn(`[INSIGHTS SERVICE] SEVERITY_DISTRIBUTION validation failed`);
        validationErrors.push({ type: "SEVERITY_DISTRIBUTION", errors: severityValidation.errors });
      }

      // ===== TOP_ATTACKERS =====
      logger.info(`[INSIGHTS SERVICE] Generating TOP_ATTACKERS...`);
      const topAttackers = this.generateTopAttackers(findings);
      if (topAttackers.attackers.length > 0) {
        const topAttackersValidation = insightValidators.validateInsightData(
          "TOP_ATTACKERS",
          topAttackers,
        );
        if (topAttackersValidation.valid) {
          insights.push({
            job_id: jobId,
            insight_type: "TOP_ATTACKERS",
            title: "Top Attackers",
            description: "Most suspicious IPs and entities by threat count",
            data: topAttackers,
            generated_by: "DETERMINISTIC",
            is_visible: true,
            display_order: 4,
          });
        } else {
          logger.warn(`[INSIGHTS SERVICE] TOP_ATTACKERS validation failed`);
          validationErrors.push({ type: "TOP_ATTACKERS", errors: topAttackersValidation.errors });
        }
      }

      // ===== EVENT_TYPE_DISTRIBUTION =====
      logger.info(`[INSIGHTS SERVICE] Generating EVENT_TYPE_DISTRIBUTION...`);
      const eventDist = this.generateEventTypeDistribution(normalizedLogs);
      if (eventDist.distribution.length > 0) {
        const eventDistValidation = insightValidators.validateInsightData(
          "EVENT_TYPE_DISTRIBUTION",
          eventDist,
        );
        if (eventDistValidation.valid) {
          insights.push({
            job_id: jobId,
            insight_type: "EVENT_TYPE_DISTRIBUTION",
            title: "Event Type Distribution",
            description: "Distribution of log events by type",
            data: eventDist,
            generated_by: "DETERMINISTIC",
            is_visible: true,
            display_order: 6,
          });
        } else {
          logger.warn(`[INSIGHTS SERVICE] EVENT_TYPE_DISTRIBUTION validation failed`);
          validationErrors.push({ type: "EVENT_TYPE_DISTRIBUTION", errors: eventDistValidation.errors });
        }
      }

      // ===== KPI METRICS =====
      logger.info(`[INSIGHTS SERVICE] Generating KPI...`);
      const kpi = this.generateKPIMetrics(findings, normalizedLogs);
      const kpiValidation = insightValidators.validateInsightData("KPI", kpi);
      if (kpiValidation.valid) {
        insights.push({
          job_id: jobId,
          insight_type: "KPI",
          title: "Key Performance Indicators",
          description: "Critical security metrics and indicators",
          data: kpi,
          generated_by: "DETERMINISTIC",
          is_visible: true,
          display_order: 1,
        });
      } else {
        logger.warn(`[INSIGHTS SERVICE] KPI validation failed`);
        validationErrors.push({ type: "KPI", errors: kpiValidation.errors });
      }

      // ===== THREAT_TIMELINE =====
      logger.info(`[INSIGHTS SERVICE] Generating THREAT_TIMELINE...`);
      const threatTimeline = this.generateThreatTimeline(findings);
      if (threatTimeline.points.length > 0) {
        const threatTimelineValidation = insightValidators.validateInsightData(
          "THREAT_TIMELINE",
          threatTimeline,
        );
        if (threatTimelineValidation.valid) {
          insights.push({
            job_id: jobId,
            insight_type: "THREAT_TIMELINE",
            title: "Threat Timeline",
            description: "Timeline of suspicious activity and threat detections",
            severity: "INFO",
            data: threatTimeline,
            generated_by: "DETERMINISTIC",
            is_visible: true,
            display_order: 7,
          });
        } else {
          logger.warn(`[INSIGHTS SERVICE] THREAT_TIMELINE validation failed`);
          validationErrors.push({ type: "THREAT_TIMELINE", errors: threatTimelineValidation.errors });
        }
      }

      // ===== GEO_ANALYSIS =====
      logger.info(`[INSIGHTS SERVICE] Generating GEO_ANALYSIS...`);
      const geoAnalysis = this.generateGeoAnalysis(findings);
      if (geoAnalysis.countries && geoAnalysis.countries.length > 0) {
        const geoValidation = insightValidators.validateInsightData(
          "GEO_ANALYSIS",
          geoAnalysis,
        );
        if (geoValidation.valid) {
          insights.push({
            job_id: jobId,
            insight_type: "GEO_ANALYSIS",
            title: "Geographic Analysis",
            description: "Geographic distribution of attack sources",
            data: geoAnalysis,
            generated_by: "DETERMINISTIC",
            is_visible: true,
            display_order: 8,
          });
        } else {
          logger.warn(`[INSIGHTS SERVICE] GEO_ANALYSIS validation failed`);
          validationErrors.push({ type: "GEO_ANALYSIS", errors: geoValidation.errors });
        }
      }

      // ===== ALERT =====
      logger.info(`[INSIGHTS SERVICE] Generating ALERT...`);
      const alerts = this.generateAlerts(findings);
      if (alerts.alerts && alerts.alerts.length > 0) {
        const alertValidation = insightValidators.validateInsightData(
          "ALERT",
          alerts,
        );
        if (alertValidation.valid) {
          insights.push({
            job_id: jobId,
            insight_type: "ALERT",
            title: "Critical Security Alerts",
            description: "Priority security alerts and findings",
            severity: alerts.highest_severity || "MEDIUM",
            data: alerts,
            generated_by: "DETERMINISTIC",
            is_visible: true,
            display_order: 2,
          });
        } else {
          logger.warn(`[INSIGHTS SERVICE] ALERT validation failed`);
          validationErrors.push({ type: "ALERT", errors: alertValidation.errors });
        }
      }

      logger.info(
        `[INSIGHTS SERVICE] Generated ${insights.length} deterministic insights. Validation errors: ${validationErrors.length}`,
      );

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
   * Generate THREAT_TIMELINE from findings.
   *
   * FIX: The previous version used `new Date()` as a fallback when
   * `referenced_logs` was empty (e.g. when log_references was stored as null
   * in the DB). This caused all such findings to cluster at the current time,
   * producing a completely bogus single-point timeline.
   *
   * Fix: Use `finding.detected_at` as a reliable fallback — it is always
   * populated by the DB and reflects when the threat was actually detected.
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

    const bucketSizeMs = 15 * 60 * 1000; // 15-minute buckets
    const bucketMap = new Map<
      string,
      { threat_count: number; severities: Set<string> }
    >();

    for (const finding of findings) {
      // FIX: Prefer the first referenced log's timestamp; fall back to the
      // finding's own detected_at rather than new Date().
      const rawTimestamp =
        finding.referenced_logs[0]?.timestamp ||
        finding.detected_at ||
        new Date();

      const timestamp = new Date(rawTimestamp);
      const bucketStart = new Date(
        Math.floor(timestamp.getTime() / bucketSizeMs) * bucketSizeMs,
      );
      const bucketKey = bucketStart.toISOString();

      const existing = bucketMap.get(bucketKey) || {
        threat_count: 0,
        severities: new Set<string>(),
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
        return { timestamp, threat_count: data.threat_count, severity: topSeverity };
      });

    // Determine time range from the same resolved timestamps
    const resolvedTimestamps = findings.map((f) =>
      new Date(
        f.referenced_logs[0]?.timestamp || f.detected_at || new Date(),
      ).getTime(),
    );
    const minTs = Math.min(...resolvedTimestamps);
    const maxTs = Math.max(...resolvedTimestamps);

    return {
      points,
      total_threats: findings.length,
      time_range: {
        start: new Date(minTs).toISOString(),
        end: new Date(maxTs).toISOString(),
      },
    };
  },

  /**
   * Generate GEO_ANALYSIS from findings.
   * Uses local GeoIP offline lookup to build detailed country and region data.
   */
  generateGeoAnalysis(findings: AnalyzerFindingWithLogs[]): any {
    const countryMap = new Map<
      string,
      {
        country_code: string;
        continent: string;
        request_count: number;
        severity: string;
        regions: Map<string, { request_count: number; severity: string }>;
      }
    >();

    const severityOrder: Record<string, number> = {
      CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0,
    };

    for (const finding of findings) {
      for (const log of finding.referenced_logs) {
        if (log.ip_address) {
          const geo = GeoIPUtil.lookupIP(log.ip_address);
          const countryKey = geo.country || "Unknown";

          const countryData = countryMap.get(countryKey) || {
            country_code: geo.country_code || "UN",
            continent: geo.continent || "Unknown",
            request_count: 0,
            severity: "INFO",
            regions: new Map<string, { request_count: number; severity: string }>(),
          };

          countryData.request_count++;

          const findingSeverity = finding.severity || "INFO";
          if (
            (severityOrder[findingSeverity] || 0) >
            (severityOrder[countryData.severity] || 0)
          ) {
            countryData.severity = findingSeverity;
          }

          const regionKey = geo.region || "Unknown Region";
          const regionData = countryData.regions.get(regionKey) || {
            request_count: 0,
            severity: "INFO",
          };

          regionData.request_count++;
          if (
            (severityOrder[findingSeverity] || 0) >
            (severityOrder[regionData.severity] || 0)
          ) {
            regionData.severity = findingSeverity;
          }

          countryData.regions.set(regionKey, regionData);
          countryMap.set(countryKey, countryData);
        }
      }
    }

    const countries = Array.from(countryMap.entries())
      .map(([countryName, data]) => {
        const regionsArray = Array.from(data.regions.entries())
          .map(([regionName, rData]) => ({
            region: regionName,
            request_count: rData.request_count,
            severity: rData.severity as any,
          }))
          .sort((a, b) => b.request_count - a.request_count);

        return {
          country: countryName,
          country_code: data.country_code,
          request_count: data.request_count,
          severity: data.severity as any,
          regions: regionsArray,
        };
      })
      .sort((a, b) => b.request_count - a.request_count);

    const total_requests = countries.reduce(
      (sum, c) => sum + c.request_count,
      0,
    );

    return { countries, total_requests };
  },

  /**
   * Generate ALERT insights from findings.
   */
  generateAlerts(findings: AnalyzerFindingWithLogs[]): any {
    const criticalAndHighFindings = findings
      .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
      .sort((a, b) => {
        const order: Record<string, number> = { CRITICAL: 0, HIGH: 1 };
        return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
      })
      .slice(0, 10);

    const alerts = criticalAndHighFindings.map((finding) => ({
      title: finding.title || finding.finding_type,
      severity: finding.severity,
      description:
        finding.summary ||
        `${finding.analyzer} detected ${finding.finding_type}`,
      recommendation:
        finding.recommendation || `Review findings from ${finding.analyzer}`,
      // finding_id is a DB UUID — safe to include in the uuid-validated array
      related_findings: [finding.finding_id],
    }));

    const severityOrder: Record<string, number> = {
      CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0,
    };

    const highestSeverity =
      findings.length > 0
        ? findings.reduce((highest, current) =>
            (severityOrder[current.severity] ?? 0) >
            (severityOrder[highest.severity] ?? 0)
              ? current
              : highest,
          ).severity
        : "INFO";

    return { alerts, alert_count: alerts.length, highest_severity: highestSeverity };
  },

  /**
   * Generate ACTIVITY_TIMELINE from normalized logs.
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

    const bucketMap = new Map<string, number>();
    const bucketSizeMs = 5 * 60 * 1000; // 5-minute buckets

    for (const log of logs) {
      const timestamp = new Date(log.timestamp);
      const bucketStart = new Date(
        Math.floor(timestamp.getTime() / bucketSizeMs) * bucketSizeMs,
      );
      const bucketKey = bucketStart.toISOString();
      bucketMap.set(bucketKey, (bucketMap.get(bucketKey) || 0) + 1);
    }

    const points = Array.from(bucketMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([timestamp, count]) => ({ timestamp, event_count: count }));

    const sortedLogs = [...logs].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      points,
      total_events: logs.length,
      time_range: {
        start: new Date(sortedLogs[0].timestamp).toISOString(),
        end: new Date(sortedLogs[sortedLogs.length - 1].timestamp).toISOString(),
      },
    };
  },

  /**
   * Generate SEVERITY_DISTRIBUTION from findings.
   */
  generateSeverityDistribution(
    findings: AnalyzerFindingWithLogs[],
  ): SeverityDistributionInsightData {
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };

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
        percentage: Math.round((count / total) * 100 * 100) / 100,
      }))
      .sort((a, b) => {
        const order: Record<string, number> = {
          CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4,
        };
        return (order[a.severity as string] ?? 5) - (order[b.severity as string] ?? 5);
      });

    return { distribution, total_findings: total };
  },

  /**
   * Generate TOP_ATTACKERS from findings.
   *
   * FIX: The previous version stored usernames and non-IP entity strings in the
   * `ip` field, which caused every TOP_ATTACKERS insight to fail the Zod IPv4
   * regex in TopAttackersInsightSchema and be silently dropped.
   *
   * Strategy:
   * 1. Collect ALL entity identifiers (IPs and usernames) in `attackerMap` so
   *    the counts and severity aggregation remain accurate.
   * 2. When building the final `attackers` array, filter to valid IPv4 addresses
   *    only — these are the entries that pass the validator.
   * 3. Non-IP entities (usernames, hostnames) still reach the LLM via
   *    buildMasterContext which reads from affected_entities directly, so the
   *    LLM context is not degraded.
   *
   * NOTE: If insight.validator.ts is updated to use `z.string().min(1)` for the
   * `ip` field (and the field is renamed to `entity`), this IPv4 filter can be
   * removed and all entity types will be persisted.
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
        last_seen?: Date;
      }
    >();

    for (const finding of findings) {
      // Collect all unique entities involved in this finding
      const entitiesInFinding = new Set<string>();

      // 1. Collect from referenced logs
      for (const log of finding.referenced_logs) {
        if (log.ip_address && log.ip_address !== "unknown") {
          entitiesInFinding.add(log.ip_address);
        }
      }

      // 2. Collect from affected entities
      if (finding.affected_entities) {
        for (const [key, value] of Object.entries(finding.affected_entities)) {
          if (
            key.includes("ip") ||
            key.includes("user") ||
            key.includes("attacker") ||
            key.includes("source")
          ) {
            if (
              typeof value === "string" &&
              value !== "unknown" &&
              value.trim() !== ""
            ) {
              entitiesInFinding.add(value);
            } else if (Array.isArray(value)) {
              value.forEach((v) => {
                if (typeof v === "string" && v !== "unknown" && v.trim() !== "") {
                  entitiesInFinding.add(v);
                }
              });
            }
          }
        }
      }

      // Increment threat count exactly once per unique entity in this finding
      for (const entity of entitiesInFinding) {
        const existing = attackerMap.get(entity) || {
          request_count: 0,
          threat_count: 0,
          severities: new Set<string>(),
        };

        existing.threat_count++;
        existing.severities.add(finding.severity || "INFO");

        // Request count updates based on logs referring to this entity
        const matchingLogs = finding.referenced_logs.filter((log) => log.ip_address === entity);
        existing.request_count += matchingLogs.length;

        for (const log of matchingLogs) {
          if (log.timestamp) {
            if (!existing.last_seen || log.timestamp > existing.last_seen) {
              existing.last_seen = log.timestamp;
            }
          }
        }

        attackerMap.set(entity, existing);
      }
    }

    // Filter to valid IPv4 addresses only before building the final array.
    // This prevents the entire insight from failing Zod validation because of
    // usernames or hostnames stored in the `ip` field.
    const attackers: AttackerInfo[] = Array.from(attackerMap.entries())
      .filter(([identifier]) => IPV4_REGEX.test(identifier))
      .map(([ip, data]) => {
        const severities = Array.from(data.severities);
        const topSeverity = (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].find(
          (s) => severities.includes(s),
        ) || "LOW") as any;

        const attacker: AttackerInfo = {
          ip,
          request_count: data.request_count,
          threat_count: data.threat_count,
          severity: topSeverity,
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
      // total_unique_ips reflects all unique identifiers seen (including non-IPs)
      // to keep the count accurate for display purposes
      total_unique_ips: attackerMap.size,
    };
  },

  /**
   * Generate EVENT_TYPE_DISTRIBUTION from normalized logs.
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
      .slice(0, 15);

    return { distribution, total_events: total };
  },

  /**
   * Generate KPI metrics.
   */
  generateKPIMetrics(findings: AnalyzerFindingWithLogs[], logs: any[]): any {
    const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
    const highCount = findings.filter((f) => f.severity === "HIGH").length;
    const totalThreats = findings.length;
    const uniqueIPs = new Set(
      findings.flatMap((f) =>
        f.referenced_logs.map((l) => l.ip_address).filter(Boolean),
      ),
    ).size;

    return {
      metrics: [
        { label: "Total Threats", value: totalThreats, severity: totalThreats > 0 ? "HIGH" : "INFO" },
        { label: "Critical Alerts", value: criticalCount, severity: criticalCount > 0 ? "CRITICAL" : "INFO" },
        { label: "High Priority", value: highCount, severity: highCount > 0 ? "HIGH" : "INFO" },
        { label: "Unique Attack Sources", value: uniqueIPs, severity: uniqueIPs > 5 ? "HIGH" : "MEDIUM" },
        { label: "Total Events", value: logs.length },
      ],
    };
  },

  /**
   * Build AI context for LLM insight generation.
   * Returns findings (now including evidence), logs, and timeline data.
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
   * Load normalized logs for a job.
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
   * Persist insights to database.
   * Validates each insight immediately before inserting so a bad record
   * from the LLM cannot block the entire batch.
   */
  async persistInsights(insights: InsightRecord[]): Promise<any> {
    logger.info(`[INSIGHTS SERVICE] Persisting ${insights.length} insights...`);

    const createdInsights: any[] = [];
    const skippedInsights: any[] = [];

    for (const insight of insights) {
      try {
        const validation = insightValidators.validateInsightRecord({
          insight_type: insight.insight_type,
          data: insight.data,
        });

        if (!validation.valid) {
          logger.warn(
            `[INSIGHTS SERVICE] Skipping invalid insight: ${insight.insight_type} — ${JSON.stringify(validation.errors)}`,
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
          `[INSIGHTS SERVICE] Error persisting insight ${insight.insight_type}: ${
            error instanceof Error ? error.message : error
          }`,
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