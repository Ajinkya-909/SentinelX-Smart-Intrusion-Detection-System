# 🛡️ SentinelX — Smart Intrusion Detection System (IDS)

[![Docker Support](https://img.shields.io/badge/Docker-Supported-blue.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express%205-000000.svg?logo=express&logoColor=white)](https://expressjs.com/)
[![FastAPI](https://img.shields.io/badge/ML%20Service-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169e1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Queue-Redis%20%2B%20BullMQ-dc382d.svg?logo=redis&logoColor=white)](https://redis.io/)

**SentinelX** is a full-stack, enterprise-ready intelligent security analytics and Smart Intrusion Detection System (IDS). It is built to ingest, normalize, and analyze heterogeneous system and server logs in real time. 

By leveraging a hybrid analysis engine, SentinelX correlates signatures, identifies temporal patterns, flags statistical anomalies, scores multidimensional behavioral outliers through machine learning (Isolation Forest + DBSCAN), and synthesizes natural language executive briefs and remediation steps using Generative AI.

---

## 🎯 Key Capabilities

*   **Heterogeneous Log Ingestion:** Streamlined parsing of 13+ standard log formats with heuristic-based format detection.
*   **Hybrid Detection Pipeline:** 27 individual security detectors executing concurrently across 5 distinct analytical engines.
*   **Unsupervised Machine Learning:** Multi-dimensional feature extraction scoring entity anomalies using Isolation Forest & DBSCAN.
*   **AI-Powered Threat Summaries:** Seamless Generative AI integration (Google Gemini / Anthropic Claude) producing prioritized remediations, attack pattern flowcharts, and incident summaries.
*   **Resumable 4-Stage Processing Queue:** Redis & BullMQ-backed asynchronous workflow capable of handling files up to **300 MB (~1.2M log lines)** without exhausting system resources.
*   **Interactive Analytics Dashboard:** Real-time visual tracking of key performance indicators, attacker Geo-IP attributions, threat timelines, and findings by severity.

---


### The 4-Stage Resumable Pipeline

1.  **Stage 1: UPLOAD (Multer & JobService)**
    *   Accepts `.log`, `.txt`, `.json`, or `.csv` files up to 300 MB.
    *   Registers a database job entry in PostgreSQL, uploads the raw file to local persistent storage, and enqueues a background job via BullMQ.
2.  **Stage 2: NORMALIZE (Preprocessor, TypeDetector, Parser, Normalizer)**
    *   Reads the log file as a stream in 1,000-line batches.
    *   Executes a 3-tier heuristic on the first batch to automatically detect the file format.
    *   Parses and maps diverse log structures (IPs, timestamps, actions, severities) to a standard database model and executes bulk inserts.
3.  **Stage 3: ANALYZE (AnalyzerOrchestrator)**
    *   Fetches normalized logs using a sliding window (5,000 logs with a 500-log overlap) to prevent memory bloating.
    *   Runs the 5 analyzer engines concurrently to flag threat signatures, spikes, intervals, correlated chains, and ML outliers.
4.  **Stage 4: INSIGHTS (InsightsService & LLMGenerator)**
    *   Aggregates findings to compute deterministic statistics (timelines, distributions, top attackers, Geo-IP origins via `geoip-lite`).
    *   Invokes the Generative AI model with the top security findings to produce executive reports, classification descriptions, and immediate, actionable remediation steps.

---

## 💻 Technology Stack

*   **Runtime:** Node.js (v20+) & TypeScript (v6+)
*   **Web Framework:** Express 5
*   **Database & ORM:** PostgreSQL & Prisma 7
*   **Background Processing:** BullMQ & Redis
*   **Machine Learning Microservice:** Python FastAPI (scikit-learn, Uvicorn)
*   **AI Integration:** Gemini API (fallback to Claude API)
*   **Frontend UI:** React 18, Vite, TailwindCSS, Shadcn/UI, Recharts

---

## 📂 Project Structure

```
project-root/
│
├── docker-compose.yml     # Multi-container local orchestration
│
├── frontend/              # Vite + React single page application
│   ├── src/               # UI components, dashboard, hooks
│   └── Dockerfile
│
├── backend/               # Express API and BullMQ worker pipeline
│   ├── src/
│   │   ├── controllers/   # Route endpoint handlers
│   │   ├── pipeline/      # Ingestion & normalization stages
│   │   ├── services/      # LLM, database, and background queues
│   │   └── worker.ts      # BullMQ worker process entry point
│   ├── prisma/            # Database schema definition
│   └── Dockerfile
│
└── ml-service/            # FastAPI Python microservice
    ├── app/               # Isolation Forest & DBSCAN anomaly scorers
    ├── tests/             # Pytest suite
    └── Dockerfile
```

---

## 📋 Supported Log Formats (13 Types)

The system automatically identifies formats using a tiered heuristic engine:

| Tier | Log Type | Detected By | Parsed By |
| :--- | :--- | :--- | :--- |
| **1 — High Fidelity** | AWS CloudTrail (JSON Envelope) | `cloudtrail.detector` | `json.parser` |
| | Suricata IDS Alerts (EVE JSON) | `suricata.detector` | `json.parser` |
| | Docker Container Logs | `docker.detector` | `json.parser` / `syslog.parser` |
| | Windows Event Logs (Text Export) | `windows.detector` | `keyvalue.parser` |
| **2 — Infrastructure**| Linux Syslog (RFC 3164 / 5424) | `syslog.detector` | `syslog.parser` |
| | Nginx Access Logs | `nginx.detector` | `nginx.parser` |
| | Nginx Error Logs | `nginx.detector` | `nginx.parser` |
| | Apache Access Logs (Combined/Common)| `apache.detector` | `apache.parser` |
| | Apache Error Logs | `apache.detector` | `apache.parser` |
| | Firewall / iptables Logs | `firewall.detector` | `keyvalue.parser` |
| **3 — Fallback** | Generic JSON (One object per line) | `json.detector` | `json.parser` |
| | Key=Value Pairs | `keyvalue.detector` | `keyvalue.parser` |
| | Plain Text / Unknown | `generic.detector` | `generic.parser` |

> [!NOTE]
> Binary Windows Event Logs (`.evtx`) are not supported directly. They must be exported to text/XML format before uploading.

---

## ⚡ Detection Engine & 27 Core Detectors

SentinelX concurrently runs 27 distinct detectors categorized into 5 operational engines:

### 1. Rule-Based Engine (11 Detectors)
*   **`bruteForce`:** Identifies repeated authentication failures from a single IP (Threshold: 50 failures / 5 min, or 10 failures / 30s).
*   **`rapidAuthVelocity`:** Detects abnormally high-frequency login attempts.
*   **`accountTakeover`:** Identifies a login from a new IP rapidly following a login from a different IP (within 60 min).
*   **`impossibleVelocity`:** Flags login sessions for the same user from geographically impossible coordinates (within 60s).
*   **`privilegeEscalation`:** Catches repeated attempts to access admin/root directories (Threshold: 3 attempts / 10 min).
*   **`sqlInjection`:** Matches request payloads against 12 known SQLi pattern signatures.
*   **`xss`:** Detects cross-site scripting attempts using 9 distinct script injection patterns.
*   **`pathTraversal`:** Flags directory traversal signatures (e.g. `../`, `%2e%2e/`).
*   **`maliciousUpload`:** Triggers on uploads with any of 18 dangerous file extensions (e.g. `.exe`, `.php`, `.sh`).
*   **`scannerBot`:** Identifies user-agents corresponding to common security scanning tools (e.g. `sqlmap`, `nikto`, `nmap`).
*   **`suricata`:** Directly processes and passes through `severity` alerts from Suricata EVE files.

### 2. Statistical Engine (5 Detectors)
*   **`requestSpike`:** Triggers when an IP's request count exceeds 5x its rolling moving average (Z-score $\ge$ 3.0).
*   **`errorRateSpike`:** Flags a 3x increase in the baseline ratio of 4xx/5xx HTTP responses.
*   **`dataTransferSpike`:** Alerts on data transfers exceeding 3x the standard deviation of the transfer baseline.
*   **`endpointDiversitySpike`:** Catches network scanning by highlighting IPs accessing 3x the baseline number of unique paths.
*   **`criticalEventSpike`:** Identifies a cluster of critical events exceeding 5x the baseline critical event rate.

### 3. Temporal Engine (6 Detectors)
*   **`rapidBurst`:** Flags 100+ requests in a 30s window from the same entity.
*   **`reconnaissanceBurst`:** Flags 50+ requests with >50% failure rate touching 10+ unique endpoints in 5 min.
*   **`midnightAccess`:** Flags authenticated activity occurring between 00:00 and 04:00 local time.
*   **`offHoursAdmin`:** Flags admin modifications outside business hours (22:00 - 06:00, Mon-Fri).
*   **`longSession`:** Triggers when session duration exceeds 3x the statistical session length baseline.
*   **`abnormalIntervals`:** Identifies automated bot scripts by flagging consistent request intervals under 500 ms.

### 4. Correlation Engine (5 Detectors)
*   **`reconExploitationChain`:** Correlates reconnaissance activity followed by an exploitation attempt (within a 10 min recon + 5 min exploit window).
*   **`privilegeEscalationChain`:** Highlights cascades involving an auth failure, followed by admin access, concluding with an escalation event within 2 minutes.
*   **`dataExfiltrationChain`:** Correlates failed authentication/recon patterns followed by high data transfer within 30 minutes.
*   **`lateralMovement`:** Triggers when a single IP or credential accesses multiple distinct host systems or services within 1 hour.
*   **`sessionHijacking`:** Highlights immediate session token reuse from a different IP address within a 1-hour window.

### 5. Machine Learning Engine (Outlier Detection)
The background worker extracts a total of **31 feature vectors** per entity and forwards them to the Python FastAPI microservice:
*   **Isolation Forest:** Configured with `contamination=0.05` and `n_estimators=100`. Employs tree ensemble partitioning to produce anomaly scores from 0 to 1, mapped into security findings.
*   **DBSCAN:** Configured with `eps=0.3` and `min_samples=5`. Core clusters represent normal behavior, border points are flagged as medium-risk anomalies, and noise points are flagged as high-risk anomalies (`BEHAVIORAL_OUTLIER`).
*   **Feature Vectors:**
    *   *IP Features (11):* Request counts, endpoint diversity, auth failure ratio, error rate, time-of-day entropy, etc.
    *   *User Features (10):* Failed logins, admin attempts, escalation operations, transfer volumes.
    *   *Session Features (10):* Duration, requests per minute, payload sizes, anomaly count.

---

## ⚡ Performance & Scale Sizing

The pipeline handles files up to 300 MB. Processing time estimates are calculated using a single-core Node.js instance paired with a local PostgreSQL database:

| File Size | Avg. Line Length | Approx. Lines | Preprocessing Batches | Analysis Windows | Total Processing Time (Est.) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1 MB** | 200 B | ~5,000 | 5 | 2 | **1 – 2 min** |
| **10 MB** | 200 B | ~50,000 | 50 | 11 | **3 – 5 min** |
| **50 MB** | 250 B | ~200,000 | 200 | 41 | **8 – 15 min** |
| **100 MB**| 250 B | ~400,000 | 400 | 81 | **15 – 25 min** |
| **300 MB**| 250 B | ~1,200,000 | 1,200 | 241 | **50 – 90 min** |

> [!TIP]
> **Performance Driver:** The main bottleneck is database-write operations during Stage 2 (normalization). Files exceeding 150 MB require robust DB I/O bandwidth.

---

## 🚀 Quick Start: Run Everything via Docker Compose

Docker Compose builds and wires all 6 services (PostgreSQL database, Redis queue, FastAPI ML service, Express API backend, BullMQ Worker, and the React frontend) automatically.

### 1. Prerequisites
Ensure you have the following installed:
*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Set Up Environment Variables
Create the backend `.env` configuration:
```bash
# Copy template
cp backend/.env.example backend/.env
```
Open `backend/.env` and update the key variables:
*   `GEMINI_API_KEY`: Set your Google Gemini API key to enable AI-powered summaries and recommendations.
*   *Note: If no API key is provided, the pipeline will fallback gracefully but LLM summaries will be skipped.*

### 3. Spin Up the Containers
From the root project directory, run:
```bash
docker compose up --build -d
```

### 4. Verify & Run Database Schema Migrations
Once the containers are running, execute the Prisma push command in the backend container to construct database tables:
```bash
docker compose exec backend npx prisma db push --schema=prisma/schema.prisma
```

### 5. Access the Services
*   **Web Dashboard:** `http://localhost:8080` (register an account, login, and start uploading logs!)
*   **Backend Server API:** `http://localhost:3000`
*   **FastAPI ML Microservice:** `http://localhost:8000` (docs available at `/docs`)

To stop the services, run:
```bash
docker compose down
```

---

## 🛠️ Manual Development Setup (Non-Docker)

If you prefer to run services individually for debugging, follow the steps below:

### Prerequisites
*   Node.js (v20+)
*   Python (v3.10+)
*   PostgreSQL & Redis servers running locally on default ports.

### 1. Database & Cache
1.  Ensure PostgreSQL is running and create a database named `sentinelx_ids`.
2.  Ensure Redis is running on port `6379`.

### 2. Backend Setup
1.  Navigate to `backend/` and install dependencies:
    ```bash
    cd backend
    npm install
    ```
2.  Copy `.env.example` to `.env` and fill in local connection strings and `GEMINI_API_KEY`.
3.  Generate the Prisma Client and migrate the database:
    ```bash
    npx prisma generate --schema=prisma/schema.prisma
    npx prisma db push --schema=prisma/schema.prisma
    ```
4.  Start the API server:
    ```bash
    npm run dev
    ```
5.  Start the BullMQ Worker in a separate terminal:
    ```bash
    npm run worker
    ```

### 3. ML Service Setup
1.  Navigate to `ml-service/` and create a virtual environment:
    ```bash
    cd ml-service
    python -m venv venv
    venv\Scripts\activate  # On Windows
    # source venv/bin/activate  # On macOS/Linux
    ```
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Copy `.env.example` to `.env`.
4.  Run the server:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```

### 4. Frontend Setup
1.  Navigate to `frontend/`:
    ```bash
    cd frontend
    npm install
    ```
2.  Start the Vite dev server:
    ```bash
    npm run dev
    ```
3.  Access the UI at `http://localhost:5173`.

---

## 🗺️ Future Architecture Roadmap

To address bottlenecks and enhance pipeline security:
*   **Memory-Safe Encoding Detection:** Optimize BOM reading to read only the first 4 bytes rather than loading full files into memory via `fs.readFile()`.
*   **Time-Based Sliding Windows:** Transition the analysis sliding window from count-based (5,000 logs) to timestamp-based (e.g. 1 hour sliding windows) to reduce temporal false positives.
*   **Redis-Backed Entity State:** Persist user and IP state (e.g. failed login counts) across analysis windows to capture long-duration intrusion vectors.
*   **Graceful ML Circuit Breaker:** Add graceful failover for the FastAPI connection so ML outages degrade results rather than failing the entire analysis job.
*   **Streaming Normalization:** Stream normalized records directly to the analyzer in memory to bypass redundant PostgreSQL disk writes on large logs.

---

## 👨‍💻 License & Author

*   **Author:** **Ajinkya Deshmukh** — [GitHub Profile](https://github.com/Ajinkya-909) | [Email](mailto:ajinkyadeshmukh8686@gmail.com)
*   **License:** This project is licensed under the **MIT License** — see the [LICENSE](file:///d:/CodingContent/Web%20Development/SentinelX%20%E2%80%94%20Smart%20Intrusion%20Detection%20System/LICENSE) file for details.

