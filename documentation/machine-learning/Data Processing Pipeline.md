# 🔄 SentinelX – Data Processing Pipeline Document

This document defines the **complete internal execution pipeline** of SentinelX. It explains, in detail, how a log file moves through the system—from ingestion to final insights—covering **each stage, transitions, failure handling, and system behavior**.

---

## 1. Pipeline Philosophy

SentinelX uses a **stage-based, checkpoint-driven pipeline** executed by background queue workers. The pipeline is designed to be:
- **Fault-tolerant**: Recovers from crash states without repeating heavy parsing computations.
- **Idempotent**: Re-running stages cleans up partial states to avoid duplicate database inserts.
- **Resume-capable**: Evaluates job state at startup and picks up exactly where it failed.
- **Resource-bounded**: Caps Event Loop usage and RAM via chunked streaming and sliding window operations.

---

## 2. High-Level Flow

```text
Log Upload (UPLOADED)
  ↓
Ingestion & Preprocessing
  ↓
Dynamic Type Detection
  ↓
Adaptive Parsing & Normalization (NORMALIZED Checkpoint)
  ↓
Sliding Window Analysis (Rule, Stats, ML, Temporal, Correlation) (ANALYZED Checkpoint)
  ↓
Aggregated Metrics & Threat Summarization (INSIGHTS_GENERATED Checkpoint)
```

### Logical Stages vs. Transactional Checkpoints
Although the pipeline performs **8 distinct logical steps** to safely extract and scan log data, it groups database persistence updates into **4 Consolidated Checkpoints**. 

Grouping stages reduces database transactional overhead (reducing database round-trips) and prevents intermediate corrupted states from polluting tables.

---

## 3. Detailed Logical Stages

### Stage 1: File Ingestion (Upload)
* **Why it happens**: Initializes a job tracking record and places raw log uploads into a secure storage environment (`/app/storage`).
* **Input**: Multer file stream, `userId` (owner).
* **Execution**: Saves files to storage and inserts a job record with status `UPLOADED`.
* **Output**: `jobId`, `filePath`.
* **Persistence**: Raw file saved to disk; `jobs` table record inserted.

---

### Stage 2: Ingest & Clean (Preprocess)
* **Why it happens**: Cleans and structure-validates raw lines to prevent parser exceptions. It detects the text encoding (defaulting to UTF-8 if unknown), sanitizes empty strings, and trims whitespace.
* **Input**: `jobId`, `filePath`.
* **Execution**: Reads file in chunks, splits into strings, performs sanitization.
* **Output (In-Memory)**: `rawLines: string[]`, metadata (`encoding`, `lineCount`).
* **Persistence**: None. Kept in memory to optimize processing performance.

---

### Stage 3: Format Baseline (Type Detection)
* **Why it happens**: Dynamically identifies the log format (e.g. `NGINX_ACCESS`, `SYSLOG`, `JSON`, `GENERIC`) based on pattern matching of the first batch. This ensures the correct parsing regular expressions are applied.
* **Input**: Initial batch of `rawLines`.
* **Execution**: Runs line pattern tests to calculate format confidence scores.
* **Output**: `detectedType` (e.g. `NGINX_ACCESS`), `confidence`, `parser`.
* **Persistence**: Saved in `jobs.processing_metadata`.

---

### Stage 4: Structure Extraction (Parsing)
* **Why it happens**: Translates raw strings into structured JSON objects by applying regex rules.
* **Input**: Sanitized `rawLines`, `detectedType` configuration.
* **Execution (Adaptive Loop)**:
  * Applies the detected parser rules.
  * If the parser fails to process more than 85% of lines, SentinelX initiates **Dynamic Re-Detection** on the failing batch, excluding the current parser type.
  * It attempts the new parser format; if failure persists across multiple retries, it forces a **GENERIC** parser fallback rather than failing the job.
* **Output (In-Memory)**: `ParsedLog[]` containing timestamps, levels, log messages, IPs, and actors.
* **Persistence**: None.

---

### Stage 5: Canonical Unification (Normalization)
* **Why it happens**: Maps parser-specific attributes into a unified canonical schema so that down-stream security scanners can run rules against standard formats.
* **Input**: `ParsedLog[]`.
* **Execution**: Standardizes times to ISO 8601, maps IP addresses, sets uniform severity terms (`INFO`, `WARNING`, `ERROR`), and converts extra details to a JSONB `metadata` field.
* **Output**: `NormalizedLog[]` records ready for PostgreSQL.
* **Persistence**: Bulk-inserted into the `normalized_logs` table.
* **Checkpoint Boundary**: Once complete, the database updates:
  * `last_completed_stage = NORMALIZED`
  * Progress updated to `40%`.

---

