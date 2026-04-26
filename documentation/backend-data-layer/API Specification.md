# SentinelX – API Specification

This document defines all backend API endpoints for SentinelX. It provides both **conceptual explanations** (how each endpoint fits into the system) and **precise contracts** (request/response formats, validation, and edge cases).

---

# 1. API Design Principles

SentinelX APIs follow a **job-based asynchronous model**:

* The client **never waits for heavy processing**
* All long-running work is handled by background workers
* APIs are **stateless, predictable, and idempotent where possible**

### Key Design Rules

* Controller = lightweight (validation + job creation only)
* Worker = heavy processing (pipeline execution)
* Database = single source of truth
* Queue = execution trigger

---

# 2. Authentication

All endpoints require JWT authentication.

### Header

```http
Authorization: Bearer <JWT>
```

### Behavior

* Invalid token → `401 Unauthorized`
* Missing token → `401 Unauthorized`

---

# 3. POST /upload

## Overview

This endpoint is the **entry point of the system**. It accepts a log file, creates a job, and triggers asynchronous processing.

It does NOT process logs directly. Instead, it:

* Validates input
* Stores file
* Creates job record
* Pushes job to queue

---

## Request

### Headers

```http
Authorization: Bearer <JWT>
Content-Type: multipart/form-data
```

### Body

* `file` (required) → log file
* `config` (optional) → future extensions

---

## Validations

* User authentication
* File presence
* File size limit
* File type (`.log`, `.txt`, `.json`)

---

## Internal Flow

* Save file to storage
* Create job in DB:

  * status = UPLOADED
  * lastCompletedStage = UPLOADED
* Push jobId to queue

---

## Response

```json
{
  "jobId": "uuid",
  "status": "processing"
}
```

---

## Errors

### 400 Bad Request

```json
{ "error": "Invalid file format" }
```

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

---

# 4. GET /job/:jobId/status

## Overview

This endpoint allows the client to **track job progress**.

It reads job state from DB and returns:

* current stage
* overall status
* estimated progress

---

## Request

```http
GET /job/:jobId/status
Authorization: Bearer <JWT>
```

---

## Internal Flow

* Validate job exists
* Validate ownership
* Fetch job state
* Derive stage + progress

---

## Response

```json
{
  "jobId": "uuid",
  "status": "PROCESSING",
  "currentStage": "ANALYZING",
  "progress": 65,
  "lastUpdated": "timestamp"
}
```

---

## Status Values

* UPLOADED
* PROCESSING
* COMPLETED
* COMPLETED_WITH_WARNINGS
* FAILED

---

## Errors

### 404 Not Found

```json
{ "error": "Job not found" }
```

### 403 Forbidden

```json
{ "error": "Unauthorized access" }
```

---

# 5. GET /job/:jobId/results

## Overview

This endpoint returns **final insights only**.

It does NOT expose intermediate pipeline data.

---

## Internal Behavior

* If processing → return waiting response
* If completed → return insights
* If partial → return insights + warnings
* If failed → return error
* If inconsistency detected → trigger recovery

---

## Request

```http
GET /job/:jobId/results
Authorization: Bearer <JWT>
```

---

## Response Cases

### Processing

```json
{
  "status": "PROCESSING",
  "message": "Results not ready yet"
}
```

---

### Completed

```json
{
  "status": "COMPLETED",
  "summary": "...",
  "severity": "HIGH",
  "threats": []
}
```

---

### Completed with Warnings

```json
{
  "status": "COMPLETED_WITH_WARNINGS",
  "summary": "...",
  "threats": [],
  "warnings": ["ML failed"]
}
```

---

### Failed

```json
{
  "status": "FAILED",
  "error": "Processing failed"
}
```

---

## Edge Case: Missing Insights

If job is completed but insights are missing:

* Trigger re-processing of insights stage
* Return processing response

---

# 6. GET /jobs

## Overview

Returns list of user jobs for dashboard.

---

## Response

```json
[
  {
    "jobId": "uuid",
    "status": "COMPLETED",
    "createdAt": "timestamp"
  }
]
```

---

# 7. Error Handling Strategy

All errors follow consistent format:

```json
{
  "error": "message"
}
```

---

# 8. Design Guarantees

* APIs are stateless
* All heavy work is async
* No duplicate processing due to idempotency
* Safe retry mechanisms exist

---

# 9. Summary

This API layer ensures a clean separation between client interaction and backend processing, enabling scalability, reliability, and maintainability.
