# 🛡️ SentinelX — Smart Intrusion Detection System (IDS) — Project Architecture (Final Vision)

---

## 🎯 Project Goal

The SentinelX (Smart Intrusion Detection System) is designed as a **full-stack intelligent security monitoring platform** that:

- Accepts logs from multiple sources (authentication, database, API, etc.)
- Processes and normalizes heterogeneous data
- Detects suspicious patterns using rule-based logic and ML
- Generates risk scores and alerts
- Provides human-readable explanations using AI
- Displays everything through a modern, interactive dashboard

---

# 🧱 Overall System Architecture

```
Frontend (React - Vite)
        ↓
Supabase (Auth + Storage + DB)
        ↓
Backend (Node.js API Layer)
        ↓
ML/AI Engine (Python via child process)
```

---

# 📁 Project Structure

```
project-root/
│
├── frontend/          # React (Vite) UI
├── backend/           # Node.js API + Processing Layer
└── ml-engine/         # Python ML + Detection Scripts
```

---

# 🖥️ FRONTEND (React - Vite)

## 🎯 Purpose

- Provide user interface for interaction
- Display logs, alerts, and analytics
- Handle authentication UI (Supabase)
- Send input data to backend

---

## 🔹 Features

### 1. Authentication (Supabase)

- Login / Signup UI
- Protected routes (dashboard access)

---

### 2. Dashboard

- Total logs processed
- Alerts generated
- Risk score overview
- Charts (timeline, distribution)
- Recent alerts table
- Risk visualization

---

### 3. Logs Input Module

- JSON input (V1 supported)
- File upload (UI in V1, functional in V2)
- Input type selector (Auth, DB, API — future support)

---

### 4. Alerts & Analysis

- Alert list with severity filters
- Detailed alert view
- AI-generated explanations

---

## 🔹 Responsibilities

Frontend should:

- Never handle parsing or ML
- Only send data and display results
- Work with a fixed response format

---

# ☁️ SUPABASE (Cloud Layer)

## 🎯 Purpose

- Authentication (users)
- Database (alerts, logs metadata)
- Storage (optional for log files)

---

## 🔹 Usage

### Authentication

- Email/password login
- Session management

---

### Database Tables (Example)

#### users

- id
- email

#### alerts

- id
- timestamp
- category
- actor
- risk_score
- description

#### logs_metadata

- id
- upload_time
- type
- status

---

# ⚙️ BACKEND (Node.js)

## 🎯 Purpose

- Core processing layer
- Log ingestion and handling
- Communication with ML engine
- API endpoints for frontend

---

## 🔹 Responsibilities

### 1. File/Input Handling

- Accept JSON input (V1)
- Accept file uploads (V2)
- Stream large files

---

### 2. Log Classification

- Identify log type:
  - AUTH
  - DB
  - API
  - UNKNOWN

---

### 3. Parsing Layer

- Convert raw logs → structured format

---

### 4. Normalization Layer

Convert all parsed logs into a standard event format:

```json
{
  "timestamp": "...",
  "category": "...",
  "actor": "...",
  "action": "...",
  "status": "...",
  "resource": "...",
  "source": "...",
  "raw": "..."
}
```

---

### 5. Detection Engine

#### Rule-Based Detection

- Brute force login attempts
- Suspicious DB operations
- API abuse patterns

---

#### ML Integration (via Python)

- Anomaly detection
- Behavioral analysis

---

### 6. API Endpoints

```
POST /process-logs
GET /dashboard-data
GET /alerts
```

---

# 🧠 ML ENGINE (Python)

## 🎯 Purpose

- Perform anomaly detection
- Analyze normalized events
- Generate risk scores

---

## 🔹 Technologies

- Isolation Forest
- Clustering algorithms
- Time-series anomaly detection

---

## 🔹 Execution Strategy

Node.js will communicate with Python using:

- **child_process.spawn / exec**
- Pass data via:
  - stdin / stdout
  - temporary JSON files

---

## 🔹 Flow

```
Node Backend
   ↓
Send normalized events
   ↓
Python ML Script
   ↓
Return:
  - anomalies
  - risk scores
```

---

# 🤖 AI EXPLANATION LAYER

## 🎯 Purpose

- Convert detections into human-readable insights

---

## 🔹 Example Output

- “Multiple failed login attempts detected from same IP”
- “Unusual database deletion pattern observed”

---

## 🔹 Tools

- Local LLM (Ollama) OR external API (optional)

---

# 🔄 COMPLETE DATA FLOW

```
User Uploads Logs (Frontend)
        ↓
Backend Receives Input
        ↓
Classification
        ↓
Parsing
        ↓
Normalization
        ↓
Detection Engine
        ↓
ML Engine (Python)
        ↓
Risk Scoring
        ↓
AI Explanation
        ↓
Store in Supabase
        ↓
Display in Dashboard
```

---

# 🚀 VERSION PLAN

## ✅ Version 1 (Current Focus)

- Frontend fully built
- Supabase auth UI ready
- JSON input only
- Mock processing (Gemini / dummy data)
- Dashboard working

---

## 🔜 Version 2 (Future)

- Full backend (Node.js)
- Log classification + parsing
- Normalization pipeline
- Rule-based detection
- ML integration (Python)
- Replace mock logic with real processing

---

# 🧠 KEY DESIGN PRINCIPLES

- Separation of concerns (UI vs processing)
- Normalize before detection
- Deterministic parsing (not AI-based)
- AI used only for explanations
- Scalable architecture

---

# 🏁 FINAL VISION

This project will evolve into a:

> **Full-scale intelligent security analytics platform**

Capable of:

- Processing real-world logs
- Detecting intrusions intelligently
- Providing explainable insights
- Operating efficiently at scale

---

This makes it suitable for:

- Academic projects
- Research work
- Real-world system design discussions
- Placement-level portfolio showcase

---
