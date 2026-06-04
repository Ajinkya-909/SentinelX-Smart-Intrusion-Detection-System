-- ============================================================================
-- SentinelX SQL Schema Creation Script (PostgreSQL 16)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- Job lifecycle status
CREATE TYPE job_status_enum AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- Pipeline execution stages
CREATE TYPE job_stage_enum AS ENUM (
  'UPLOADED',
  'PREPROCESSED',
  'TYPE_DETECTED',
  'PARSED',
  'NORMALIZED',
  'ANALYZED',
  'INSIGHTS_GENERATED',
  'COMPLETED'
);

-- Job result outcome
CREATE TYPE job_outcome_enum AS ENUM (
  'SUCCESS',
  'WARNING'
);

-- Finding severity level
CREATE TYPE analyzer_finding_severity AS ENUM (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO'
);

-- Interactive finding status
CREATE TYPE analyzer_finding_status AS ENUM (
  'ACTIVE',
  'RESOLVED',
  'DISMISSED',
  'DUPLICATE'
);

-- UI Insight widget categorization
CREATE TYPE insight_type AS ENUM (
  'OVERVIEW',
  'KPI',
  'ALERT',
  'THREAT_SUMMARY',
  'SEVERITY_DISTRIBUTION',
  'ACTIVITY_TIMELINE',
  'THREAT_TIMELINE',
  'TOP_ATTACKERS',
  'RECOMMENDATION',
  'ATTACK_PATTERN',
  'PORT_SCAN_PATTERN',
  'FAILED_LOGIN_ANALYSIS',
  'TRAFFIC_SPIKE',
  'EVENT_TYPE_DISTRIBUTION',
  'GEO_ANALYSIS',
  'SUSPICIOUS_IP_CLUSTER',
  'ANOMALY_SUMMARY',
  'ATTACK_CAMPAIGN'
);

-- Insight severity level
CREATE TYPE insight_severity AS ENUM (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO'
);

-- Insight generating mechanism
CREATE TYPE insight_generator AS ENUM (
  'LLM',
  'DETERMINISTIC',
  'HYBRID'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

-- 2. JOBS TABLE
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_name VARCHAR(255),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status job_status_enum NOT NULL DEFAULT 'UPLOADED',
  last_completed_stage job_stage_enum,
  outcome job_outcome_enum,
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  retry_count INT DEFAULT 0,
  error_message TEXT,
  processing_metadata JSONB,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW(),
  deleted_at TIMESTAMP(6)
);

-- 3. NORMALIZED LOGS TABLE
CREATE TABLE normalized_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMP(6) NOT NULL,
  source VARCHAR(100),
  event_type VARCHAR(100),
  ip_address VARCHAR(50),
  severity VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP(6) DEFAULT NOW()
);

-- 4. ANALYZER FINDINGS TABLE
CREATE TABLE analyzer_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  fingerprint VARCHAR UNIQUE NOT NULL,
  analyzer VARCHAR(100) NOT NULL,
  analyzer_version VARCHAR(20) DEFAULT '1.0',
  finding_type VARCHAR(100) NOT NULL,
  category VARCHAR(100),
  severity analyzer_finding_severity NOT NULL,
  confidence DOUBLE PRECISION,
  title TEXT,
  summary TEXT,
  recommendation TEXT,
  log_references JSONB,
  affected_entities JSONB,
  evidence JSONB,
  metadata JSONB,
  status analyzer_finding_status NOT NULL DEFAULT 'ACTIVE',
  detected_at TIMESTAMP(6) DEFAULT NOW(),
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW(),
  
  -- Secondary safety constraint
  CONSTRAINT uk_findings_job_fingerprint UNIQUE (job_id, fingerprint)
);

-- 5. INSIGHTS TABLE
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  insight_type insight_type NOT NULL,
  title VARCHAR(255),
  description TEXT,
  severity insight_severity,
  priority_score DOUBLE PRECISION,
  confidence_score DOUBLE PRECISION,
  data JSONB NOT NULL,
  generated_by insight_generator NOT NULL DEFAULT 'LLM',
  model_name VARCHAR(100),
  generation_version VARCHAR(50),
  finding_references JSONB,
  log_references JSONB,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT,
  metadata JSONB,
  created_at TIMESTAMP(6) DEFAULT NOW(),
  updated_at TIMESTAMP(6) DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);

-- Jobs
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

-- Logs
CREATE INDEX idx_logs_job_id ON normalized_logs(job_id);
CREATE INDEX idx_logs_timestamp ON normalized_logs(timestamp);
CREATE INDEX idx_logs_ip ON normalized_logs(ip_address);

-- Analyzer Findings
CREATE INDEX idx_findings_job_id ON analyzer_findings(job_id);
CREATE INDEX idx_findings_severity ON analyzer_findings(severity);
CREATE INDEX idx_findings_type ON analyzer_findings(finding_type);
CREATE INDEX idx_findings_analyzer ON analyzer_findings(analyzer);
CREATE INDEX idx_findings_detected_at ON analyzer_findings(detected_at);
CREATE INDEX idx_findings_status ON analyzer_findings(status);
CREATE INDEX idx_findings_fingerprint ON analyzer_findings(fingerprint);

-- Insights
CREATE INDEX idx_insights_job_id ON insights(job_id);
CREATE INDEX idx_insights_insight_type ON insights(insight_type);
CREATE INDEX idx_insights_severity ON insights(severity);