# SentinelX – System Architecture Document (SAD)

## 1. Overview

This document describes the high-level and detailed architecture of SentinelX, a log-based Smart Intrusion Detection System (IDS). It defines system components, data flow, processing pipeline, and interactions between services.

---

## 2. Architecture Style

SentinelX follows an **asynchronous, distributed processing architecture** using a queue-worker model.

### Key Characteristics:

* Asynchronous job processing
* Decoupled services
* Fault-tolerant design
* Scalable components

---

## 3. High-Level Components

### 3.1 Frontend

* React-based UI
* Handles file uploads and displays results

### 3.2 Backend API (Node.js)

* Handles client requests
* Authentication (JWT)
* Job creation and tracking
* Pushes jobs to queue

### 3.3 Queue System

* Manages background jobs
* Ensures reliable job execution

### 3.4 Worker Service

* Processes jobs from queue
* Executes pipeline stages
* Updates job state

### 3.5 ML Service (Python FastAPI)

* Performs anomaly detection
* Runs parallel to rule-based analysis

### 3.6 Database (PostgreSQL)

* Stores job metadata
* Stores insights
* Tracks processing stages

### 3.7 File Storage

* Stores raw and intermediate log files
* Local (initial) → Cloud (future)

---

## 4. Data Flow

### Upload Flow

1. User uploads file via frontend
2. Request hits backend API
3. File is validated and stored
4. Job is created in DB
5. Job is pushed to queue
6. Response (jobId) returned to user

### Processing Flow

1. Worker picks job from queue
2. Reads job state from DB
3. Executes pipeline stages sequentially
4. Updates checkpoint after each stage
5. Stores intermediate outputs
6. Generates final insights

### Result Flow

1. User polls status API
2. Backend fetches job state
3. Returns progress and stage
4. Once completed, user fetches results

---

## 5. Processing Pipeline

```text
UPLOAD → PARSE → NORMALIZE → ANALYZE → INSIGHTS
```

### Stage Details:

#### 5.1 Parsing

* Converts raw logs into structured format

#### 5.2 Type Detection

* Identifies log type (auth, system, network)

#### 5.3 Normalization

* Standardizes log format

#### 5.4 Analysis

* Rule-based detection
* Type-specific analyzers
* ML-based analysis (parallel)

#### 5.5 Insights Generation

* Aggregates results
* Generates summary and threat data

---

## 6. Job Processing Model

### Job Lifecycle

```text
UPLOADED → PARSING → NORMALIZED → ANALYZING → COMPLETED
```

### Key Concepts:

* Each stage is checkpointed
* System resumes from last completed stage
* Idempotent execution ensures safe retries

---

## 7. Queue & Worker Architecture

### Queue

* Stores job payload (jobId)
* Handles retries and scheduling

### Worker

* Pulls job from queue
* Fetches job data from DB
* Executes pipeline stages
* Updates job state

---

## 8. Fault Tolerance & Recovery

### Mechanisms:

* Retry logic (limited attempts)
* Checkpoint-based recovery
* Idempotent stage execution

### Self-Healing:

* Detect missing outputs
* Re-run only affected stage

---

## 9. Communication Between Services

### Backend ↔ ML Service

* HTTP-based communication
* Batch processing of normalized logs

### Backend ↔ Database

* CRUD operations
* State tracking

---

## 10. Storage Strategy

### File Storage

* Raw logs
* Parsed logs
* Normalized logs

### Database Storage

* Job metadata
* Processing state
* Insights

---

## 11. Security Considerations

* JWT authentication
* User-based job isolation
* Input validation for uploads

---

## 12. Scalability Considerations

* Multiple workers can process jobs
* Queue-based load distribution
* ML service can scale independently

---

## 13. Future Improvements

* Move file storage to cloud (S3)
* Introduce streaming pipeline
* Add real-time updates via WebSockets

---

## 14. Summary

SentinelX architecture ensures scalability, reliability, and modularity by leveraging an asynchronous job-based processing system with clear separation of concerns.
