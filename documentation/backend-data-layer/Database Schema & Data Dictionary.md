# 📘 SentinelX – Database Schema & Data Dictionary (Final)

---

# 1. Overview

The SentinelX database is designed to support a **log-based intrusion detection system (IDS)** with an asynchronous, job-driven processing pipeline.

This schema is aligned with:

* API layer (job-based async model)
* Processing pipeline (stage-based execution)
* System state modeling (status, stage, outcome)

---

# 2. Storage Strategy

SentinelX uses a **hybrid storage model**:

* Raw logs → stored in file storage (disk / cloud)
* Normalized logs → stored in PostgreSQL
* Insights → stored in PostgreSQL (JSONB supported)

---

# 3. Core Data Model

```
jobs (1) ────< normalized_logs (many)
  │
  └────< insights (many)
```

---

# 4. jobs Table

## Purpose

The `jobs` table is the **central control entity** of SentinelX.

It tracks:

* Upload lifecycle
* Processing pipeline state
* Progress tracking
* Failure & retry handling

---

## State Modeling (Critical)

SentinelX separates three independent concepts:

### 1. Job Status (Lifecycle)

```
UPLOADED
PROCESSING
COMPLETED
FAILED
```

### 2. Pipeline Stage (Execution Progress)

```
PARSE
NORMALIZE
ANALYZE
INSIGHTS
```

* Stored as `last_completed_stage`
* Represents last successfully finished stage
* Current stage is derived dynamically

### 3. Result Outcome (Final Quality)

```
SUCCESS
WARNING
```

* Only applicable when status = COMPLETED
* SUCCESS → full success
* WARNING → partial issues (e.g. ML failure)

---

## Data Dictionary

| Field                | Type            | Description                        |
| -------------------- | --------------- | ---------------------------------- |
| id                   | UUID            | Unique job ID                      |
| file_path            | TEXT            | File storage path                  |
| file_name            | TEXT            | Original file name                 |
| file_size            | BIGINT          | File size in bytes                 |
| status               | ENUM            | Job lifecycle state                |
| last_completed_stage | ENUM            | Last completed pipeline stage      |
| outcome              | ENUM (nullable) | Result quality (SUCCESS / WARNING) |
| progress             | INT             | Progress (0–100)                   |
| error_message        | TEXT            | Failure reason                     |
| retry_count          | INT             | Retry attempts                     |
| created_at           | TIMESTAMP       | Creation time                      |
| updated_at           | TIMESTAMP       | Last update                        |
| deleted_at           | TIMESTAMP       | Reserved for soft delete           |

---

## Important Notes

* `current_stage` is NOT stored (derived from last_completed_stage)
* Prevents inconsistency and duplication

---

# 5. normalized_logs Table

## Purpose

Stores structured log events after parsing and normalization.

---

## Data Dictionary

| Field      | Type      | Description      |
| ---------- | --------- | ---------------- |
| id         | UUID      | Log entry ID     |
| job_id     | UUID      | Reference to job |
| timestamp  | TIMESTAMP | Event time       |
| source     | VARCHAR   | Log source       |
| event_type | VARCHAR   | Event type       |
| ip_address | VARCHAR   | IP address       |
| severity   | VARCHAR   | Log severity     |
| metadata   | JSONB     | Flexible fields  |
| created_at | TIMESTAMP | Record creation  |

---

# 6. insights Table

## Purpose

Stores final analysis results (user-facing insights).

---

## Data Dictionary

| Field      | Type      | Description             |
| ---------- | --------- | ----------------------- |
| id         | UUID      | Insight ID              |
| job_id     | UUID      | Reference to job        |
| type       | VARCHAR   | Insight type            |
| title      | TEXT      | Short summary           |
| severity   | VARCHAR   | Severity level          |
| data       | JSONB     | Structured insight data |
| created_at | TIMESTAMP | Creation time           |

---

# 7. Relationships

* jobs.id → normalized_logs.job_id (1:N)
* jobs.id → insights.job_id (1:N)

---

# 8. Design Decisions

## 1. Enum-Based State Control

* Prevents invalid values
* Ensures consistency across API + DB + pipeline

## 2. Stage Checkpointing

* Enables resume capability
* Supports retry and recovery

## 3. Outcome Separation

* Avoids mixing status with result quality
* Replaces ambiguous values like COMPLETED_WITH_WARNINGS

## 4. Hybrid Storage

* Performance (DB for structured data)
* Scalability (files outside DB)

---

# 9. Conclusion

This schema provides:

* Strong consistency across system layers
* Predictable state transitions
* Scalable processing model
* Clean separation of concerns

---
