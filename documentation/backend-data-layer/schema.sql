--------------------------------------------------
-- EXTENSIONS
--------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------
-- 1. USERS TABLE (Auth + Profile)
--------------------------------------------------

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    -- Profile
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{"theme": "dark", "notifications": true}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- 2. AUDIT LOGS TABLE (Security + Tracking)
--------------------------------------------------

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(100) NOT NULL,
    
    target_resource_type VARCHAR(50),
    target_resource_id UUID,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--------------------------------------------------
-- 3. JOBS TABLE (Pipeline Control)
--------------------------------------------------

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID NOT NULL,
    
    file_path TEXT NOT NULL,
    file_name TEXT,
    file_size BIGINT,
    
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    current_stage VARCHAR(50),
    last_completed_stage VARCHAR(50),
    
    progress INT DEFAULT 0,
    
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_user_jobs
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
        
    CONSTRAINT status_check CHECK (
        status IN ('uploaded', 'processing', 'completed', 'failed')
    ),
    
    CONSTRAINT stage_check CHECK (
        current_stage IS NULL OR current_stage IN (
            'uploaded', 'parsing', 'normalizing', 
            'analyzing', 'generating_insights', 
            'completed', 'failed'
        )
    )
);

--------------------------------------------------
-- 4. NORMALIZED LOGS TABLE (Event Data)
--------------------------------------------------

CREATE TABLE normalized_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    job_id UUID NOT NULL,
    
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(100),
    event_type VARCHAR(100),
    ip_address INET,
    severity VARCHAR(20),
    
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_job_logs
        FOREIGN KEY (job_id)
        REFERENCES jobs(id)
        ON DELETE CASCADE
);

--------------------------------------------------
-- 5. INSIGHTS TABLE (Final Outputs)
--------------------------------------------------

CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    job_id UUID NOT NULL,
    
    type VARCHAR(100) NOT NULL,
    title TEXT,
    severity VARCHAR(20),
    
    data JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_job_insights
        FOREIGN KEY (job_id)
        REFERENCES jobs(id)
        ON DELETE CASCADE
);

--------------------------------------------------
-- INDEXES (Performance Optimization)
--------------------------------------------------

-- Users
CREATE INDEX idx_users_email ON users(email);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Jobs
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status_created ON jobs(status, created_at);

-- Normalized Logs
CREATE INDEX idx_logs_job_id ON normalized_logs(job_id);
CREATE INDEX idx_logs_timestamp ON normalized_logs(timestamp);
CREATE INDEX idx_logs_ip ON normalized_logs(ip_address);
CREATE INDEX idx_logs_metadata ON normalized_logs USING GIN (metadata);

-- Insights
CREATE INDEX idx_insights_job_id ON insights(job_id);
CREATE INDEX idx_insights_severity ON insights(severity);