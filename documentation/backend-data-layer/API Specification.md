# 📘 SentinelX – API Specification (Updated)

---

## Table of Contents

1. [Overview](#overview)
2. [Base Response Structure](#base-response-structure)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Authentication Routes](#authentication-routes)
6. [Job & Analysis Routes](#job--analysis-routes)
7. [Job Status & Progress Tracking](#job-status--progress-tracking)
8. [Error Handling](#error-handling)

---

## Overview

SentinelX is a **log-based intrusion detection system (IDS)** that processes uploaded logs asynchronously and returns structured security insights through a RESTful API.

### Architecture

- **Asynchronous Processing**: Long-running analysis jobs run in background workers
- **Job-Based Model**: All analysis work is organized around a job lifecycle
- **Authentication**: JWT-based authentication with HTTP-only cookies
- **Scalable**: Redis-backed job queue for distributed processing
- **Database-Driven**: PostgreSQL stores all job metadata, findings, and insights

### Job Lifecycle Flow

```
User uploads file
         ↓
Job created (UPLOADED status)
         ↓
Background worker processes (PROCESSING status)
         ↓
Pipeline stages: PREPROCESSED → TYPE_DETECTED → PARSED → NORMALIZED → ANALYZED → INSIGHTS_GENERATED
         ↓
Results available (COMPLETED status)
         ↓
Client retrieves findings and insights
```

---

## Base Response Structure

All JSON API responses (except file downloads) follow a standardized wrapper structure:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Descriptive message about the operation",
  "success": true
}
```

### Response Properties

| Property     | Type    | Description                                                |
| ------------ | ------- | ---------------------------------------------------------- |
| `statusCode` | number  | HTTP status code (200, 201, 400, 401, 403, 404, 500, etc.) |
| `data`       | object  | Response payload (varies by endpoint)                      |
| `message`    | string  | Human-readable message describing the result               |
| `success`    | boolean | `true` if statusCode < 400, otherwise `false`              |

### Example: Successful Response

```json
{
  "statusCode": 200,
  "data": {
    "id": "usr_12345",
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "User data retrieved successfully",
  "success": true
}
```

### Example: Error Response

```json
{
  "statusCode": 400,
  "data": {},
  "message": "Invalid email or password",
  "success": false
}
```

---

## Authentication

### Overview

SentinelX uses **JWT (JSON Web Token)** authentication with HTTP-only cookies for security.

### Cookie Configuration

- **Name**: `token`
- **Type**: HTTP-only (cannot be accessed by JavaScript)
- **Secure**: Set to `true` in production environments
- **SameSite**: `strict` (prevents CSRF attacks)
- **MaxAge**: 5 days (432000 seconds)

### How Authentication Works

1. User signs up or logs in
2. Server validates credentials and generates JWT
3. JWT is set as HTTP-only cookie (automatically sent with subsequent requests)
4. Protected endpoints verify JWT from cookie
5. User can logout to clear the cookie

### Headers

All authenticated endpoints require no explicit header; the cookie is sent automatically by the browser.

**Protected Endpoints**: All endpoints except `/auth/sign-up` and `/auth/login` require authentication.

---

## Rate Limiting

SentinelX implements rate limiting to prevent abuse:

### Rate Limit Tiers

| Endpoint                                                                  | Limit       | Window     |
| ------------------------------------------------------------------------- | ----------- | ---------- |
| Auth endpoints (`/auth/sign-up`, `/auth/login`)                           | 5 requests  | 15 minutes |
| Job operations (`/jobs/upload`, `/jobs/:id/reanalyze`, `/jobs/:id/retry`) | 10 requests | 15 minutes |

### Rate Limit Response

When rate limit is exceeded, the API returns:

```json
{
  "statusCode": 429,
  "data": {},
  "message": "Too many requests. Please try again later.",
  "success": false
}
```

---

## Authentication Routes

### Base URL: `/auth`

All authentication endpoints use rate limiting. Successful login/signup sets an HTTP-only JWT cookie automatically.

---

### 1.1 Sign Up

**Endpoint**: `POST /auth/sign-up`

**Description**: Registers a new user and sets an HTTP-only JWT cookie for authentication.

**Rate Limit**: Yes (authLimiter)

**Request Body (JSON)**:

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Field Validations**:

- `first_name` (required): String, minimum 1 character
- `last_name` (optional): String
- `email` (required): Valid email format
- `password` (required): String (no specific complexity requirements enforced in current version)

**Success Response (201 Created)**:

```json
{
  "statusCode": 201,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  },
  "message": "User registered successfully",
  "success": true
}
```

**Error Responses**:

| Status | Message                        | Reason                     |
| ------ | ------------------------------ | -------------------------- |
| 400    | "Email is required"            | Email field missing        |
| 400    | "Email is invalid"             | Email format is invalid    |
| 400    | "First name is required"       | First name field missing   |
| 400    | "First name must not be empty" | First name is empty string |
| 400    | "Password is required"         | Password field missing     |
| 409    | "Email already exists"         | Email already registered   |

---

### 1.2 Login

**Endpoint**: `POST /auth/login`

**Description**: Authenticates a user and sets an HTTP-only JWT cookie for subsequent authenticated requests.

**Rate Limit**: Yes (authLimiter)

**Request Body (JSON)**:

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Field Validations**:

- `email` (required): Valid email format
- `password` (required): Non-empty string

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  },
  "message": "User logged in successfully",
  "success": true
}
```

**Error Responses**:

| Status | Message                     | Reason                                |
| ------ | --------------------------- | ------------------------------------- |
| 400    | "Email is required"         | Email field missing                   |
| 400    | "Email is invalid"          | Email format is invalid               |
| 400    | "Password is required"      | Password field missing                |
| 401    | "Invalid email or password" | Email not found or password incorrect |

---

### 1.3 Get Current User

**Endpoint**: `GET /auth/me`

**Description**: Retrieves the authenticated user's profile information.

**Authentication**: Required (JWT Cookie)

**Query Parameters**: None

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "User data retrieved successfully",
  "success": true
}
```

**Error Responses**:

| Status | Message        | Reason                               |
| ------ | -------------- | ------------------------------------ |
| 401    | "Unauthorized" | No valid JWT cookie or token expired |

---

### 1.4 Update User

**Endpoint**: `PUT /auth/update/:userId`

**Description**: Updates user profile information (name and/or password). Can update first name, last name, and change password.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `userId` (required): The ID of the user to update. Must match the authenticated user's ID.

**Request Body (JSON)** - All fields optional:

```json
{
  "first_name": "Johnny",
  "last_name": "Smith",
  "current_password": "SecurePassword123!",
  "new_password": "NewSecurePassword456!"
}
```

**Field Validations**:

- `first_name` (optional): String, minimum 1 character if provided
- `last_name` (optional): String, minimum 1 character if provided
- `current_password` (optional): Required if `new_password` is provided
- `new_password` (optional): Required if changing password

**Password Change Logic**:

- To change password, both `current_password` and `new_password` must be provided
- `current_password` is verified against the user's existing password
- If verification fails, the entire update fails

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "first_name": "Johnny",
    "last_name": "Smith"
  },
  "message": "User updated successfully",
  "success": true
}
```

**Error Responses**:

| Status | Message                              | Reason                                          |
| ------ | ------------------------------------ | ----------------------------------------------- |
| 400    | "First name must not be empty"       | First name provided but empty                   |
| 400    | "Last name must not be empty"        | Last name provided but empty                    |
| 400    | "Current password must not be empty" | Current password required but empty             |
| 400    | "New password must not be empty"     | New password required but empty                 |
| 401    | "Incorrect current password"         | Current password doesn't match stored password  |
| 403    | "Unauthorized to update this user"   | userId in path doesn't match authenticated user |
| 401    | "Unauthorized"                       | No valid JWT cookie                             |

---

### 1.5 Delete User

**Endpoint**: `DELETE /auth/delete/:userId`

**Description**: Permanently deletes the user account, all associated jobs, findings, and insights. Clears the authentication cookie.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `userId` (required): The ID of the user to delete. Must match the authenticated user's ID.

**Request Body**: None

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "deletedCount": 1
  },
  "message": "User deleted successfully",
  "success": true
}
```

**Note**: The HTTP-only JWT cookie is automatically cleared by the server.

**Error Responses**:

| Status | Message                            | Reason                                          |
| ------ | ---------------------------------- | ----------------------------------------------- |
| 403    | "Unauthorized to delete this user" | userId in path doesn't match authenticated user |
| 401    | "Unauthorized"                     | No valid JWT cookie                             |

---

### 1.6 Logout

**Endpoint**: `POST /auth/logout`

**Description**: Logs out the user by clearing the JWT authentication cookie.

**Authentication**: Required (JWT Cookie)

**Request Body**: None

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "success": true
  },
  "message": "User logged out successfully",
  "success": true
}
```

**Note**: The HTTP-only JWT cookie is automatically cleared by the server.

**Error Responses**:

| Status | Message        | Reason              |
| ------ | -------------- | ------------------- |
| 401    | "Unauthorized" | No valid JWT cookie |

---

## Job & Analysis Routes

### Base URL: `/jobs`

All job endpoints require JWT authentication. This section covers file upload, job management, and results retrieval.

---

### 2.1 List User Jobs

**Endpoint**: `GET /jobs`

**Description**: Retrieves a paginated list of all analysis jobs created by the authenticated user (dashboard view). Returns summary information for each job.

**Authentication**: Required (JWT Cookie)

**Query Parameters**:

| Parameter | Type   | Default | Max | Description                             |
| --------- | ------ | ------- | --- | --------------------------------------- |
| `limit`   | number | 10      | 100 | Number of jobs per page                 |
| `offset`  | number | 0       | -   | Number of jobs to skip (for pagination) |

**Example Request**:

```
GET /jobs?limit=20&offset=40
```

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "jobs": [
      {
        "jobId": "job_98765-uuid",
        "fileName": "auth-logs.txt",
        "status": "COMPLETED",
        "severity": "HIGH",
        "createdAt": "2026-05-26T10:00:00.000Z"
      },
      {
        "jobId": "job_98764-uuid",
        "fileName": "access-logs.log",
        "status": "PROCESSING",
        "severity": undefined,
        "createdAt": "2026-05-25T15:30:00.000Z"
      },
      {
        "jobId": "job_98763-uuid",
        "fileName": "error-logs.log",
        "status": "FAILED",
        "severity": undefined,
        "createdAt": "2026-05-25T14:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 40,
      "total": 127
    }
  },
  "message": "User jobs retrieved successfully",
  "success": true
}
```

**Response Field Descriptions**:

- `jobId`: Unique identifier for the job
- `fileName`: Original filename uploaded by user
- `status`: Current job status (UPLOADED, PROCESSING, COMPLETED, FAILED)
- `severity`: Only present for COMPLETED jobs, indicates overall threat level (HIGH, MEDIUM, LOW, etc.)
- `createdAt`: ISO timestamp when job was created
- `pagination.total`: Total number of jobs for this user

**Error Responses**:

| Status | Message                         | Reason                                           |
| ------ | ------------------------------- | ------------------------------------------------ |
| 400    | "Invalid pagination parameters" | limit or offset is invalid (NaN, negative, etc.) |
| 401    | "Unauthorized"                  | No valid JWT cookie                              |

---

### 2.2 Upload File

**Endpoint**: `POST /jobs/upload`

**Description**: Uploads a log file and initiates a new analysis job. The file is stored on disk and a job record is created in the database. The job is immediately enqueued for processing.

**Authentication**: Required (JWT Cookie)

**Rate Limit**: Yes (jobLimiter)

**Request Body (Multipart/Form-Data)**:

| Field  | Type | Required | Description                 |
| ------ | ---- | -------- | --------------------------- |
| `file` | file | Yes      | The log file to be analyzed |

**File Validation**:

- File must be present (not null/undefined)
- File must not be empty (size > 0 bytes)
- File types accepted: Any (no specific extension validation, but typical: .log, .txt, .json)
- Max file size: 300MB (enforced by multer middleware)

**Example Request**:

```bash
curl -X POST http://localhost:3000/jobs/upload \
  -H "Cookie: token=<JWT>" \
  -F "file=@auth-logs.txt"
