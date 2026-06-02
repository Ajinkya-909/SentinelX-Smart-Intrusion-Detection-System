/**
 * Insights Validator
 * Zod schemas for strict validation of all insight types
 */

import { z } from "zod";

// ==========================================
// COMMON SCHEMAS
// ==========================================

const SeveritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]);
const InsightTypeSchema = z.enum([
  "OVERVIEW",
  "KPI",
  "ALERT",
  "THREAT_SUMMARY",
  "SEVERITY_DISTRIBUTION",
  "ACTIVITY_TIMELINE",
  "THREAT_TIMELINE",
  "TOP_ATTACKERS",
  "RECOMMENDATION",
  "ATTACK_PATTERN",
  "PORT_SCAN_PATTERN",
  "FAILED_LOGIN_ANALYSIS",
  "TRAFFIC_SPIKE",
  "EVENT_TYPE_DISTRIBUTION",
  "GEO_ANALYSIS",
  "SUSPICIOUS_IP_CLUSTER",
  "ANOMALY_SUMMARY",
  "ATTACK_CAMPAIGN",
]);

const GeneratorSchema = z.enum(["LLM", "DETERMINISTIC", "HYBRID"]);

// ==========================================
// INSIGHT DATA SCHEMAS
// ==========================================

export const OverviewInsightSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  threat_level: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  total_threats: z.number().int().nonnegative(),
  affected_systems: z.number().int().nonnegative(),
  key_findings: z.array(z.string().min(1)),
});

export const KPIInsightSchema = z.object({
  metrics: z.array(
    z.object({
      label: z.string().min(1),
      value: z.union([z.number(), z.string()]),
      severity: SeveritySchema.optional(),
      change_percentage: z.number().optional(),
    }),
  ),
});

export const AlertInsightSchema = z.object({
  alerts: z.array(
    z.object({
      title: z.string().min(1),
      severity: SeveritySchema,
      description: z.string().min(1),
      recommendation: z.string().optional(),
      related_findings: z.array(z.string().uuid()).optional(),
    }),
  ),
});

export const ThreatSummaryInsightSchema = z.object({
  overall_threat_classification: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  threat_count: z.number().int().nonnegative(),
  critical_threats: z.number().int().nonnegative(),
  high_threats: z.number().int().nonnegative(),
  summary_narrative: z.string().min(1),
  immediate_concerns: z.array(z.string().min(1)),
});

export const SeverityDistributionInsightSchema = z.object({
  distribution: z.array(
    z.object({
      severity: SeveritySchema,
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  ),
  total_findings: z.number().int().nonnegative(),
});

export const ActivityTimelineInsightSchema = z.object({
  points: z.array(
    z.object({
      timestamp: z.string().datetime(),
      event_count: z.number().int().nonnegative(),
    }),
  ),
  total_events: z.number().int().nonnegative(),
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

export const ThreatTimelineInsightSchema = z.object({
  points: z.array(
    z.object({
      timestamp: z.string().datetime(),
      threat_count: z.number().int().nonnegative(),
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    }),
  ),
  total_threats: z.number().int().nonnegative(),
  peak_time: z.string().datetime().optional(),
  time_range: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
});

export const TopAttackersInsightSchema = z.object({
  attackers: z.array(
    z.object({
      ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
      request_count: z.number().int().nonnegative(),
      threat_count: z.number().int().nonnegative(),
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
      country: z.string().optional(),
      last_seen: z.string().datetime().optional(),
    }),
  ),
  total_unique_ips: z.number().int().nonnegative(),
});

export const RecommendationInsightSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().min(1),
      priority: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
      description: z.string().min(1),
      actions: z.array(z.string().min(1)),
      impact: z.string().optional(),
    }),
  ),
});

export const AttackPatternInsightSchema = z.object({
  pattern_type: z.string().min(1),
  description: z.string().min(1),
  affected_endpoints: z.array(z.string()).optional(),
  attack_flow: z.array(z.string()).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  confidence_score: z.number().min(0).max(1),
  likely_goals: z.array(z.string()).optional(),
});

export const PortScanPatternInsightSchema = z.object({
  scanner_ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
  scanned_ports: z.array(z.number().int().min(1).max(65535)),
  scan_type: z.string().min(1),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  recommendation: z.string().min(1),
  affected_services: z.array(z.string()).optional(),
});

export const FailedLoginAnalysisInsightSchema = z.object({
  total_failed_attempts: z.number().int().nonnegative(),
  unique_source_ips: z.number().int().nonnegative(),
  targeted_accounts: z.array(z.string().min(1)),
  attack_duration: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
  pattern_description: z.string().min(1),
  recommendation: z.string().min(1),
});

export const TrafficSpikeInsightSchema = z.object({
  spike_start: z.string().datetime(),
  spike_end: z.string().datetime().optional(),
  baseline_traffic: z.number().nonnegative(),
  spike_traffic: z.number().nonnegative(),
  spike_percentage: z.number().nonnegative(),
  likely_cause: z.string().optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
});

export const EventTypeDistributionInsightSchema = z.object({
  distribution: z.array(
    z.object({
      event_type: z.string().min(1),
      count: z.number().int().nonnegative(),
      percentage: z.number().min(0).max(100),
    }),
  ),
  total_events: z.number().int().nonnegative(),
});

