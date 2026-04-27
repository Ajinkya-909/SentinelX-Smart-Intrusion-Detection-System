# 📘 SentinelX – API Specification (Final)

---

# 1. Overview

SentinelX is a **log-based intrusion detection system (IDS)** that processes uploaded logs asynchronously and returns structured security insights.

The backend follows a **job-based asynchronous architecture**:

* Client uploads logs → job is created
* Background workers process logs
* Client polls for status
* Client retrieves final insights

---

# 2. Design Principles

* **Asynchronous Processing**: No heavy computation in request-response cycle
* **Stateless APIs**: Each request is independent
* **Database as Source of Truth**
* **Separation of Concerns**:

  * Auth → identity
  * Jobs → processing
  * Results → insights
* **Idempotency-safe (basic level)**: Duplicate requests do not corrupt system

---

# 3. Authentication

All endpoints require JWT authentication unless specified.

### Header

```
Authorization: Bearer <JWT>
```

### JWT Payload

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "exp": "timestamp"
}
```

### Error

```json
{ "error": "Unauthorized" }
```

---

# 4. Auth APIs

## 4.1 POST /auth/register

### Purpose

Create a new user and return authentication token.

### Request

```json
{
  "email": "user@example.com",
  "password": "Secure@123"
}
```

### Validations

* Email must be valid
* Email must be unique
* Password:

  * Min 8 characters
  * At least 1 number
  * At least 1 special character

### Response

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "token": "jwt"
}
```

### Errors

```json
{ "error": "Invalid email or password format" }
```

```json
{ "error": "Email already registered" }
```

---

## 4.2 POST /auth/login

### Purpose

Authenticate user and return JWT.

### Request

```json
{
  "email": "user@example.com",
  "password": "Secure@123"
}
```

### Response

```json
{
  "token": "jwt"
}
```

### Errors

```json
{ "error": "Invalid email or password" }
```

---

## 4.3 GET /auth/me

### Purpose

Validate token and return user identity.

### Response

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "createdAt": "timestamp"
}
```

---

# 5. Job APIs

## 5.1 POST /jobs/upload

### Purpose

Upload log file and create processing job.

### Request

* Content-Type: multipart/form-data
* Fields:

  * file (required)
  * config (optional)

### Validations

* File required
* Allowed types: .log, .txt, .json
* Max size: 300MB

### Flow

1. Validate input
2. Store file (disk)
3. Create DB job
4. Push to queue

### Response

```json
{
  "jobId": "uuid",
  "status": "UPLOADED"
}
```

### Errors

```json
{ "error": "Invalid file or format" }
```

```json
{ "error": "File too large" }
```

---

## 5.2 GET /jobs

### Purpose

Fetch list of user jobs (dashboard view).

### Query Params

* limit (default: 10)
* offset (default: 0)

### Response

```json
[
  {
    "jobId": "uuid",
    "fileName": "server.log",
    "status": "COMPLETED",
    "severity": "HIGH",
    "createdAt": "timestamp"
  }
]
```

---

## 5.3 GET /jobs/:jobId/status

### Purpose

Track job progress.

### Progress Mapping

| Stage       | Progress |
| ----------- | -------- |
| UPLOADED    | 0        |
| PARSING     | 10       |
| NORMALIZING | 25       |
| ANALYZING   | 70       |
| INSIGHTS    | 100      |

### Response

```json
{
  "jobId": "uuid",
  "status": "PROCESSING",
  "currentStage": "ANALYZING",
  "progress": 70,
  "lastUpdated": "timestamp"
}
```

### Failed

```json
{
  "jobId": "uuid",
  "status": "FAILED",
  "error": "Parsing failed"
}
```

---

## 5.4 GET /jobs/:jobId/results

### Purpose

Return analyzed insights.

### Query Params

* limit (default: 20)
* offset (default: 0)

---

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
  "summary": "Suspicious activity detected",
  "severity": "HIGH",
  "metrics": {
    "totalLogs": 12000,
    "analyzedLogs": 12000,
    "flaggedLogs": 320
  },
  "threats": [
    {
      "id": "uuid",
      "type": "BRUTE_FORCE",
      "severity": "HIGH",
      "message": "Multiple failed login attempts",
      "timestamp": "timestamp",
      "source": "ip",
      "user": "admin",
      "logRefs": ["log1", "log2"]
    }
  ]
}
```

---

### Completed with Warnings

```json
{
  "status": "COMPLETED_WITH_WARNINGS",
  "warnings": ["ML model failed"],
  "threats": []
}
```

---

### Failed

```json
{
  "status": "FAILED",
  "error": "Analysis failed"
}
```

---

### Missing Insights Behavior

* Re-trigger insights stage
* Return PROCESSING response

---

## 5.5 DELETE /jobs/:jobId

### Purpose

Delete job and associated data.

### Behavior

* Delete DB records
* Delete stored file

### Response

```json
{
  "message": "Job deleted successfully"
}
```

---

## 5.6 POST /jobs/:jobId/retry

### Purpose

Retry failed or incomplete job.

### Behavior

* Reset job state
* Re-run pipeline

### Response

```json
{
  "jobId": "uuid",
  "status": "REPROCESSING"
}
```

### Error

```json
{
  "error": "Job already completed"
}
```

---

# 6. State Model (Status, Stage, Outcome)

To ensure consistency across API, database, and pipeline, SentinelX separates **Job Status**, **Pipeline Stage**, and **Result Outcome**.

---

## 6.1 Job Status (Lifecycle State)

```text
UPLOADED
PROCESSING
COMPLETED
FAILED
```

* Represents overall job lifecycle
* Used in Status API and Results API

---

## 6.2 Pipeline Stage (Execution State)

```text
PARSE
NORMALIZE
ANALYZE
INSIGHTS
```

* Internal execution stages
* Stored in DB as `lastCompletedStage`
* Used to compute progress in `/jobs/:jobId/status`

---

## 6.3 Result Outcome (Quality State)

```text
SUCCESS
WARNING
```

* Only applicable when `status = COMPLETED`
* SUCCESS → All analyzers succeeded
* WARNING → Partial issues (e.g., ML failure)

---

## 6.4 Example Mappings

### Completed Successfully

```json
{
  "status": "COMPLETED",
  "outcome": "SUCCESS"
}
```

### Completed with Warnings

```json
{
  "status": "COMPLETED",
  "outcome": "WARNING"
}
```

### Processing

```json
{
  "status": "PROCESSING",
  "currentStage": "ANALYZE"
}
```

### Failed

```json
{
  "status": "FAILED",
  "error": "Parsing failed"
}
```

---

# 7. Error Format

All APIs follow consistent error format:

```json
{
  "error": "message"
}
```

---

# 8. Summary

This API layer ensures:

* Clean separation between client and processing pipeline
* Scalable async architecture
* Reliable job tracking
* Structured security insights delivery

---
