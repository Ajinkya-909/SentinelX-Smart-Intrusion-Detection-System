/**
 * Insight Data Type Definitions
 * Defines structured payloads for each insight type
 */

// ==========================================
// OVERVIEW INSIGHT
// ==========================================

export interface OverviewInsightData {
  summary: string;
  threat_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  total_threats: number;
  affected_systems: number;
  key_findings: string[];
}

// ==========================================
// KPI INSIGHT
// ==========================================

export interface KPIMetric {
  label: string;
  value: number | string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  change_percentage?: number;
}

export interface KPIInsightData {
  metrics: KPIMetric[];
}

// ==========================================
// ALERT INSIGHT
// ==========================================

export interface AlertItem {
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  description: string;
  recommendation?: string;
  related_findings?: string[]; // Finding IDs
}

export interface AlertInsightData {
  alerts: AlertItem[];
}

// ==========================================
// THREAT SUMMARY INSIGHT
// ==========================================

export interface ThreatSummaryInsightData {
  overall_threat_classification: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  threat_count: number;
  critical_threats: number;
  high_threats: number;
  summary_narrative: string;
  immediate_concerns: string[];
}

// ==========================================
// SEVERITY DISTRIBUTION INSIGHT
// ==========================================

export interface SeverityDistributionItem {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  count: number;
  percentage: number;
}

export interface SeverityDistributionInsightData {
  distribution: SeverityDistributionItem[];
  total_findings: number;
}

// ==========================================
// ACTIVITY TIMELINE INSIGHT
// ==========================================

export interface TimelinePoint {
  timestamp: string; // ISO8601
  event_count: number;
}

export interface ActivityTimelineInsightData {
  points: TimelinePoint[];
  total_events: number;
  time_range: {
    start: string;
    end: string;
  };
}

// ==========================================
// THREAT TIMELINE INSIGHT
// ==========================================

export interface ThreatTimelinePoint {
  timestamp: string; // ISO8601
  threat_count: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface ThreatTimelineInsightData {
  points: ThreatTimelinePoint[];
  total_threats: number;
  peak_time?: string;
  time_range: {
    start: string;
    end: string;
  };
}

// ==========================================
// TOP ATTACKERS INSIGHT
// ==========================================

export interface AttackerInfo {
  ip: string;
  request_count: number;
  threat_count: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  country?: string;
  last_seen?: string;
}

export interface TopAttackersInsightData {
  attackers: AttackerInfo[];
  total_unique_ips: number;
}

// ==========================================
// RECOMMENDATION INSIGHT
// ==========================================

export interface RecommendationItem {
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  actions: string[];
  impact?: string;
}

export interface RecommendationInsightData {
  recommendations: RecommendationItem[];
}

// ==========================================
// ATTACK PATTERN INSIGHT
// ==========================================

export interface AttackPatternInsightData {
  pattern_type: string;
  description: string;
  affected_endpoints?: string[];
  attack_flow?: string[];
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence_score: number;
  likely_goals?: string[];
}

// ==========================================
// PORT SCAN PATTERN INSIGHT
// ==========================================

export interface PortScanPatternInsightData {
  scanner_ip: string;
  scanned_ports: number[];
  scan_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendation: string;
  affected_services?: string[];
}

// ==========================================
// FAILED LOGIN ANALYSIS INSIGHT
// ==========================================

export interface FailedLoginAnalysisInsightData {
  total_failed_attempts: number;
  unique_source_ips: number;
  targeted_accounts: string[];
  attack_duration?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  pattern_description: string;
  recommendation: string;
}

// ==========================================
// TRAFFIC SPIKE INSIGHT
// ==========================================

export interface TrafficSpikeInsightData {
  spike_start: string; // ISO8601
  spike_end?: string;
  baseline_traffic: number;
  spike_traffic: number;
  spike_percentage: number;
  likely_cause?: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
}

// ==========================================
// EVENT TYPE DISTRIBUTION INSIGHT
// ==========================================

export interface EventTypeItem {
  event_type: string;
  count: number;
  percentage: number;
}

export interface EventTypeDistributionInsightData {
  distribution: EventTypeItem[];
  total_events: number;
}

// ==========================================
// GEO ANALYSIS INSIGHT
// ==========================================

export interface GeoCountryData {
  country: string;
  request_count: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
}

export interface GeoAnalysisInsightData {
  countries: GeoCountryData[];
  total_requests: number;
  high_risk_regions?: string[];
}

// ==========================================
// SUSPICIOUS IP CLUSTER INSIGHT
// ==========================================

export interface IPCluster {
  ips: string[];
  cluster_score: number;
  behavior_type: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface SuspiciousIPClusterInsightData {
  clusters: IPCluster[];
  total_suspicious_ips: number;
}

// ==========================================
// ANOMALY SUMMARY INSIGHT
// ==========================================

export interface AnomalyInsightData {
  anomaly_type: string;
  description: string;
  confidence_score: number;
  affected_entities: string[];
  deviation_from_baseline?: string;
  recommended_action: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

// ==========================================
// ATTACK CAMPAIGN INSIGHT
// ==========================================

export interface AttackCampaignInsightData {
  campaign_name: string;
  campaign_description: string;
  estimated_start: string;
  estimated_end?: string;
  participating_ips: string[];
  attack_stages: string[];
  objectives?: string[];
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

// ==========================================
// UNION TYPE FOR ALL INSIGHT DATA
// ==========================================

export type InsightDataPayload =
  | OverviewInsightData
  | KPIInsightData
  | AlertInsightData
  | ThreatSummaryInsightData
  | SeverityDistributionInsightData
  | ActivityTimelineInsightData
  | ThreatTimelineInsightData
  | TopAttackersInsightData
  | RecommendationInsightData
  | AttackPatternInsightData
  | PortScanPatternInsightData
  | FailedLoginAnalysisInsightData
  | TrafficSpikeInsightData
  | EventTypeDistributionInsightData
  | GeoAnalysisInsightData
  | SuspiciousIPClusterInsightData
  | AnomalyInsightData
  | AttackCampaignInsightData;

// ==========================================
// INSIGHT RECORD INTERFACE
// ==========================================

export interface InsightRecord {
  id?: string;
  job_id: string;
  insight_type: string;
  title?: string;
  description?: string;
  severity?: string;
  priority_score?: number;
  confidence_score?: number;
  data: InsightDataPayload;
  generated_by: "LLM" | "DETERMINISTIC" | "HYBRID";
  model_name?: string;
  generation_version?: string;
  finding_references?: any;
  log_references?: any;
  is_visible?: boolean;
  display_order?: number;
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
}
