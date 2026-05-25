-- ================================
-- EXTENSIONS
-- ================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- ENUM TYPES
-- ================================

-- Job lifecycle status
CREATE TYPE job_status_enum AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'COMPLETED',
  'FAILED'
);

-- Pipeline stages
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

-- Result outcome
CREATE TYPE job_outcome_enum AS ENUM (
  'SUCCESS',
  'WARNING'
);

-- Analyzer findings severity
CREATE TYPE analyzer_finding_severity AS ENUM (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO'
);

-- Analyzer findings status
CREATE TYPE analyzer_finding_status AS ENUM (
  'ACTIVE',
  'RESOLVED',
  'DISMISSED',
  'DUPLICATE'
);

-- Insight types
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

-- Insight severity levels
CREATE TYPE insight_severity AS ENUM (
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO'
);

-- Insight generation source
CREATE TYPE insight_generator AS ENUM (
  'LLM',
  'DETERMINISTIC',
  'HYBRID'
);

-- ================================
-- USERS TABLE (Auth & Profile)
-- ================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Auth fields
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, 
  
  -- Profile fields
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- JOBS TABLE
-- ================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- LINK TO USER (Cascade delete ensures if a user is deleted, their jobs go too)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,

  -- STATE MODEL
  status job_status_enum NOT NULL DEFAULT 'UPLOADED',
  last_completed_stage job_stage_enum,
  outcome job_outcome_enum,

  -- PROGRESS & CONTROL
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  retry_count INT DEFAULT 0,

  -- ERROR HANDLING
  error_message TEXT,

  -- PIPELINE RECOVERY METADATA
  processing_metadata JSONB,

  -- TIMESTAMPS
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- ================================
-- NORMALIZED LOGS TABLE
-- ================================

CREATE TABLE normalized_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  timestamp TIMESTAMP NOT NULL,
  source VARCHAR(100),
  event_type VARCHAR(100),
  ip_address VARCHAR(50),
  severity VARCHAR(50),

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- INSIGHTS TABLE (AI-Generated Intelligence)
-- ================================

CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Insight identity
  insight_type insight_type NOT NULL,

  -- Display metadata
  title VARCHAR(255),
  description TEXT,

  -- Severity / priority
  severity insight_severity,
  priority_score FLOAT,
  confidence_score FLOAT,

  -- Main frontend payload
  data JSONB NOT NULL,

  -- AI metadata
  generated_by insight_generator DEFAULT 'LLM',
  model_name VARCHAR(100),
  generation_version VARCHAR(50),

  -- Traceability
  finding_references JSONB,  -- References to analyzer_findings
  log_references JSONB,      -- References to normalized_logs

  -- Rendering / state
  is_visible BOOLEAN DEFAULT TRUE,
  display_order INT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================
-- TRIGGERS (UPDATE TIMESTAMPS)
-- ================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for jobs table
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for insights table
CREATE TRIGGER update_insights_updated_at
BEFORE UPDATE ON insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ================================
-- INDEXES (IMPORTANT FOR PERFORMANCE)
-- ================================

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

-- Insights
CREATE INDEX idx_insights_job_id ON insights(job_id);
CREATE INDEX idx_insights_insight_type ON insights(insight_type);
CREATE INDEX idx_insights_severity ON insights(severity);