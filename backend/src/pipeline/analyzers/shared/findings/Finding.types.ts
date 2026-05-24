import { FindingSeverity } from "./FindingSeverity";

export type FindingType =
  | "BRUTE_FORCE_AUTH"
  | "RAPID_AUTH_VELOCITY"
  | "ACCOUNT_TAKEOVER_INDICATOR"
  | "IMPOSSIBLE_IP_VELOCITY"
  | "PRIVILEGE_ESCALATION_ATTEMPT"
  | "MALICIOUS_PAYLOAD_SQL_INJECTION"
  | "MALICIOUS_PAYLOAD_XSS"
  | "MALICIOUS_PAYLOAD_PATH_TRAVERSAL"
  | "SCANNER_BOT_DETECTED"
  | "DANGEROUS_FILE_UPLOAD"
  | "REQUEST_SPIKE"
  | "ERROR_RATE_SPIKE"
  | "DATA_TRANSFER_SPIKE"
  | "ENDPOINT_DIVERSITY_SPIKE"
  | "CRITICAL_EVENT_SPIKE"
  | "RAPID_BURST"
  | "RECONNAISSANCE_BURST"
  | "OFF_HOURS_ADMIN_ACCESS"
  | "MIDNIGHT_ACCESS"
  | "LONG_SESSION"
  | "ABNORMAL_INTERVALS"
  | "RECON_EXPLOITATION_CHAIN"
  | "DATA_EXFILTRATION_CHAIN"
  | "LATERAL_MOVEMENT"
  | "PRIVILEGE_ESCALATION_CHAIN"
  | "SESSION_HIJACKING"
  | "ANOMALOUS_BEHAVIOR"
  | "BEHAVIORAL_OUTLIER"
  | "PATTERN_DEVIATION";

export interface AnalyzerFinding {
  id?: string;
  jobId: string;
  analyzer: "rule" | "statistical" | "temporal" | "correlation" | "ml";
  finding_type: FindingType;
  severity: FindingSeverity;
  confidence: number; // 0.0 - 1.0
  title: string;
  summary: string;
  description?: string | undefined;

  // Evidence & Context
  log_references: string[]; // array of normalized_log IDs
  affected_entities: {
    username?: string;
    ip_address?: string;
    endpoint?: string;
    file_name?: string;
    [key: string]: any;
  };
  evidence: Record<string, any>;
  metadata: {
    rule_id?: string;
    rule_version?: string;
    trigger_threshold?: number;
    actual_count?: number;
    [key: string]: any;
  };

  recommendation: string;
  timestamp: Date;
  createdAt?: Date;
}

export interface AnalyzerResult {
  analyzer: "rule" | "statistical" | "temporal" | "correlation" | "ml";
  findings: AnalyzerFinding[];
  executionTime: number; // ms
  status: "success" | "error";
  error?: string;
}
