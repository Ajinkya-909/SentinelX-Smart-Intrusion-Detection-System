import { InsightRecord } from "@/types/insight";

export const mockInsights: InsightRecord[] = [
  // 1. KPI Metrics
  {
    id: "insight-kpi",
    job_id: "demo-job-id",
    type: "KPI",
    insight_type: "KPI",
    title: "Key Performance Indicators",
    description: "Critical security metrics and indicators",
    severity: "CRITICAL",
    priority_score: 9.5,
    confidence_score: 0.98,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 1,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      metrics: [
        { label: "Total Events Analysed", value: 52834, severity: "INFO" },
        { label: "Identified Threats", value: 1428, severity: "CRITICAL" },
        { label: "Active Security Alerts", value: 18, severity: "CRITICAL" },
        { label: "Unique Attack Sources", value: 34, severity: "HIGH" },
        { label: "Engine Coverage Ratio", value: 100, severity: "INFO" }
      ]
    }
  },

  // 2. Activity Timeline
  {
    id: "insight-activity-timeline",
    job_id: "demo-job-id",
    type: "ACTIVITY_TIMELINE",
    insight_type: "ACTIVITY_TIMELINE",
    title: "Activity Timeline",
    description: "Timeline of all normalized log events showing system activity over time",
    severity: "INFO",
    priority_score: 5.0,
    confidence_score: 0.95,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 5,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      points: [
        { timestamp: "2026-06-04T14:00:00.000Z", event_count: 2150 },
        { timestamp: "2026-06-04T14:05:00.000Z", event_count: 2430 },
        { timestamp: "2026-06-04T14:10:00.000Z", event_count: 3100 },
        { timestamp: "2026-06-04T14:15:00.000Z", event_count: 4980 },
        { timestamp: "2026-06-04T14:20:00.000Z", event_count: 8520 }, // Spike starts
        { timestamp: "2026-06-04T14:25:00.000Z", event_count: 14200 }, // Peak
        { timestamp: "2026-06-04T14:30:00.000Z", event_count: 6710 },
        { timestamp: "2026-06-04T14:35:00.000Z", event_count: 4320 },
        { timestamp: "2026-06-04T14:40:00.000Z", event_count: 2890 },
        { timestamp: "2026-06-04T14:45:00.000Z", event_count: 1870 },
        { timestamp: "2026-06-04T14:50:00.000Z", event_count: 1100 },
        { timestamp: "2026-06-04T14:55:00.000Z", event_count: 564 }
      ],
      total_events: 52834,
      time_range: {
        start: "2026-06-04T14:00:00.000Z",
        end: "2026-06-04T14:55:00.000Z"
      }
    }
  },

  // 3. Top Attackers
  {
    id: "insight-top-attackers",
    job_id: "demo-job-id",
    type: "TOP_ATTACKERS",
    insight_type: "TOP_ATTACKERS",
    title: "Top Attackers",
    description: "Most suspicious IPs and entities by threat count",
    severity: "CRITICAL",
    priority_score: 9.0,
    confidence_score: 0.97,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 4,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      attackers: [
        { ip: "185.220.101.4", request_count: 832, threat_count: 543, severity: "CRITICAL" },
        { ip: "220.181.108.52", request_count: 642, threat_count: 421, severity: "CRITICAL" },
        { ip: "109.244.12.8", request_count: 412, threat_count: 231, severity: "HIGH" },
        { ip: "82.165.10.144", request_count: 245, threat_count: 110, severity: "HIGH" },
        { ip: "203.0.113.19", request_count: 120, threat_count: 28, severity: "MEDIUM" },
        { ip: "198.51.100.45", request_count: 85, threat_count: 12, severity: "LOW" }
      ],
      total_unique_ips: 34
    }
  },

  // 4. Event Type Distribution
  {
    id: "insight-event-distribution",
    job_id: "demo-job-id",
    type: "EVENT_TYPE_DISTRIBUTION",
    insight_type: "EVENT_TYPE_DISTRIBUTION",
    title: "Event Type Distribution",
    description: "Distribution of log events by type",
    severity: "HIGH",
    priority_score: 7.5,
    confidence_score: 0.94,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 6,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      distribution: [
        { event_type: "SQL_INJECTION", count: 543, percentage: 38.0 },
        { event_type: "PATH_TRAVERSAL", count: 421, percentage: 29.5 },
        { event_type: "BRUTE_FORCE", count: 231, percentage: 16.2 },
        { event_type: "PRIVILEGE_ESCALATION", count: 110, percentage: 7.7 },
        { event_type: "ANOMALOUS_TRAFFIC", count: 95, percentage: 6.7 },
        { event_type: "SCANNER_BOT", count: 28, percentage: 1.9 }
      ],
      total_events: 1428
    }
  },

  // 5. Severity Distribution
  {
    id: "insight-severity-distribution",
    job_id: "demo-job-id",
    type: "SEVERITY_DISTRIBUTION",
    insight_type: "SEVERITY_DISTRIBUTION",
    title: "Threat Severity Distribution",
    description: "Distribution of findings by severity level",
    severity: "CRITICAL",
    priority_score: 8.0,
    confidence_score: 0.99,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 3,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      distribution: [
        { severity: "CRITICAL", count: 18, percentage: 1.26 },
        { severity: "HIGH", count: 522, percentage: 36.55 },
        { severity: "MEDIUM", count: 645, percentage: 45.17 },
        { severity: "LOW", count: 193, percentage: 13.52 },
        { severity: "INFO", count: 50, percentage: 3.50 }
      ],
      total_findings: 1428
    }
  },

  // 6. Attack Pattern
  {
    id: "insight-attack-pattern",
    job_id: "demo-job-id",
    type: "ATTACK_PATTERN",
    insight_type: "ATTACK_PATTERN",
    title: "Attack Pattern Analysis",
    description: "Multi-stage attack pattern correlation",
    severity: "CRITICAL",
    priority_score: 9.2,
    confidence_score: 0.96,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 9,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      pattern_type: "Multi-stage Authentication Bypass & Privilege Gain",
      description: "Visual and analytical correlation suggests an initial automated bot probe followed by targeted SQLi and Path Traversal exploits seeking database schema disclosure and root configuration file reads.",
      affected_endpoints: ["/api/auth/login", "/api/users/profile", "/api/documents/fetch"],
      attack_flow: [
        "Mass scanning of '/api' endpoints with user-agent signatures indicative of automated tools.",
        "Credential stuffing campaign against '/api/auth/login' targeting high-privilege usernames.",
        "Transition to Blind SQL Injection on database validation parameters to bypass auth constraints.",
        "Directory traversal payloads targeting '/etc/passwd' and '.env' configuration files."
      ],
      severity: "CRITICAL",
      confidence_score: 0.96,
      likely_goals: ["Database Extraction", "Privilege Escalation", "Config Access"]
    }
  },

  // 7. Threat Timeline
  {
    id: "insight-threat-timeline",
    job_id: "demo-job-id",
    type: "THREAT_TIMELINE",
    insight_type: "THREAT_TIMELINE",
    title: "Threat Timeline",
    description: "Timeline of suspicious activity and threat detections",
    severity: "INFO",
    priority_score: 6.0,
    confidence_score: 0.95,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 7,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      points: [
        { timestamp: "2026-06-04T14:00:00.000Z", threat_count: 5, severity: "LOW" },
        { timestamp: "2026-06-04T14:05:00.000Z", threat_count: 12, severity: "LOW" },
        { timestamp: "2026-06-04T14:10:00.000Z", threat_count: 45, severity: "MEDIUM" },
        { timestamp: "2026-06-04T14:15:00.000Z", threat_count: 98, severity: "HIGH" },
        { timestamp: "2026-06-04T14:20:00.000Z", threat_count: 320, severity: "CRITICAL" },
        { timestamp: "2026-06-04T14:25:00.000Z", threat_count: 543, severity: "CRITICAL" }, // Peak threats
        { timestamp: "2026-06-04T14:30:00.000Z", threat_count: 220, severity: "CRITICAL" },
        { timestamp: "2026-06-04T14:35:00.000Z", threat_count: 110, severity: "HIGH" },
        { timestamp: "2026-06-04T14:40:00.000Z", threat_count: 45, severity: "MEDIUM" },
        { timestamp: "2026-06-04T14:45:00.000Z", threat_count: 20, severity: "MEDIUM" },
        { timestamp: "2026-06-04T14:50:00.000Z", threat_count: 8, severity: "LOW" },
        { timestamp: "2026-06-04T14:55:00.000Z", threat_count: 2, severity: "INFO" }
      ],
      total_threats: 1428,
      time_range: {
        start: "2026-06-04T14:00:00.000Z",
        end: "2026-06-04T14:55:00.000Z"
      }
    }
  },

  // 8. Alerts Feed
  {
    id: "insight-alerts",
    job_id: "demo-job-id",
    type: "ALERT",
    insight_type: "ALERT",
    title: "Critical Security Alerts",
    description: "Priority security alerts and findings",
    severity: "CRITICAL",
    priority_score: 9.8,
    confidence_score: 0.98,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 2,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      alerts: [
        {
          title: "Critical SQL Injection Payload Detected",
          severity: "CRITICAL",
          description: "Database queries with SQL validation patterns bypass attempt detected on endpoint '/api/auth/login'.",
          recommendation: "Review backend input validation, use prepared statements / parameterized queries, and block source IP 185.220.101.4.",
          related_findings: ["finding-1"]
        },
        {
          title: "Privilege Escalation Attempt",
          severity: "HIGH",
          description: "Multiple failed authentication requests followed by admin parameter manipulation attempts.",
          recommendation: "Enforce multi-factor authentication (MFA) and lock accounts exceeding 5 authentication failures.",
          related_findings: ["finding-2"]
        },
        {
          title: "Directory Traversal Attack Pattern",
          severity: "HIGH",
          description: "File retrieval query payloads containing system configuration folder patterns (e.g. '../../etc/passwd').",
          recommendation: "Ensure file access APIs sanitize path characters and restrict permissions to web root folders.",
          related_findings: ["finding-3"]
        }
      ],
      alert_count: 3,
      highest_severity: "CRITICAL"
    }
  },

  // 9. Executive Overview
  {
    id: "insight-overview",
    job_id: "demo-job-id",
    type: "OVERVIEW",
    insight_type: "OVERVIEW",
    title: "Executive Summary",
    description: "High-level summary of analysis results",
    severity: "CRITICAL",
    priority_score: 9.0,
    confidence_score: 0.96,
    generated_by: "LLM",
    model_name: "Claude 3.5 Sonnet",
    generation_version: "v1.0",
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 10,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      summary: "SentinelX completed analysis of system logs. A total of 1,428 malicious events were detected, indicating a coordinated penetration attempt. Primary targets include API authentication gateways and configuration files. Corrective actions should be taken immediately.",
      threat_level: "CRITICAL",
      total_threats: 1428,
      affected_systems: 3,
      key_findings: [
        "Coordinated database probing through blind SQL injection syntax.",
        "1,200% volumetric activity spike indicating active scanner bot utility.",
        "Geographic routing clustering attacks from Russian and Chinese proxy subnets.",
        "Directory traversal attacks seeking access to OS user lists."
      ]
    }
  },

  // 10. Threat Summary Narrative
  {
    id: "insight-threat-summary",
    job_id: "demo-job-id",
    type: "THREAT_SUMMARY",
    insight_type: "THREAT_SUMMARY",
    title: "Threat Summary Narrative",
    description: "Detailed threat description and concerns",
    severity: "CRITICAL",
    priority_score: 8.8,
    confidence_score: 0.95,
    generated_by: "LLM",
    model_name: "Claude 3.5 Sonnet",
    generation_version: "v1.0",
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 11,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      overall_threat_classification: "CRITICAL",
      threat_count: 1428,
      critical_threats: 18,
      high_threats: 522,
      summary_narrative: "The security analysis indicates a deliberate and highly targeted attack. The correlation engine detected a classic penetration lifecycle starting from active information gathering to active database exploitation attempts.",
      immediate_concerns: [
        "Unauthenticated admin privileges were targeted repeatedly.",
        "System configuration file exposure attempts detected via Path Traversal."
      ]
    }
  },

  // 11. Anomaly Summary Card
  {
    id: "insight-anomaly-summary",
    job_id: "demo-job-id",
    type: "ANOMALY_SUMMARY",
    insight_type: "ANOMALY_SUMMARY",
    title: "Anomaly Analysis Summary",
    description: "Statistical and ML anomaly detection summary",
    severity: "HIGH",
    priority_score: 8.5,
    confidence_score: 0.98,
    generated_by: "HYBRID",
    model_name: "Isolation Forest / Z-Score",
    generation_version: "v1.0",
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 12,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      anomaly_type: "API Volumetric Abuse",
      description: "Request volume on path '/api/auth/login' deviated significantly from typical activity baselines, suggesting a script-driven brute-force attack.",
      confidence_score: 0.98,
      affected_entities: ["/api/auth/login", "Authentication Server"],
      deviation_from_baseline: "12x normal peak request volume",
      recommended_action: "Implement strict IP-based rate limiting on auth endpoints and enable CAPTCHA challenge scripts.",
      severity: "HIGH"
    }
  },

  // 12. Recommendations / Remediation List
  {
    id: "insight-recommendations",
    job_id: "demo-job-id",
    type: "RECOMMENDATION",
    insight_type: "RECOMMENDATION",
    title: "Remediation Action Plan",
    description: "Prioritized recommendations for threat mitigation",
    severity: "CRITICAL",
    priority_score: 9.7,
    confidence_score: 0.97,
    generated_by: "LLM",
    model_name: "Claude 3.5 Sonnet",
    generation_version: "v1.0",
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 13,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      recommendations: [
        {
          title: "Deploy Parameterized Queries",
          priority: "CRITICAL",
          description: "Replace standard dynamic SQL concatenation with parameterized inputs on auth validation handlers to completely stop SQL injection vectors.",
          actions: [
            "Refactor database handlers in '/controllers/auth.controller.ts'",
            "Enable dynamic typing on SQL driver parameters"
          ],
          impact: "Closes 100% of SQL injection vulnerability doors."
        },
        {
          title: "Enforce Endpoint Rate Limiting",
          priority: "HIGH",
          description: "Apply temporary blocks to IP addresses making volumetric requests exceeding standard API client profiles.",
          actions: [
            "Integrate rate-limit middleware to main router",
            "Set max auth page hits to 5 failures per minute"
          ],
          impact: "Blocks automated brute-force scans and lowers CPU database pressure by 80%."
        },
        {
          title: "Restrict File Path Access",
          priority: "HIGH",
          description: "Configure system directory path blacklists on document fetch APIs to prevent unauthorized reading of server settings.",
          actions: [
            "Validate file requests using secure whitelist mapping",
            "Ensure user process runs under low privilege daemon account"
          ],
          impact: "Mitigates directory traversal risk to zero."
        }
      ]
    }
  },

  // 13. Geo Analysis Map
  {
    id: "insight-geo-analysis",
    job_id: "demo-job-id",
    type: "GEO_ANALYSIS",
    insight_type: "GEO_ANALYSIS",
    title: "Geographic Origin Breakdown",
    description: "Geographic distribution of attack sources and severity",
    severity: "CRITICAL",
    priority_score: 8.9,
    confidence_score: 0.95,
    generated_by: "DETERMINISTIC",
    model_name: null,
    generation_version: null,
    finding_references: null,
    log_references: null,
    is_visible: true,
    display_order: 8,
    metadata: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    data: {
      countries: [
        {
          country: "China",
          country_code: "CN",
          request_count: 543,
          severity: "CRITICAL",
          regions: [
            { region: "Beijing", request_count: 260, severity: "CRITICAL" },
            { region: "Shanghai", request_count: 283, severity: "HIGH" }
          ]
        },
        {
          country: "Russia",
          country_code: "RU",
          request_count: 421,
          severity: "CRITICAL",
          regions: [
            { region: "Moscow", request_count: 271, severity: "CRITICAL" },
            { region: "Saint Petersburg", request_count: 150, severity: "HIGH" }
          ]
        },
        {
          country: "Netherlands",
          country_code: "NL",
          request_count: 231,
          severity: "HIGH",
          regions: [
            { region: "Amsterdam", request_count: 231, severity: "HIGH" }
          ]
        },
        {
          country: "India",
          country_code: "IN",
          request_count: 120,
          severity: "MEDIUM",
          regions: [
            { region: "Bengaluru", request_count: 80, severity: "MEDIUM" },
            { region: "Mumbai", request_count: 40, severity: "LOW" }
          ]
        },
        {
          country: "United States",
          country_code: "US",
          request_count: 85,
          severity: "LOW",
          regions: [
            { region: "Virginia", request_count: 50, severity: "LOW" },
            { region: "California", request_count: 35, severity: "LOW" }
          ]
        },
        {
          country: "Germany",
          country_code: "DE",
          request_count: 28,
          severity: "LOW",
          regions: [
            { region: "Frankfurt", request_count: 28, severity: "LOW" }
          ]
        }
      ],
      total_requests: 1428
    }
  }
];
