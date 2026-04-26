# SentinelX – Product Requirements Document (PRD)

## 1. Overview

SentinelX is a **log-based Smart Intrusion Detection System (IDS)** designed to analyze system and application logs to detect anomalies, suspicious behavior, and potential security threats. The system ingests raw logs, processes them through a structured pipeline, and generates actionable insights for users.

---

## 2. Problem Statement

Modern systems generate large volumes of logs, but:

* Logs are **unstructured and difficult to analyze manually**
* Security threats often go **undetected in raw logs**
* Existing tools are either **too complex or too expensive**

SentinelX aims to provide a **developer-friendly, intelligent log analysis system** that simplifies threat detection.

---

## 3. Goals & Objectives

### Primary Goals

* Detect suspicious patterns in logs
* Provide actionable security insights
* Handle large log files efficiently
* Ensure system reliability and fault tolerance

### Secondary Goals

* Support extensibility for ML-based detection
* Provide near real-time feedback on log analysis
* Maintain scalability for large datasets

---

## 4. Target Users

### Primary Users

* Developers
* DevOps engineers
* Security analysts (entry to mid-level)

### Use Cases

* Upload logs for analysis
* Identify failed login attempts
* Detect abnormal traffic patterns
* Investigate system anomalies

---

## 5. Core Features

### 5.1 Log Upload

* Users can upload log files
* Supports common formats: `.log`, `.txt`, `.json`
* File validation (size, format)

### 5.2 Asynchronous Processing

* Logs are processed in background jobs
* Users receive a `jobId` to track progress

### 5.3 Status Tracking

* Users can track processing status
* Shows current stage and approximate progress

### 5.4 Threat Detection

* Rule-based detection
* Type-specific analysis
* ML-based anomaly detection (future enhancement)

### 5.5 Insights Generation

* Summarized results
* Threat categorization
* Severity levels

### 5.6 Results Retrieval

* Users can fetch final analysis results
* Supports partial completion with warnings

---

## 6. Functional Requirements

### Upload Flow

1. User uploads file
2. System validates file
3. Job is created
4. File is stored
5. Job is queued for processing

### Processing Flow

1. Parsing logs
2. Type detection
3. Normalization
4. Analysis
5. Insights generation

### Result Flow

1. User requests status
2. User fetches results
3. System returns insights

---

## 7. Non-Functional Requirements

### Performance

* Handle large log files efficiently
* Async processing to avoid blocking

### Scalability

* Queue-based architecture
* Horizontal scaling support

### Reliability

* Retry mechanisms
* Checkpoint-based recovery

### Security

* JWT-based authentication
* Data isolation per user

---

## 8. Success Metrics

* Accurate threat detection rate
* Processing time per log file
* System uptime
* User engagement (job completion rate)

---

## 9. Constraints & Assumptions

### Constraints

* Initial version uses local storage
* ML integration is limited in early stages

### Assumptions

* Users upload well-formed logs
* System runs in controlled environment initially

---

## 10. Future Enhancements

* Real-time streaming log analysis
* Advanced ML models
* Dashboard visualization
* Alerting system (email/webhooks)

---

## 11. Out of Scope (Current Phase)

* Full SIEM capabilities
* Real-time intrusion prevention
* Enterprise-level compliance features

---

## 12. Summary

SentinelX provides a structured, scalable, and intelligent approach to log-based intrusion detection, focusing on usability, reliability, and extensibility.
