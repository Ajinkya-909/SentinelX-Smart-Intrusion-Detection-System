# SentinelX – Data Processing Pipeline Document

This document defines the **complete internal execution pipeline** of SentinelX. It explains, in detail, how a log file moves through the system—from ingestion to final insights—covering **each stage, transitions, failure handling, and system behavior**.

---

# 1. Pipeline Philosophy

SentinelX uses a **stage-based, checkpoint-driven pipeline** executed by background workers.

The pipeline is designed to be:

- Fault-tolerant
- Idempotent
- Resume-capable
- Modular

### Core Principle

> A stage is only marked complete when its output is fully generated and validated.

---

# 2. High-Level Flow

```text
UPLOAD → PREPROCESS → TYPE DETECTION → PARSE → NORMALIZE → ANALYZER ORCHESTRATOR → INSIGHTS GENERATION → STORE RESULTS
```

Each stage follows a strict lifecycle:

```text
Pre-Stage Check → Execution → Validation → Checkpoint Update
```

---

# 3. Pipeline Entry (Worker Initialization)

When a worker picks a job from the queue:

### What Happens

- Worker receives `jobId`
- Fetches job metadata from database
- Determines `lastCompletedStage`

### Decision Logic

- Resume from last successful stage
- Skip already completed stages

---

# 4. Stage 1: Upload

## Overview

File ingestion and job initialization.

---

## Input

- File object
- userId

---

## Execution

- Save raw file to storage
- Create job record in database
- Enqueue worker payload

---

## Output

- jobId
- filePath

---

## Persistence

| Data       | Stored? | Location     |
| ---------- | ------- | ------------ |
| Raw file   | YES     | File storage |
| Job record | YES     | jobs table   |

---

## Post-Stage

- Update DB: `lastCompletedStage = UPLOADED`
- Queue payload: `{ jobId, filePath }`

---

## Failure Handling

- If file save fails → retry with limited attempts
- If DB write fails → transactional rollback

---

# 5. Stage 2: Preprocess

## Overview

Prepares raw file for type detection and parsing.

---

## Input

- filePath
- jobId

---

## Execution

- Read file
- Split into lines
- Detect encoding
- Sanitize empty lines
- Clean whitespace

---

## Output (In-Memory Only)

- rawLines: `string[]`
- metadata: `{ encoding, lineCount, fileSize }`

---

## Persistence

**DO NOT STORE** - This is transient data. Only pass to next stage in memory.

---

## Post-Stage

- Update DB: `lastCompletedStage = PREPROCESSED`

---

## Failure Handling

- If encoding detection fails → default to UTF-8
- If read fails → retry with backoff

---

# 6. Stage 3: Type Detection

## Overview

Identifies log source type and selects appropriate parser strategy.

---

## Input

- rawLines: `string[]`

---

## Execution

- Analyze line patterns
- Detect log type (NGINX_ACCESS, SYSLOG, JSON, etc.)
- Determine parser strategy
- Calculate confidence score

---

## Output

```json
{
  "detectedType": "NGINX_ACCESS",
  "confidence": 0.91,
  "parser": "nginxParserV1",
  "encoding": "utf8"
}
```

---

## Persistence

**MUST STORE** - Critical for recovery and debugging.

| Data               | Stored? | Location                 |
| ------------------ | ------- | ------------------------ |
| Detection metadata | YES     | jobs.processing_metadata |

---

## Post-Stage

- Update DB: `lastCompletedStage = TYPE_DETECTED`
- Store `processing_metadata` in jobs table

---

## Failure Handling

- If type cannot be detected → attempt generic parser
- If all type detection fails → mark job FAILED

---

# 7. Stage 4: Parsing

## Overview

Extracts structured fields from raw logs using detected parser.

---

## Input

- rawLines: `string[]`
- detectionMetadata: Detection result from Stage 3

---

## Execution

