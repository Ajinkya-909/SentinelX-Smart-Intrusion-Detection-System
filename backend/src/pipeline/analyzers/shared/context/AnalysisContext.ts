export interface NormalizedLog {
  id: string;
  jobId: string;
  raw_content: string;
  log_type: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  endpoint: string;
  http_method: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  event_type: string;
  severity: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
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
  // ===== RAW LOGS =====
  logs: NormalizedLog[];
  jobId: string;

  // ===== PRECOMPUTED INDEXES =====

  // Timeline by entity (user or IP)
  entityTimelines: Map<string, NormalizedLog[]>; // key: "user_{userId}" or "ip_{ipAddress}"

  // Event sequences by entity
  eventSequences: Map<string, EventSequence[]>;

  // Session groupings
  sessions: SessionGroup[];

  // Endpoint access patterns
  endpointAccess: Map<string, EndpointAccessRecord[]>;

  // Time-bucketed events (1-minute buckets)
  timeBuckets: Map<string, NormalizedLog[]>; // key: "2026-05-23T10:00:00Z"

  // User-IP relationships
  userIpMappings: Map<string, Set<string>>; // userId -> set of IPs
  ipUserMappings: Map<string, Set<string>>; // IP -> set of userIds

  // Error patterns
  errorPatterns: Map<string, ErrorRecord[]>;

  // Request frequency maps
  requestFrequency: Map<string, number>; // entity -> count

  // Authentication events
  authEvents: NormalizedLog[];
  failedAuthEvents: NormalizedLog[];
  successfulAuthEvents: NormalizedLog[];

  // Admin/privilege events
  adminAccessEvents: NormalizedLog[];

  // Critical events
  criticalEvents: NormalizedLog[];

  // Statistical precomputation
  statistics: {
    totalRequests: number;
    totalErrors: number;
    requestsPerMinute: number;
    errorsPerMinute: number;
    avgResponseTime: number;
    stdDevResponseTime: number;
    rollingWindows: Map<string, number[]>; // key: "ip_requests", value: [counts per minute]
  };
}