```

**Success Response (201 Created)**:

```json
{
  "statusCode": 201,
  "data": {
    "job_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "UPLOADED",
    "file_name": "auth-logs.txt",
    "file_size": 1048576,
    "created_at": "2026-05-26T10:00:00.000Z"
  },
  "message": "File uploaded successfully. Job created.",
  "success": true
}
```

**Response Field Descriptions**:

- `job_id`: Unique identifier for the created job
- `status`: Always "UPLOADED" initially
- `file_name`: Name of the uploaded file
- `file_size`: File size in bytes
- `created_at`: Job creation timestamp

**Error Responses**:

| Status | Message                                   | Reason                             |
| ------ | ----------------------------------------- | ---------------------------------- |
| 400    | "No file provided. Please upload a file." | Request body missing file field    |
| 400    | "Uploaded file is empty"                  | File size is 0 bytes               |
| 400    | "File storage failed"                     | File path not set (internal error) |
| 413    | "Payload too large"                       | File exceeds 300MB limit           |
| 429    | "Too many requests"                       | Rate limit exceeded                |
| 401    | "Unauthorized"                            | No valid JWT cookie                |

---

### 2.3 Get Job Status

**Endpoint**: `GET /jobs/:id/status`

**Description**: Retrieves the real-time processing status, current pipeline stage, and progress percentage for a specific job. Use this to poll for job completion.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Query Parameters**: None

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "PROCESSING",
    "currentStage": "ANALYZED",
    "progress": 85,
    "lastUpdated": "2026-05-26T10:02:30.000Z"
  },
  "message": "Job status retrieved",
  "success": true
}
```