- Apply detected parser strategy
- Extract fields:
  - timestamp
  - log level
  - message
  - source IP
  - user
  - status code
  - metadata

---

## Output (In-Memory Only)

```ts
ParsedLog[]
{
  timestamp: Date,
  logLevel: string,
  message: string,
  sourceIp?: string,
  user?: string,
  statusCode?: number,
  raw: string
}
```

---

## Persistence

**DO NOT STORE** - Parsed logs are intermediate and parser-specific. Discard after normalization.

---

## Post-Stage

- Update DB: `lastCompletedStage = PARSED`

---

## Failure Handling

- If parsing fails:
  - Retry with limited attempts
  - If unrecoverable → mark FAILED

---

# 8. Stage 5: Normalization

## Overview

Transforms parsed logs into a unified canonical schema. This is the **first major stable checkpoint**.

---

## Input

- ParsedLog[]
- Parser metadata

---

## Execution

- Apply normalization rules
- Unify field mappings
- Standardize values:
  - timestamp format (ISO8601)
  - severity levels
  - event types
  - IP addresses
  - user fields

---

## Output

```ts
NormalizedLog[]
{
  id: UUID,
  job_id: string,
  timestamp: DateTime,
  source: string,
  event_type: string,
  ip_address?: string,
  severity: CRITICAL | HIGH | MEDIUM | LOW | INFO,
  metadata: {
    endpoint?: string,
    statusCode?: number,
    method?: string,
    userAgent?: string,
    userId?: string,
    raw: string
  }
}
```

---

## Persistence

**MUST STORE** - This is your **canonical processing layer**. Everything after this operates on normalized logs.

| Data            | Stored? | Location              |
| --------------- | ------- | --------------------- |
| Normalized logs | YES     | normalized_logs table |

---

## Post-Stage

- Update DB: `lastCompletedStage = NORMALIZED`
- Bulk insert into normalized_logs table

---

## Failure Handling

- Retry if transient
- If schema validation fails → mark FAILED
- Partial failures: log and continue if possible

---

# 9. Stage 6: Analyzer Orchestrator

## Overview

Orchestrates multiple specialized analyzers. Each analyzer independently queries normalized logs.

---

## Input

- jobId
- (Analyzers fetch normalized_logs by jobId internally)

---

## Execution

Analyzers run in defined sequence:

### Rule Analyzer

- Detect known threat patterns
- Match against security rules

### Type Analyzer

- Apply log-type-specific rules
- Extract domain patterns

### Generic Analyzer

- Fallback analysis for unknown patterns
- Statistical detection

### ML Analyzer (Parallel, Non-Blocking)

- Send normalized logs to ML service
- Runs asynchronously
- Results merged on completion

---

## Output

```ts
AnalyzerFinding[]
{
  id: UUID,
  job_id: string,
  analyzer: string,
  finding_type: string,
  severity: CRITICAL | HIGH | MEDIUM | LOW,
  confidence: float (0-1),
  log_references: [uuid, uuid, ...],  // References to normalized_logs
  metadata: {
    summary: string,
    details: object,
    recommendation?: string
  },
  created_at: DateTime
}
```

---

## Persistence

**MUST STORE** - Findings are expensive to compute and required for explainability and recovery.

| Data              | Stored? | Location                |
| ----------------- | ------- | ----------------------- |
| Analyzer findings | YES     | analyzer_findings table |

---

## Post-Stage

- Update DB: `lastCompletedStage = ANALYZED`
- Bulk insert into analyzer_findings table
- Store findings with traceability to normalized_logs

---

## Failure Handling