### Stage 6: Threat Scanning (Analysis Orchestrator)
* **Why it happens**: Executes parallel threat rules, behavior scanners, and machine learning models on normalized logs to identify malicious patterns.
* **Input**: `jobId` (scanners query `normalized_logs` internally).
* **Execution**: To limit RAM footprint on large files, logs are processed in **sliding windows** of 5,000 logs with a 500-log overlap to catch boundary attacks. 5 engines run in parallel on each window:
  1. **Rule Analyzer**: Matches regex indicators (SQL injection, XSS).
  2. **Statistical Analyzer**: Calculates distribution variances.
  3. **Temporal Analyzer**: Scans login timings.
  4. **Correlation Analyzer**: Detects multi-stage alert correlations.
  5. **ML Analyzer**: Encodes features and calls the FastAPI microservice (`/analyze` endpoint) to run Isolation Forest & DBSCAN.
* **Deduplication**: As overlapping windows cause duplicate findings, a SHA-256 fingerprint is generated from: `analyzer + finding_type + affected_entities + first_10_log_references`. Duplicate inserts are rejected.
* **Output**: `AnalyzerFinding[]`.
* **Persistence**: Bulk-inserted into the `analyzer_findings` table.
* **Checkpoint Boundary**: Once complete, the database updates:
  * `last_completed_stage = ANALYZED`
  * Progress updated to `70%`.

---

### Stage 7: Aggregation (Insights Generation)
* **Why it happens**: Translates granular, complex `analyzer_findings` into human-digestible widgets, severity counts, attack timelines, and recommendations.
* **Input**: `analyzer_findings` linked to the `jobId`.
* **Execution**: Groups findings by severity and type, computes attacker IP lists, and creates visual chart datasets.
* **Output**: `Insight[]` objects.
* **Persistence**: Saved into the `insights` table.
* **Checkpoint Boundary**: Once complete, the database updates:
  * `last_completed_stage = INSIGHTS_GENERATED`
  * Progress updated to `100%`.

---

### Stage 8: Compilation (Store Results)
* **Why it happens**: Transition the job to a static completed status and log execution duration metrics.
* **Execution**: Updates job health state.
* **Persistence**:
  * `status = COMPLETED`
  * `outcome = SUCCESS` (or `WARNING` if ML service was offline).

---

## 4. Storage & Persistence Map

| Step / Stage | Stored to DB? | Target Table | Type | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Upload** | YES | `jobs` | Permanent | Tracks file location and status. |
| **Preprocess** | NO | — | Transient | In-memory cleaning only. |
| **Type Detect** | YES | `jobs.processing_metadata` | Permanent | Saves identified log parser type. |
| **Parse** | NO | — | Transient | Structural logs. |
| **Normalize** | YES | `normalized_logs` | Permanent | Unified data source for analyzers. |
| **Analyze** | YES | `analyzer_findings` | Permanent | Security alerts and ML outliers. |
| **Insights** | YES | `insights` | Permanent | Dashboard widgets and summaries. |
| **Store Results** | YES | `jobs` | Permanent | Finalizes status to `COMPLETED`. |

---

## 5. Recovery Boundaries and Fault Tolerance

If a queue worker crashes or the server loses power during execution, the system recovers cleanly by reading `last_completed_stage` at job restart:

| Failure Location | Saved State | Recovery Strategy | Action |
| :--- | :--- | :--- | :--- |
| Before Normalization | `UPLOADED` or `null` | Full restart | Wipes partial log database records and re-runs parsing. |
| During Analysis | `NORMALIZED` | Resume at Scan | Skips parsing/normalization; queries existing `normalized_logs` and executes scanners. |
| During Insights | `ANALYZED` | Resume at Aggregate | Skips parsing/analysis; queries existing `analyzer_findings` to compile insights. |
| After Insights | `INSIGHTS_GENERATED` | Finalize | Marks status as `COMPLETED`. |

### Idempotency Strategy
To avoid duplicate data inserts during job retries:
1. **Normalization Stage**: Deletes any pre-existing records in `normalized_logs` matching the current `jobId` before inserting.
2. **Analysis Stage**: Deletes any pre-existing records in `analyzer_findings` matching the current `jobId` before inserting.
3. **Insights Stage**: Deletes any pre-existing records in `insights` matching the current `jobId` before generating new ones.

---

## 6. Database Schema Alignment

The pipeline data structure is mapped directly to PostgreSQL using the Prisma client. The models (`users`, `jobs`, `normalized_logs`, `analyzer_findings`, and `insights`) are detailed in the [Database Schema & Data Dictionary](file:///d:/CodingContent/Web%20Development/SentinelX%20%E2%80%94%20Smart%20Intrusion%20Detection%20System/documentation/backend-data-layer/Database%20Schema%20&%20Data%20Dictionary.md) document. 

All tables are optimized with indexing on query filters (e.g. `job_id`, `timestamp`, `ip_address`, and `fingerprint`) to guarantee sub-second API responses.