**Response Field Descriptions**:

- `jobId`: The job ID
- `status`: Current lifecycle status (UPLOADED, PROCESSING, COMPLETED, FAILED)
- `currentStage`: Current pipeline stage being executed (PREPROCESSED, TYPE_DETECTED, PARSED, NORMALIZED, ANALYZED, INSIGHTS_GENERATED, COMPLETED)
- `progress`: Progress percentage (0-100)
- `lastUpdated`: ISO timestamp of last status update

**Status Transitions**:

- Initial: UPLOADED (0%)
- Processing: PREPROCESSING (5%) → TYPE_DETECTED (10%) → PARSED (30%) → NORMALIZED (50%) → ANALYZED (70%) → INSIGHTS_GENERATED (90%)
- Final: COMPLETED (100%) or FAILED

**Error Response (with error message)**:

```json
{
  "statusCode": 200,
  "data": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "FAILED",
    "currentStage": "PARSED",
    "progress": 30,
    "lastUpdated": "2026-05-26T10:05:00.000Z",
    "error": "Failed to normalize logs: Invalid log format"
  },
  "message": "Job status retrieved",
  "success": true
}
```

**Error Responses**:

| Status | Message                           | Reason                           |
| ------ | --------------------------------- | -------------------------------- |
| 400    | "Job ID is required"              | ID path parameter missing        |
| 404    | "Job not found"                   | Job ID doesn't exist in database |
| 403    | "Unauthorized to access this job" | Job belongs to different user    |
| 401    | "Unauthorized"                    | No valid JWT cookie              |

---

### 2.4 Get Complete Job Information

**Endpoint**: `GET /jobs/:id`