- Partial failures allowed (individual analyzer failure doesn't stop pipeline)
- ML failure → warning only, continue with other analyzers
- If all analyzers fail → mark FAILED

---

# 10. Stage 7: Insights Generation

## Overview

Converts analyzer findings into final human-readable insights. Uses **findings as input, not normalized logs directly**.

---

## Input

- AnalyzerFinding[]

---

## Execution

- Aggregate findings by type
- Generate threat summary
- Assign overall severity
- Compile recommendations
- Create human-readable descriptions

---

## Output

```ts
Insight[]
{
  id: UUID,
  job_id: string,
  type: string,
  title: string,
  severity: CRITICAL | HIGH | MEDIUM | LOW,
  data: {
    summary: string,
    affectedIps: string[],
    threatCount: number,
    findings: FindingReference[],
    recommendation: string,
    timestamp: DateTime
  }
}
```

---

## Persistence

**MUST STORE** - Final user-facing intelligence.

| Data     | Stored? | Location       |
| -------- | ------- | -------------- |
| Insights | YES     | insights table |

---

## Post-Stage

- Update DB: `lastCompletedStage = INSIGHTS_GENERATED`
- Bulk insert into insights table

---

## Failure Handling

- Retry insights stage
- If persistent failure → mark FAILED

---

# 11. Stage 8: Store Results

## Overview

Finalizes job completion and updates status.

---

## Execution

- Verify all outputs exist
- Calculate processing metrics
- Generate completion summary

---

## Persistence

| Data               | Stored? | Location      |
| ------------------ | ------- | ------------- |
| Completion status  | YES     | jobs.status   |
| Processing metrics | YES     | jobs.metadata |

---

## Post-Stage

- Update DB:
  - `lastCompletedStage = COMPLETED`
  - `status = COMPLETED` or `COMPLETED_WITH_WARNINGS`
  - Store processing metrics

---

# 12. Pipeline Context Object

The runtime orchestration context that flows through stages:

```ts
interface PipelineContext {
  // Core identifiers
  jobId: string;
  filePath: string;
  userId: string;

  // Stage outputs (NOT ALL PERSISTED)
  rawLines?: string[];
  detection?: DetectionResult;
  parsedLogs?: ParsedLog[];
  normalizedLogs?: NormalizedLog[];
  findings?: AnalyzerFinding[];
  insights?: Insight[];

  // Metadata
  processing_metadata?: ProcessingMetadata;
  metrics?: ProcessingMetrics;
  currentStage: PipelineStage;
  startedAt: DateTime;
}
```

**IMPORTANT**: Not everything in context gets persisted. Context is for runtime orchestration only.

---

# 13. Persistence Strategy

## Transient Data (NOT Stored)

Never persists—discarded after use:

- Raw line arrays
- Regex match results
- Parsed intermediate objects
- Temporary counters
- Chunk buffers
- Encoding detection state

---

## Persistent Recovery Data (MUST Store)

Essential for recovery and debugging:

- `jobs.processing_metadata` → Detection result, parser info, encoding
- `normalized_logs` → Canonical layer, reusable by all downstream stages
- `analyzer_findings` → Expensive computations, explainability
- Pipeline checkpoints → Stage completion times

---

## Final User Output Data (MUST Store)

- `insights` → User-facing intelligence
- Severity assignments
- Threat summaries
- Recommendations

---

# 14. Storage Map

What gets stored at each stage:

| Stage          | Save to DB? | Where                    | Data                                        |
| -------------- | ----------- | ------------------------ | ------------------------------------------- |
| Upload         | YES         | jobs                     | job record, file path                       |
| Preprocess     | NO          | —                        | transient only                              |
| Type Detection | YES         | jobs.processing_metadata | detected type, parser, confidence, encoding |
| Parse          | NO          | —                        | transient only (parsed logs)                |
| Normalize      | YES         | normalized_logs          | canonical log records with metadata         |
| Analyze        | YES         | analyzer_findings        | findings with log references                |
| Insights       | YES         | insights                 | final insights for user                     |
| Store Results  | YES         | jobs                     | status, completion metadata                 |

---

# 15. Recovery Boundaries

If pipeline fails, resume from appropriate stage:

| Failure Point                         | Recovery Strategy    | Action                               |
| ------------------------------------- | -------------------- | ------------------------------------ |
| Before Normalization                  | Restart from Parsing | Re-parse with detected parser        |
| After Normalization (Before Analysis) | Resume from Analyzer | Reuse normalized_logs, no re-parsing |
| After Analysis (Before Insights)      | Regenerate Insights  | Reuse analyzer_findings              |
| After Insights                        | Mark COMPLETED       | No recovery needed                   |

---

# 16. Checkpointing System

Each stage updates the DB only after successful completion.

### Checkpoint Record

```json
{
  "jobId": "uuid",
  "lastCompletedStage": "NORMALIZED",
  "completedAt": "2024-01-15T10:30:00Z",
  "stageDurations": {
    "UPLOADED": 100,
    "PREPROCESSED": 250,
    "TYPE_DETECTED": 50,
    "PARSED": 1200,
    "NORMALIZED": 800
  }
}
```

**CRITICAL**: Only update `lastCompletedStage` after stage outputs are fully validated and persisted.

---

# 17. Idempotency Strategy

Each stage implements idempotency:

1. **Check if stage already completed** → Skip if outputs exist and validated
2. **Validate existing outputs** → Verify integrity
3. **Re-run only if validation fails**

This ensures:

- Workers can retry without duplicating data
- Pipeline handles duplicate queue messages
- Partial failures can be recovered cleanly

---

# 18. Recovery Mechanism

### Scenario: Worker Crash During Stage 5 (Normalization)

1. Job marked as IN_PROGRESS
2. Worker dies
3. Next worker picks up same jobId
4. Reads: `lastCompletedStage = PARSED`
5. **Resume from Stage 4 (Parse)**, not from beginning

---

### Scenario: Partial Failure in Analyzer Stage

1. Rule Analyzer succeeds → persist findings
2. ML Analyzer fails
3. Do NOT fail entire job
4. Continue with insights generation using partial findings
5. Mark status: `COMPLETED_WITH_WARNINGS`

---

# 19. End-to-End Flow Summary

```text
Job picked
  → Resume from lastCompletedStage
  → Check stage pre-conditions
  → Execute stage
  → Validate outputs
  → Persist to DB
  → Update checkpoint
  → Next stage
```

---

# 20. Critical Data Flow Layers

```
RAW_LOGS (transient)
    ↓
PARSED_LOGS (transient)
    ↓
NORMALIZED_LOGS (canonical—persistent) ← All analyzers query from here
    ↓
ANALYZER_FINDINGS (persistent—explains detections)
    ↓
INSIGHTS (persistent—user-facing)
```

**Key insight**: Everything after normalization operates on stable, persistent data.

---

# 21. Schema Requirements

### Required Additions to Prisma Schema

```prisma
model jobs {
  // ... existing fields

  // NEW: Processing metadata for recovery
  processing_metadata Json?  // Detection result, parser, confidence, encoding

  // NEW: Track last successful stage
  last_completed_stage String
}

model analyzer_findings {
  // NEW TABLE: Required for explainability and recovery
  id                 String   @id @default(uuid())
  job_id             String
  analyzer           String   // "rule", "type", "generic", "ml"
  finding_type       String
  severity           String   // CRITICAL | HIGH | MEDIUM | LOW
  confidence         Float?
  log_references     Json?    // IDs of related normalized_logs
  metadata           Json?    // Details, summary, recommendation
  created_at         DateTime @default(now())

  @@foreignKey([job_id], references: [jobs.id])
}
```

---

# 22. Final Notes

This revised pipeline architecture ensures:

- **Fault tolerance** through checkpoint-based recovery
- **Explainability** via analyzer_findings layer
- **Scalability** by not persisting transient data
- **Idempotency** through stage validation
- **Modularity** with clear input/output contracts
- **Proper data boundaries** between transient, recovery, and user data

The canonical layer (normalized_logs) becomes the stable foundation that all subsequent processing relies on.