export const GeoAnalysisInsightSchema = z.object({
  countries: z.array(
    z.object({
      country: z.string().min(1),
      request_count: z.number().int().nonnegative(),
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
      country_code: z.string().optional(),
      regions: z.array(
        z.object({
          region: z.string(),
          request_count: z.number(),
          severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]),
        })
      ).optional(),
    }),
  ),
  total_requests: z.number().int().nonnegative(),
  high_risk_regions: z.array(z.string()).optional(),
});

export const SuspiciousIPClusterInsightSchema = z.object({
  clusters: z.array(
    z.object({
      ips: z.array(
        z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
      ),
      cluster_score: z.number().min(0).max(1),
      behavior_type: z.string().min(1),
      severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
    }),
  ),
  total_suspicious_ips: z.number().int().nonnegative(),
});

export const AnomalyInsightSchema = z.object({
  anomaly_type: z.string().min(1),
  description: z.string().min(1),
  confidence_score: z.number().min(0).max(1),
  affected_entities: z.array(z.string().min(1)),
  deviation_from_baseline: z.string().optional(),
  recommended_action: z.string().min(1),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
});

export const AttackCampaignInsightSchema = z.object({
  campaign_name: z.string().min(1),
  campaign_description: z.string().min(1),
  estimated_start: z.string().datetime(),
  estimated_end: z.string().datetime().optional(),
  participating_ips: z.array(
    z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/, "Invalid IP address"),
  ),
  attack_stages: z.array(z.string().min(1)),
  objectives: z.array(z.string()).optional(),
  severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]),
});

// ==========================================
// INSIGHT RECORD VALIDATION SCHEMA
// ==========================================

/**
 * Master schema for complete insight records
 * Validates insight_type and corresponding data payload together
 */
export const InsightRecordSchema = z.discriminatedUnion("insight_type", [
  z.object({
    insight_type: z.literal("OVERVIEW"),
    data: OverviewInsightSchema,
  }),
  z.object({
    insight_type: z.literal("KPI"),
    data: KPIInsightSchema,
  }),
  z.object({
    insight_type: z.literal("ALERT"),
    data: AlertInsightSchema,
  }),
  z.object({
    insight_type: z.literal("THREAT_SUMMARY"),
    data: ThreatSummaryInsightSchema,
  }),
  z.object({
    insight_type: z.literal("SEVERITY_DISTRIBUTION"),
    data: SeverityDistributionInsightSchema,
  }),
  z.object({
    insight_type: z.literal("ACTIVITY_TIMELINE"),
    data: ActivityTimelineInsightSchema,
  }),
  z.object({
    insight_type: z.literal("THREAT_TIMELINE"),
    data: ThreatTimelineInsightSchema,
  }),
  z.object({
    insight_type: z.literal("TOP_ATTACKERS"),
    data: TopAttackersInsightSchema,
  }),
  z.object({
    insight_type: z.literal("RECOMMENDATION"),
    data: RecommendationInsightSchema,
  }),
  z.object({
    insight_type: z.literal("ATTACK_PATTERN"),
    data: AttackPatternInsightSchema,
  }),
  z.object({
    insight_type: z.literal("PORT_SCAN_PATTERN"),
    data: PortScanPatternInsightSchema,
  }),
  z.object({
    insight_type: z.literal("FAILED_LOGIN_ANALYSIS"),
    data: FailedLoginAnalysisInsightSchema,
  }),
  z.object({
    insight_type: z.literal("TRAFFIC_SPIKE"),
    data: TrafficSpikeInsightSchema,
  }),
  z.object({
    insight_type: z.literal("EVENT_TYPE_DISTRIBUTION"),
    data: EventTypeDistributionInsightSchema,
  }),
  z.object({
    insight_type: z.literal("GEO_ANALYSIS"),
    data: GeoAnalysisInsightSchema,
  }),
  z.object({
    insight_type: z.literal("SUSPICIOUS_IP_CLUSTER"),
    data: SuspiciousIPClusterInsightSchema,
  }),
  z.object({
    insight_type: z.literal("ANOMALY_SUMMARY"),
    data: AnomalyInsightSchema,
  }),
  z.object({
    insight_type: z.literal("ATTACK_CAMPAIGN"),
    data: AttackCampaignInsightSchema,
  }),
]);

// ==========================================
// VALIDATOR FUNCTIONS
// ==========================================

export const insightValidators = {
  /**
   * Validate insight data by type
   * @param insightType - Type of insight
   * @param data - Insight data payload
   * @returns Validation result
   */
  validateInsightData(insightType: string, data: any) {
    try {
      const result = InsightRecordSchema.parse({
        insight_type: insightType,
        data,
      });
      return {
        valid: true,
        data: result.data,
        errors: null,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          data: null,
          errors: error.issues.map((e: any) => ({
            path: e.path.join("."),
            message: e.message,
            code: e.code,
          })),
        };
      }
      return {
        valid: false,
        data: null,
        errors: [{ message: "Unknown validation error" }],
      };
    }
  },

  /**
   * Validate complete insight record
   */
  validateInsightRecord(record: any) {
    try {
      const validated = InsightRecordSchema.parse(record);
      return {
        valid: true,
        data: validated,
        errors: null,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          data: null,
          errors: error.issues.map((e: any) => ({
            path: e.path.join("."),
            message: e.message,
            code: e.code,
          })),
        };
      }
      return {
        valid: false,
        data: null,
        errors: [{ message: "Unknown validation error" }],
      };
    }
  },
};