**Description**: Retrieves comprehensive job metadata and configuration including file information, status, stage, progress, outcome, and error messages. Provides a complete snapshot of the job state.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Query Parameters**: None

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "auth-logs.txt",
    "file_size": 1048576,
    "status": "COMPLETED",
    "current_stage": "COMPLETED",
    "progress": 100,
    "outcome": "SUCCESS",
    "error_message": null,
    "retry_count": 0,
    "created_at": "2026-05-26T10:00:00.000Z",
    "updated_at": "2026-05-26T10:05:00.000Z"
  },
  "message": "Complete job information retrieved",
  "success": true
}
```

**Response Field Descriptions**:

- `id`: Job ID
- `user_id`: User who created the job
- `file_name`: Original uploaded filename
- `file_size`: File size in bytes
- `status`: Current job status (UPLOADED, PROCESSING, COMPLETED, FAILED)
- `current_stage`: Current pipeline stage
- `progress`: Progress percentage (0-100)
- `outcome`: Result quality (SUCCESS, WARNING, or null if not completed)
  - SUCCESS: All analysis components completed successfully
  - WARNING: Analysis completed but some components had issues (e.g., ML model unavailable)
- `error_message`: Error description if status is FAILED, otherwise null
- `retry_count`: Number of times this job has been retried
- `created_at`: ISO timestamp when job was created
- `updated_at`: ISO timestamp of last update

**Example: Completed with Warnings**:

```json
{
  "statusCode": 200,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "file_name": "auth-logs.txt",
    "file_size": 1048576,
    "status": "COMPLETED",
    "current_stage": "COMPLETED",
    "progress": 100,
    "outcome": "WARNING",
    "error_message": null,
    "retry_count": 1,
    "created_at": "2026-05-26T10:00:00.000Z",
    "updated_at": "2026-05-26T10:05:00.000Z"
  },
  "message": "Complete job information retrieved",
  "success": true
}
```

**Error Responses**:

| Status | Message                           | Reason                        |
| ------ | --------------------------------- | ----------------------------- |
| 400    | "Job ID is required"              | ID path parameter missing     |
| 404    | "Job not found"                   | Job ID doesn't exist          |
| 403    | "Unauthorized to access this job" | Job belongs to different user |
| 401    | "Unauthorized"                    | No valid JWT cookie           |

---

### 2.5 Get Job Results (Comprehensive)

**Endpoint**: `GET /jobs/:id/results`

**Description**: Retrieves combined analysis results including both AI-generated insights and analyzer findings/threats. Returns comprehensive results for a completed job or status info if still processing.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Query Parameters**:

| Parameter | Type   | Default | Max | Description                |
| --------- | ------ | ------- | --- | -------------------------- |
| `limit`   | number | 20      | 100 | Number of results per page |
| `offset`  | number | 0       | -   | Number of results to skip  |

**Example Request**:

```
GET /jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/results?limit=50&offset=0
```

**Success Response - Still Processing (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "PROCESSING",
    "message": "Results not ready yet",
    "progress": 65
  },
  "message": "Job is still processing",
  "success": true
}
```

**Success Response - Completed (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "COMPLETED",
    "findings": [
      {
        "id": "fnd_001",
        "analyzer": "brute_force_detector",
        "finding_type": "BRUTE_FORCE_ATTACK",
        "severity": "CRITICAL",
        "confidence": 0.98,
        "title": "SSH Brute Force Attack Detected",
        "summary": "Multiple failed SSH login attempts detected from IP 192.168.1.100",
        "recommendation": "Block the source IP and review recent access attempts",
        "affected_entities": {
          "source_ip": "192.168.1.100",
          "target_service": "SSH",
          "attempt_count": 245
        },
        "detected_at": "2026-05-26T09:45:00.000Z"
      }
    ],
    "insights": [
      {
        "id": "ins_001",
        "insight_type": "ATTACK_PATTERN",
        "title": "Coordinated Attack Pattern Identified",
        "description": "Analysis reveals a coordinated multi-vector attack involving SSH brute force, credential stuffing, and privilege escalation attempts.",
        "severity": "CRITICAL",
        "priority_score": 0.95,
        "confidence_score": 0.92,
        "generated_by": "LLM",
        "model_name": "gpt-4",
        "data": {
          "pattern_overview": "Coordinated attack detected",
          "affected_systems": ["SSH", "HTTP"],
          "recommended_actions": [
            "Isolate affected systems",
            "Review logs for data exfiltration"
          ]
        }
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total_findings": 47,
      "total_insights": 8
    }
  },
  "message": "Job results retrieved successfully",
  "success": true
}
```

**Success Response - Failed (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "FAILED",
    "error": "Failed to parse log file: Unsupported format"
  },
  "message": "Job failed during analysis",
  "success": true
}
```

**Field Descriptions** (Findings):

- `id`: Unique finding identifier
- `analyzer`: Which analyzer detected this (e.g., brute_force_detector, anomaly_detector)
- `finding_type`: Type of threat detected
- `severity`: CRITICAL, HIGH, MEDIUM, LOW, INFO
- `confidence`: Confidence score (0-1)
- `title`: Human-readable title
- `summary`: Brief description
- `recommendation`: Suggested action
- `affected_entities`: JSON object with affected systems/IPs/users
- `detected_at`: ISO timestamp

