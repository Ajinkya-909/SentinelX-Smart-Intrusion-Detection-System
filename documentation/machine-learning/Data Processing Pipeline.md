# SentinelX – Data Processing Pipeline Document

This document defines the **complete internal execution pipeline** of SentinelX. It explains, in detail, how a log file moves through the system—from ingestion to final insights—covering **each stage, transitions, failure handling, and system behavior**.

---

# 1. Pipeline Philosophy

SentinelX uses a **stage-based, checkpoint-driven pipeline** executed by background workers.

The pipeline is designed to be:

* Fault-tolerant
* Idempotent
* Resume-capable
* Modular

### Core Principle

> A stage is only marked complete when its output is fully generated and validated.

---

# 2. High-Level Flow

```text
UPLOAD → PARSE → NORMALIZE → ANALYZE → INSIGHTS
```

Each stage follows a strict lifecycle:

```text
Pre-Stage Check → Execution → Validation → Checkpoint Update
```

---

# 3. Pipeline Entry (Worker Initialization)

When a worker picks a job from the queue:

### What Happens

* Worker receives `jobId`
* Fetches job metadata from database
* Determines `lastCompletedStage`

### Decision Logic

* Resume from last successful stage
* Skip already completed stages

---

# 4. Stage 1: Parsing

## Overview

Parsing converts raw log files into structured data.

---

## Pre-Stage

* Verify raw file exists
* Check file accessibility
* Ensure parsing not already completed

---

## Execution

* Read file in chunks
* Extract structured fields:

  * timestamp
  * log level
  * message
  * metadata (IP, user, etc.)

---

## Output

* Structured JSON logs
* Stored in file storage

---

## Validation

* Ensure all entries parsed
* Validate structure consistency

---

## Post-Stage

* Update DB:

  * lastCompletedStage = PARSED
* Store parsed file path

---

## Failure Handling

* If parsing fails:

  * Retry (limited attempts)
  * If unrecoverable → mark FAILED

---

# 5. Stage 2: Normalization

## Overview

Transforms structured logs into a standardized format.

---

## Pre-Stage

* Ensure parsed data exists
* Validate integrity of parsed logs

---

## Execution

* Detect log type
* Apply normalization rules
* Standardize fields:

  * event
  * status
  * user
  * IP

---

## Output

* Normalized logs
* Stored in file storage or DB

---

## Validation

* Schema consistency check
* Required fields present

---

## Post-Stage

* Update DB:

  * lastCompletedStage = NORMALIZED

---

## Failure Handling

* Retry if transient
* If schema mismatch → fail job

---

# 6. Stage 3: Analysis

## Overview

Analyzes normalized logs using multiple analyzers.

---

## Pre-Stage

* Ensure normalized data exists
* Validate completeness

---

## Execution

### Rule-Based Analysis

* Detect known patterns

### Type-Specific Analysis

* Apply domain-specific rules

### Generic Analysis

* Fallback for unknown logs

### ML Analysis (Parallel)

* Send data to ML service
* Non-blocking

---

## Output

* Analysis results
* Stored temporarily

---

## Validation

* Ensure results generated
* Check for completeness

---

## Post-Stage

* Update DB:

  * lastCompletedStage = ANALYZED

---

## Failure Handling

* Partial failures allowed
* ML failure → warning only

---

# 7. Stage 4: Insights Generation

## Overview

Converts analysis results into final user-facing insights.

---

## Pre-Stage

* Ensure analysis results exist

---

## Execution

* Aggregate results
* Generate summary
* Assign severity
* Compile threats list

---

## Output

* Final insights
* Stored in database

---

## Validation

* Ensure required fields exist
* Validate completeness

---

## Post-Stage

* Update DB:

  * lastCompletedStage = COMPLETED
  * status = COMPLETED / COMPLETED_WITH_WARNINGS

---

## Failure Handling

* Retry insights stage
* If persistent failure → mark FAILED

---

# 8. Checkpointing System

Each stage updates DB only after successful completion.

### Example

```json
{
  "lastCompletedStage": "NORMALIZED"
}
```

---

# 9. Idempotency Strategy

Each stage:

* Checks if output already exists
* Validates output
* Skips if safe

---

# 10. Recovery Mechanism

### Scenario: Worker Crash

* Resume from lastCompletedStage

### Scenario: Missing Output

* Re-run specific stage

---

# 11. End-to-End Flow Summary

```text
Job picked → Stage checks → Execute stage → Validate → Update DB → Next stage
```

---

# 12. Final Notes

This pipeline ensures reliable, scalable, and fault-tolerant processing of logs while maintaining consistency and recoverability.

---
## To make it truly strong, we will later add:

Exact data structures per stage
Worker-level execution logic flow
Detailed pre-check decision trees
Internal retry + validation strategies
How partial failures propagate
How ML parallelism syncs back
Chunk processing strategy (you mentioned earlier)