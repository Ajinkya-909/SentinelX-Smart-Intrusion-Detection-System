// src/types/insight.ts

export type InsightType =
  | 'OVERVIEW'
  | 'KPI'
  | 'ALERT'
  | 'THREAT_SUMMARY'
  | 'SEVERITY_DISTRIBUTION'
  | 'ACTIVITY_TIMELINE'
  | 'THREAT_TIMELINE'
  | 'EVENT_TYPE_DISTRIBUTION'
  | 'TOP_ATTACKERS'
  | 'GEO_ANALYSIS'
  | 'ATTACK_PATTERN'
  | 'PORT_SCAN_PATTERN'
  | 'FAILED_LOGIN_ANALYSIS'
  | 'TRAFFIC_SPIKE'
  | 'SUSPICIOUS_IP_CLUSTER'
  | 'ANOMALY_SUMMARY'
  | 'ATTACK_CAMPAIGN'
  | 'RECOMMENDATION';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type InsightGenerator = 'LLM' | 'DETERMINISTIC' | 'HYBRID';

// --- Specific Data Payloads based on insights (2).json ---

export interface KPIInsightData {
  metrics: Array<{
    label: string;
    value: number;
    severity?: Severity;
  }>;
}

export interface OverviewInsightData {
  summary: string;
  threat_level: Severity;
  total_threats: number;
  affected_systems: number;
  key_findings: string[];
}

export interface DistributionInsightData {
  distribution: Array<{
    count: number;
    percentage: number;
    severity?: Severity;
    event_type?: string;
  }>;
  total_findings?: number;
  total_events?: number;
}

export interface TimelineInsightData {
  points: Array<{
    timestamp: string;
    event_count?: number;
    threat_count?: number;
    severity?: Severity;
  }>;
  time_range: { start: string; end: string };
  total_events?: number;
  total_threats?: number;
}

export interface AlertInsightData {
  alerts: Array<{
    title: string;
    severity: Severity;
    description: string;
    recommendation: string;
    related_findings: string[];
  }>;
  alert_count: number;
  highest_severity: Severity;
}

export interface RecommendationInsightData {
  recommendations: Array<{
    title: string;
    priority: Severity;
    description: string;
    actions: string[];
    impact: string;
  }>;
}

export interface ThreatSummaryInsightData {
  overall_threat_classification: Severity;
  threat_count: number;
  critical_threats: number;
  high_threats: number;
  summary_narrative: string;
  immediate_concerns: string[];
}

export interface AttackPatternInsightData {
  pattern_type: string;
  description: string;
  affected_endpoints: string[];
  attack_flow: string[];
  severity: Severity;
  confidence_score: number;
  likely_goals: string[];
}

export interface AnomalySummaryInsightData {
  anomaly_type: string;
  description: string;
  confidence_score: number;
  affected_entities: string[];
  deviation_from_baseline: string;
  recommended_action: string;
  severity: Severity;
}

// --- The Core Insight Record ---
export interface InsightRecord<T = any> {
  id: string;
  job_id: string;
  type: InsightType;
  insight_type: InsightType;
  title: string | null;
  description: string | null;
  severity: Severity | null;
  priority_score: number | null;
  confidence_score: number | null;
  data: T; // This will be cast to one of the specific data interfaces above
  generated_by: InsightGenerator;
  model_name: string | null;
  generation_version: string | null;
  finding_references: any | null;
  log_references: any | null;
  is_visible: boolean;
  display_order: number;
  metadata: any | null;
  created_at: string;
  updated_at: string;
}

// API Response Wrappers
export interface PaginatedResponse<T> {
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  message?: string;
  progress?: number;
  error?: string;
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
  [key: string]: any; // Allow for dynamic keys like 'insights' or 'findings'
}

export interface InsightsResponse extends PaginatedResponse<any> {
  insights: InsightRecord[];
}