**Field Descriptions** (Insights):

- `id`: Unique insight identifier
- `insight_type`: Type of insight (ATTACK_PATTERN, ANOMALY, SUMMARY, RECOMMENDATION)
- `title`: Short title
- `description`: Detailed description
- `severity`: CRITICAL, HIGH, MEDIUM, LOW, INFO
- `priority_score`: 0-1 score for prioritization
- `confidence_score`: 0-1 confidence level
- `generated_by`: How generated (LLM, RULE_BASED, ML)
- `model_name`: Which model generated it
- `data`: JSON payload with detailed insight data

**Error Responses**:

| Status | Message                           | Reason                        |
| ------ | --------------------------------- | ----------------------------- |
| 400    | "Job ID is required"              | ID path parameter missing     |
| 400    | "Invalid pagination parameters"   | limit or offset is invalid    |
| 404    | "Job not found"                   | Job doesn't exist             |
| 403    | "Unauthorized to access this job" | Job belongs to different user |
| 401    | "Unauthorized"                    | No valid JWT cookie           |

---

### 2.6 Get Job Insights Only

**Endpoint**: `GET /jobs/:id/insights`

**Description**: Retrieves ONLY AI-generated insights from the insights table. Use this for quicker retrieval if you only need insights, not raw findings.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Query Parameters**:

| Parameter | Type   | Default | Max | Description                 |
| --------- | ------ | ------- | --- | --------------------------- |
| `limit`   | number | 20      | 100 | Number of insights per page |
| `offset`  | number | 0       | -   | Number of insights to skip  |

**Example Request**:

```
GET /jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/insights?limit=10&offset=0
```

**Success Response - Still Processing (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "PROCESSING",
    "message": "Insights not ready yet",
    "progress": 65,
    "insights": []
  },
  "message": "Job is still processing",
  "success": true
}
```

**Success Response - Completed (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "COMPLETED",
    "insights": [
      {
        "id": "ins_001",
        "insight_type": "ATTACK_PATTERN",
        "title": "Coordinated Attack Pattern Identified",
        "description": "Analysis reveals a coordinated multi-vector attack involving SSH brute force, credential stuffing, and privilege escalation attempts.",
        "severity": "CRITICAL",
        "priority_score": 0.95,
        "confidence_score": 0.92,
        "generated_by": "LLM",
        "model_name": "gpt-4",
        "generation_version": "1.0",
        "data": {
          "pattern_overview": "Coordinated attack detected",
          "affected_systems": ["SSH", "HTTP"],
          "timeline": "2026-05-26T09:00:00Z to 2026-05-26T14:00:00Z",
          "recommended_actions": [
            "Isolate affected systems immediately",
            "Review logs for data exfiltration",
            "Force password resets for affected users",
            "Enable 2FA on all critical accounts"
          ]
        },
        "is_visible": true,
        "display_order": 1,
        "created_at": "2026-05-26T10:30:00.000Z"
      },
      {
        "id": "ins_002",
        "insight_type": "ANOMALY",
        "title": "Unusual Access Pattern from Offshore IP",
        "description": "Detected access attempts from an IP geolocation that doesn't match normal user behavior patterns.",
        "severity": "HIGH",
        "priority_score": 0.82,
        "confidence_score": 0.88,
        "generated_by": "LLM",
        "model_name": "gpt-4",
        "data": {
          "anomaly_type": "Geographic Anomaly",
          "source_ip": "123.45.67.89",
          "geolocation": "CN",
          "expected_location": "US",
          "access_frequency": "45 requests in 2 hours"
        }
      }
    ],
    "pagination": {
      "limit": 10,
      "offset": 0,
      "total": 8
    }
  },
  "message": "Job insights retrieved successfully",
  "success": true
}
```

**Success Response - Failed (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "FAILED",
    "error": "Analysis failed: Parser could not process log format",
    "insights": []
  },
  "message": "Job failed during analysis",
  "success": true
}
```

**Error Responses**:

| Status | Message                           | Reason                        |
| ------ | --------------------------------- | ----------------------------- |
| 400    | "Job ID is required"              | ID path parameter missing     |
| 400    | "Invalid pagination parameters"   | limit or offset invalid       |
| 404    | "Job not found"                   | Job doesn't exist             |
| 403    | "Unauthorized to access this job" | Job belongs to different user |
| 401    | "Unauthorized"                    | No valid JWT cookie           |

---

### 2.7 Get Job Findings Only

**Endpoint**: `GET /jobs/:id/findings`

**Description**: Retrieves ONLY analyzer findings (threat detections) from the analyzer_findings table. Use this for direct threat detection results without insights.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Query Parameters**:

| Parameter | Type   | Default | Max | Description                 |
| --------- | ------ | ------- | --- | --------------------------- |
| `limit`   | number | 20      | 100 | Number of findings per page |
| `offset`  | number | 0       | -   | Number of findings to skip  |

**Example Request**:

```
GET /jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/findings?limit=50&offset=0
```

**Success Response - Still Processing (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "PROCESSING",
    "message": "Findings not ready yet",
    "progress": 70,
    "findings": []
  },
  "message": "Job is still processing",
  "success": true
}
```

