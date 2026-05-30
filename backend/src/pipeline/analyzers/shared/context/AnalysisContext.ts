// Define the new nested metadata structure so the Analyzers know what they are looking at
export interface NormalizedLogMetadata {
  action?: { type?: string; endpoint?: string; method?: string; success?: boolean; error?: string };
  actor?: { username?: string; sessionId?: string };
  request?: { statusCode?: number; url?: string; headers?: any };
  security?: { authenticated?: boolean; authSuccess?: boolean; failureReason?: string };
  client?: { ipAddress?: string; userAgent?: string };
  parserMetadata?: { bytes?: number; wrapper?: string; original_json?: any; [key: string]: any };
  raw: string;
}

export interface NormalizedLog {
  id: string;         // Added by DB
  job_id: string;     // Matches DB schema
  timestamp: string | Date;
  source: string;     // e.g., NGINX_ACCESS, SYSLOG
  event_type: string; // e.g., HTTP_GET, LOGIN_FAILED
  ip_address: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  metadata: NormalizedLogMetadata;
  message?: string;   // Optional fallback
}

export interface EventSequence {
  entityId: string;
  events: NormalizedLog[];
  startTime: Date;
  endTime: Date;
  eventTypes: Set<string>;
  hasPayloads: boolean;
  hasAdminAccess: boolean;
}

export interface SessionGroup {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  ipAddresses: Set<string>;
  userAgents: Set<string>;
  events: NormalizedLog[];
}

export interface EndpointAccessRecord {
  endpoint: string;
  count: number;
  firstAccess: Date;
  lastAccess: Date;
  successCount: number;
  failureCount: number;
  statusCodes: Set<number>;
}

export interface ErrorRecord {
  eventType: string;
  count: number;
  timestamp: Date;
  logs: NormalizedLog[];
}

export interface AnalysisContext {
  logs: NormalizedLog[];
  jobId: string;
  entityTimelines: Map<string, NormalizedLog[]>;
  eventSequences: Map<string, EventSequence[]>;
  sessions: SessionGroup[];
  endpointAccess: Map<string, EndpointAccessRecord[]>;
  timeBuckets: Map<string, NormalizedLog[]>;
  userIpMappings: Map<string, Set<string>>;
  ipUserMappings: Map<string, Set<string>>;
  errorPatterns: Map<string, ErrorRecord[]>;
  requestFrequency: Map<string, number>;
  authEvents: NormalizedLog[];
  failedAuthEvents: NormalizedLog[];
  successfulAuthEvents: NormalizedLog[];
  adminAccessEvents: NormalizedLog[];
  criticalEvents: NormalizedLog[];
  statistics: {
    totalRequests: number;
    totalErrors: number;
    requestsPerMinute: number;
    errorsPerMinute: number;
    avgResponseTime: number;
    stdDevResponseTime: number;
    rollingWindows: Map<string, number[]>;
  };
}