# 🚀 SentinelX – Deployment & Infrastructure Guide

---

## 1. Architecture Overview

SentinelX is designed as a modular, containerized multi-service platform. It segregates logic between data ingestion (Backend API), background execution workers (BullMQ Worker), machine learning intelligence (FastAPI ML Service), user interface (Vite Frontend), and state engines (PostgreSQL and Redis).

```mermaid
graph TD
    User[Client Browser] -->|Port 8080| Frontend[Frontend Container]
    User -->|Port 3000| Backend[Backend API Container]
    Backend -->|Enqueue Job| Redis[Redis Queue Container]
    Redis -->|Dequeue Job| Worker[BullMQ Worker Container]
    Worker -->|PostgreSQL Queries| Postgres[(PostgreSQL Container)]
    Backend -->|PostgreSQL Queries| Postgres
    Worker -->|POST /analyze| ML[FastAPI ML Service]
    Worker -->|Read/Write Files| Storage[(Shared Volume)]
    Backend -->|Write Logs| Storage
```

---

## 2. Docker Compose Stack Configuration

The primary orchestration method for SentinelX is **Docker Compose**. The stack is defined in the root [docker-compose.yml](file:///d:/CodingContent/Web%20Development/SentinelX%20%E2%80%94%20Smart%20Intrusion%20Detection%20System/docker-compose.yml) file.

### Services Inventory

#### 1. Database (`postgres-db`)
* **Container Name**: `sentinelx_postgres`
* **Base Image**: `postgres:16`
* **Port Mapping**: `5432:5432`
* **Data Volume**: `sentinelx_pgdata` mapped to `/var/lib/postgresql/data` (persistent).
* **Role**: Primary SQL datastore containing user authentication profiles, jobs lifecycle checkpoints, normalized logs, findings, and UI insights.

#### 2. Cache & Message Broker (`redis`)
* **Container Name**: `sentinelx_redis`
* **Base Image**: `redis:7-alpine`
* **Port Mapping**: `6379:6379`
* **Data Volume**: `sentinelx_redis_data` mapped to `/data`.
* **Command**: `redis-server --appendonly yes --loglevel warning` (AO enabled for queue state protection).
* **Role**: Message broker backing the **BullMQ** job pipeline.

#### 3. Machine Learning API (`ml-service`)
* **Container Name**: `sentinelx_ml`
* **Build Context**: `./ml-service` (via [Dockerfile](file:///d:/CodingContent/Web%20Development/SentinelX%20%E2%80%94%20Smart%20Intrusion%20Detection%20System/ml-service/Dockerfile))
* **Port Mapping**: `8000:8000`
* **Role**: FastAPI microservice serving the `/analyze` endpoint to detect log outliers via Isolation Forest and DBSCAN.

#### 4. Backend Server (`backend`)
* **Container Name**: `sentinelx_backend`
* **Build Context**: `./backend` (via [Dockerfile](file:///d:/CodingContent/Web%20Development/SentinelX%20%E2%80%94%20Smart%20Intrusion%20Detection%20System/backend/Dockerfile))
* **Port Mapping**: `3000:3000`
* **Data Volume**: `sentinelx_storage` mapped to `/app/storage` (shared storage).
* **Dependencies**: `postgres-db`, `redis`, `ml-service`.
* **Role**: Express REST API handling user sessions, file upload ingestion, and analytical dashboard queries.

#### 5. Background Task Executor (`worker`)
* **Container Name**: `sentinelx_worker`
* **Build Context**: `./backend` (uses same Docker image as backend)
* **Command**: `npm run worker`
* **Data Volume**: `sentinelx_storage` mapped to `/app/storage` (shared storage).
* **Dependencies**: `postgres-db`, `redis`.
* **Role**: Active pipeline worker that dequeues uploads, parses files, normalizes events, calls the ML service, and records findings to PostgreSQL.

#### 6. User Interface (`frontend`)
* **Container Name**: `sentinelx_frontend`
* **Build Context**: `./frontend` (via [Dockerfile](file:///d:/CodingContent/Web%20Development/SentinelX%20%E2%80%94%20Smart%20Intrusion%20Detection%20System/frontend/Dockerfile))
* **Port Mapping**: `8080:8080`
* **Dependencies**: `backend`.
* **Role**: React/TypeScript client dashboard served in containerized Vite development mode.

---

## 3. Storage Volumes & Network Topology

### Shared Volumes

1. `sentinelx_pgdata` (driver: local): Retains transactional Postgres tables.
2. `sentinelx_redis_data` (driver: local): Retains cached queuing logs.
3. `sentinelx_storage` (driver: local): **Critical shared asset** between the `backend` and `worker` containers. When a user uploads a file, the `backend` writes it to `/app/storage/uploads/`. The `worker` reads the file from the same location during execution.

### Networks
* **Name**: `sentinelx-network` (driver: bridge)
* **Description**: Custom bridge network connecting all containers. Outward facing ports are mapped locally, while internal service requests (e.g. backend calling Redis or ML) route securely via internal DNS (e.g. `redis:6379`, `ml-service:8000`).

---

## 4. Environment Variables Specification

The platform configures behavior based on key environment variables:

| Variable | Target Container | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `USE_DOCKER` | backend, worker | `"true"` | Switches configuration to use container hostnames. |
| `DOCKER_DATABASE_URL` | backend, worker | `postgresql://postgres:supersecretpassword@postgres-db:5432/sentinelx_ids` | PostgreSQL connection string. |
| `DOCKER_REDIS_URL` | backend, worker | `redis://redis:6379` | BullMQ Redis connection string. |
| `ML_SERVICE_URL` | backend, worker | `http://ml-service:8000` | Target URL for the ML service. |
| `PORT` | backend, frontend | `3000` / `8080` | Port listening targets. |

---

## 5. Operations Guide

### A. Deploying the Full Stack (Docker Compose Mode)

To deploy the entire multi-service platform in containerized mode:

```bash
# 1. Clone the project and navigate to the directory
cd "SentinelX — Smart Intrusion Detection System"

# 2. Build the images and run the stack in the background
docker-compose up -d --build

# 3. Verify that all 6 containers are running
docker ps
```

Once started:
* **Frontend Dashboard**: Access at `http://localhost:8080`
* **Backend API**: Access at `http://localhost:3000`
* **ML API Swagger UI**: Access at `http://localhost:8000/docs`

#### Stop the Stack
```bash
docker-compose down
```

---

### B. Local Development Setup (Hybrid Mode)

For iterative development, it is recommended to run Postgres and Redis inside Docker while executing the Backend, Worker, ML service, and Frontend on the host system to allow for rapid debugging and hot reloading.

#### 1. Spin up Postgres & Redis Dependencies
Use the localized helper docker-compose file under `backend/docker/`:
```bash
cd backend/docker
docker-compose up -d
```
*This starts Postgres on localhost:5432 and Redis on localhost:6379.*

#### 2. Run Backend & Worker Locally
Ensure dependencies are installed and database migrations are up to date:
```bash
cd ../ # Move back to backend root
npm install

# Run database schema migrations
npx prisma db push

# Start the Backend API in dev mode
npm run dev

# (In a separate terminal) Start the background Worker process
npm run worker
```

#### 3. Run ML Service Locally
Create a virtual environment and start FastAPI via Uvicorn:
```bash
cd ../ml-service
python -m venv venv
venv\Scripts\activate # On Windows (or source venv/bin/activate on Linux/Mac)
pip install -r requirements.txt
python app/main.py
```
*FastAPI starts listening on http://localhost:8000.*

#### 4. Run Frontend Locally
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend hot-reloader starts on http://localhost:5173.*