**Success Response - Completed (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "COMPLETED",
    "findings": [
      {
        "id": "fnd_001",
        "analyzer": "brute_force_detector",
        "analyzer_version": "2.1.0",
        "finding_type": "BRUTE_FORCE_ATTACK",
        "category": "AUTHENTICATION_ATTACK",
        "severity": "CRITICAL",
        "confidence": 0.98,
        "title": "SSH Brute Force Attack Detected",
        "summary": "Multiple failed SSH login attempts detected from IP 192.168.1.100",
        "recommendation": "Block the source IP immediately and review access logs for successful breaches",
        "affected_entities": {
          "source_ip": "192.168.1.100",
          "target_service": "SSH",
          "target_port": 22,
          "attempt_count": 245,
          "success_count": 0
        },
        "evidence": {
          "failed_attempts": 245,
          "time_span": "30 minutes",
          "attempted_usernames": ["admin", "root", "user", "test"],
          "log_sample": "May 26 09:45:00 server sshd: Invalid user admin from 192.168.1.100"
        },
        "log_references": ["log_ref_001", "log_ref_002", "log_ref_003"],
        "status": "ACTIVE",
        "detected_at": "2026-05-26T09:45:00.000Z",
        "created_at": "2026-05-26T10:30:00.000Z"
      },
      {
        "id": "fnd_002",
        "analyzer": "privilege_escalation_detector",
        "analyzer_version": "1.5.0",
        "finding_type": "PRIVILEGE_ESCALATION",
        "category": "PRIVILEGE_ATTACK",
        "severity": "HIGH",
        "confidence": 0.89,
        "title": "Potential Privilege Escalation Attempt",
        "summary": "User 'apache' attempted to execute commands with sudo privileges",
        "recommendation": "Verify if this is legitimate system activity and adjust sudo rules if necessary",
        "affected_entities": {
          "user": "apache",
          "attempted_privilege_level": "root",
          "command": "sudo cat /etc/shadow"
        },
        "evidence": {
          "timestamp": "2026-05-26T10:15:00Z",
          "sudo_attempt": true,
          "permission_denied": true
        },
        "status": "ACTIVE",
        "detected_at": "2026-05-26T10:15:00.000Z"
      }
    ],
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 47
    }
  },
  "message": "Job findings retrieved successfully",
  "success": true
}
```

**Success Response - Failed (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "FAILED",
    "error": "Parsing failed: Unrecognized log format",
    "findings": []
  },
  "message": "Job failed during analysis",
  "success": true
}
```

**Field Descriptions** (Findings):

- `id`: Unique finding identifier (UUID)
- `analyzer`: Name of the detector that found this (brute_force_detector, privilege_escalation_detector, etc.)
- `analyzer_version`: Version of the analyzer
- `finding_type`: Type of threat (BRUTE_FORCE_ATTACK, PRIVILEGE_ESCALATION, ANOMALY, etc.)
- `category`: Categorized threat type
- `severity`: CRITICAL, HIGH, MEDIUM, LOW, INFO
- `confidence`: Confidence score (0-1, where 1 is certain)
- `title`: Human-readable finding title
- `summary`: Brief description of the finding
- `recommendation`: Suggested remediation action
- `affected_entities`: JSON object with affected IPs, users, services, etc.
- `evidence`: JSON object with supporting evidence and details
- `log_references`: Array of log entry references/IDs
- `status`: ACTIVE, RESOLVED, DISMISSED, or DUPLICATE
- `detected_at`: ISO timestamp when threat was detected
- `created_at`: ISO timestamp when finding was created

**Error Responses**:

| Status | Message                           | Reason                        |
| ------ | --------------------------------- | ----------------------------- |
| 400    | "Job ID is required"              | ID path parameter missing     |
| 400    | "Invalid pagination parameters"   | limit or offset invalid       |
| 404    | "Job not found"                   | Job doesn't exist             |
| 403    | "Unauthorized to access this job" | Job belongs to different user |
| 401    | "Unauthorized"                    | No valid JWT cookie           |

---

### 2.8 Download Raw Job File

**Endpoint**: `GET /jobs/:id/file`

**Description**: Downloads the original raw log file that was uploaded by the user. Useful for manual review or external analysis.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Query Parameters**: None

**Response Type**: `application/octet-stream` (Binary file, NOT JSON-wrapped)

**Response Headers**:

```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="auth-logs.txt"
Content-Length: 1048576
```

**Example Request**:

```bash
curl -X GET http://localhost:3000/jobs/f47ac10b-58cc-4372-a567-0e02b2c3d479/file \
  -H "Cookie: token=<JWT>" \
  -o auth-logs.txt
```

**Success Response**: File is streamed directly to client for download (not wrapped in JSON response)

**Error Responses** (Returns JSON error):

| Status | Message                              | Reason                        |
| ------ | ------------------------------------ | ----------------------------- |
| 400    | "Job ID is required"                 | ID path parameter missing     |
| 404    | "Job not found"                      | Job doesn't exist             |
| 403    | "Unauthorized to download this file" | Job belongs to different user |
| 500    | "Failed to download file"            | File storage or stream error  |
| 401    | "Unauthorized"                       | No valid JWT cookie           |

---

### 2.9 Reanalyze Job

**Endpoint**: `POST /jobs/:id/reanalyze`

**Description**: Re-runs the analysis engines on a job using previously normalized data. This bypasses the parsing and normalization stages and only re-executes the analysis and insights generation. Useful when analyzer algorithms are updated.

**Authentication**: Required (JWT Cookie)

**Rate Limit**: Yes (jobLimiter)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Request Body**: None

**Preconditions**:

- Normalized logs must exist for this job (job must have reached at least NORMALIZED stage)
- If this condition is not met, the endpoint returns 400 error

**Success Response (202 Accepted)**:

```json
{
  "statusCode": 202,
  "data": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "REPROCESSING",
    "message": "Job re-enqueued for analysis from normalized logs"
  },
  "message": "Job reanalysis initiated",
  "success": true
}
```

**Response Details**:

- Status code 202 (Accepted) indicates the job has been re-enqueued
- The job's status will become PROCESSING and it will be re-analyzed
- Check `/jobs/:id/status` to track progress
- Previous insights and findings will be cleared and regenerated

**Example Workflow**:

1. User uploads file → Job processes through all stages
2. Developer updates analyzer algorithms
3. User calls `/reanalyze` → Job starts analysis again with new algorithms
4. Previous normalized logs are reused (faster than full reprocessing)

**Error Responses**:

| Status | Message                                                                            | Reason                                 |
| ------ | ---------------------------------------------------------------------------------- | -------------------------------------- |
| 400    | "Job ID is required"                                                               | ID path parameter missing              |
| 400    | "Cannot reanalyze: normalized logs do not exist. Job must be at least NORMALIZED." | Job hasn't reached normalization stage |
| 404    | "Job not found"                                                                    | Job doesn't exist                      |
| 403    | "Unauthorized to access this job"                                                  | Job belongs to different user          |
| 500    | "Failed to requeue job for reanalysis"                                             | Internal queue error                   |
| 429    | "Too many requests"                                                                | Rate limit exceeded                    |
| 401    | "Unauthorized"                                                                     | No valid JWT cookie                    |

---

### 2.10 Retry Job (Full Reset)

**Endpoint**: `POST /jobs/:id/retry`

**Description**: Completely resets a failed or stuck job to its initial UPLOADED state and re-queues it for full reprocessing from scratch. This clears ALL pipeline outputs (normalized logs, findings, insights) but keeps the original file intact.

**Authentication**: Required (JWT Cookie)

**Rate Limit**: Yes (jobLimiter)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Request Body**: None

**Preconditions**:

- Original uploaded file must still exist on disk
- If file is missing, returns 400 error

**Success Response (202 Accepted)**:

```json
{
  "statusCode": 202,
  "data": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "status": "UPLOADED",
    "message": "Job reset to initial state and re-queued for processing"
  },
  "message": "Job retry initiated",
  "success": true
}
```

**What Gets Cleared**:

- All pipeline stages reset to initial state
- All normalized logs deleted
- All analyzer findings deleted
- All insights deleted
- Job progress set to 0%
- Job status set to UPLOADED
- Error messages cleared
- Retry count incremented

**What Is Kept**:

- Original uploaded file (on disk)
- User ID and job ID (unchanged)
- File metadata (name, size)

**Use Cases**:

- Job failed due to temporary error → Retry with fresh processing
- Pipeline had a bug that was fixed → Retry to reprocess with fixed code
- Analysis seemed incomplete → Retry to ensure full processing

**Error Responses**:

| Status | Message                                        | Reason                        |
| ------ | ---------------------------------------------- | ----------------------------- |
| 400    | "Job ID is required"                           | ID path parameter missing     |
| 400    | "Cannot retry: original file no longer exists" | File was manually deleted     |
| 404    | "Job not found"                                | Job doesn't exist             |
| 403    | "Unauthorized to access this job"              | Job belongs to different user |
| 500    | "Failed to requeue job for retry"              | Internal queue error          |
| 429    | "Too many requests"                            | Rate limit exceeded           |
| 401    | "Unauthorized"                                 | No valid JWT cookie           |

---

### 2.11 Delete Job

**Endpoint**: `DELETE /jobs/:id`

**Description**: Permanently deletes a job and cascades deletion of all associated data. Removes job record, all findings, all insights, normalized logs, and the original uploaded file from disk.

**Authentication**: Required (JWT Cookie)

**Path Parameters**:

- `id` (required): Job ID (UUID format)

**Request Body**: None

**Cascade Deletions**:

- Job record from jobs table
- All analyzer_findings associated with job
- All insights associated with job
- All normalized_logs associated with job
- Original uploaded file from disk storage

**Success Response (200 OK)**:

```json
{
  "statusCode": 200,
  "data": {
    "jobId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "message": "Job deleted successfully"
  },
  "message": "Job and associated data deleted",
  "success": true
}
```

**Important Notes**:

- Deletion is PERMANENT and CANNOT be undone
- All findings and insights are lost
- Original file is removed from disk
- Database records are deleted
- This operation is irreversible

**Error Responses**:

| Status | Message                           | Reason                        |
| ------ | --------------------------------- | ----------------------------- |
| 400    | "Job ID is required"              | ID path parameter missing     |
| 404    | "Job not found"                   | Job doesn't exist             |
| 403    | "Unauthorized to delete this job" | Job belongs to different user |
| 401    | "Unauthorized"                    | No valid JWT cookie           |

---

## Job Status & Progress Tracking

### Job Lifecycle States

Every job transitions through the following states:

```
UPLOADED (initial)
    ↓
PROCESSING (while running)
    ├→ COMPLETED (success)
    └→ FAILED (error)
```

### Pipeline Stages

During PROCESSING status, the job progresses through these internal stages:

| Stage              | Progress | Description                                   |
| ------------------ | -------- | --------------------------------------------- |
| UPLOADED           | 0%       | File uploaded, awaiting processing            |
| PREPROCESSED       | 5%       | File preprocessed and cleaned                 |
| TYPE_DETECTED      | 10%      | Log format detected                           |
| PARSED             | 30%      | Logs parsed into structured data              |
| NORMALIZED         | 50%      | Logs normalized to standard format            |
| ANALYZED           | 70%      | Security analysis complete, findings detected |
| INSIGHTS_GENERATED | 90%      | AI insights generated                         |
| COMPLETED          | 100%     | All processing complete                       |

### Job Outcome

When a job completes (status = COMPLETED), it has an outcome:

| Outcome | Meaning                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------- |
| SUCCESS | All analysis components completed successfully, findings ready                                       |
| WARNING | Analysis completed but some components had issues (e.g., ML model unavailable), results still usable |
| null    | Job not yet completed                                                                                |

### Checking Job Progress

**Quick Status Check** (lightweight):

```bash
GET /jobs/:id/status
→ Returns: jobId, status, currentStage, progress, error
```

**Full Job Details** (comprehensive):

```bash
GET /jobs/:id
→ Returns: All metadata, outcome, retry_count, created_at, updated_at
```

**Polling for Completion**:

1. Upload file via `POST /jobs/upload` → Get jobId
2. Poll `GET /jobs/:id/status` every 2-5 seconds
3. When status changes from PROCESSING to COMPLETED/FAILED, fetch results
4. Get findings via `GET /jobs/:id/findings`
5. Get insights via `GET /jobs/:id/insights`

---

## Error Handling

### HTTP Status Codes

| Code | Meaning           | Example                                   |
| ---- | ----------------- | ----------------------------------------- |
| 200  | OK                | Request successful                        |
| 201  | Created           | Resource created (job upload)             |
| 202  | Accepted          | Async operation queued (reanalyze, retry) |
| 400  | Bad Request       | Invalid input, validation failure         |
| 401  | Unauthorized      | Missing or invalid JWT                    |
| 403  | Forbidden         | User doesn't own resource                 |
| 404  | Not Found         | Resource doesn't exist                    |
| 409  | Conflict          | Resource already exists (duplicate email) |
| 413  | Payload Too Large | File exceeds size limit                   |
| 429  | Too Many Requests | Rate limit exceeded                       |
| 500  | Server Error      | Internal server error                     |

### Error Response Format

All error responses follow the standard structure:

```json
{
  "statusCode": 400,
  "data": {},
  "message": "Human-readable error message",
  "success": false
}
```

### Common Error Scenarios

**Authentication Missing**:

```json
{
  "statusCode": 401,
  "data": {},
  "message": "Unauthorized",
  "success": false
}
```

**User Owns Different Resource**:

```json
{
  "statusCode": 403,
  "data": {},
  "message": "Unauthorized to access this job",
  "success": false
}
```

**Job Still Processing**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "PROCESSING",
    "message": "Results not ready yet",
    "progress": 45
  },
  "message": "Job is still processing",
  "success": true
}
```

**Job Failed**:

```json
{
  "statusCode": 200,
  "data": {
    "status": "FAILED",
    "error": "Failed to parse log file: Unsupported format detected"
  },
  "message": "Job failed during analysis",
  "success": true
}
```

### Handling Async Operations

When calling `/reanalyze` or `/retry` (202 Accepted responses), the operation is queued:

1. Endpoint returns immediately with 202
2. Job processing starts in background
3. Poll `/jobs/:id/status` to track progress
4. When complete, status changes to COMPLETED or FAILED

---

## Best Practices

### Rate Limiting

- Respect rate limits to avoid blocking
- Implement exponential backoff on 429 responses
- Auth endpoints: 5 requests per 15 minutes
- Job endpoints: 10 requests per 15 minutes

### Polling Strategy

- Poll job status every 2-5 seconds (not more frequently)
- Use exponential backoff: 2s → 5s → 10s → 30s
- Stop polling when job reaches COMPLETED or FAILED

### Error Handling

- Check `success` field to determine if response succeeded
- For 200/201/202: Check `data` for actual result
- For errors: Read `message` for description
- For async operations: Check status field periodically

### File Handling

- Max file size: 300MB
- Supported formats: Text-based logs (.log, .txt, .json, etc.)
- Use `/jobs/:id/file` to download original file later
- Files are kept until job is deleted

### Security

- Tokens are in HTTP-only cookies (secure against XSS)
- Never expose JWT tokens in URLs or logs
- Tokens expire after 5 days
- Always use HTTPS in production

---
