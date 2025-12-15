-- UCMP Connector Framework - PostgreSQL Schema
-- Run this to set up the necessary tables for the connector system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- Credentials Storage
-- =============================================================================

CREATE TABLE IF NOT EXISTS connector_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id VARCHAR(100) NOT NULL,
    tenant_id VARCHAR(100),
    user_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    
    -- Encrypted credential data
    encrypted_data TEXT NOT NULL,
    auth_type VARCHAR(50) NOT NULL,
    
    -- OAuth2 tokens (stored separately for easy refresh)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_valid BOOLEAN DEFAULT TRUE,
    
    -- Indexes
    CONSTRAINT unique_credential_name UNIQUE (tenant_id, user_id, connector_id, name)
);

CREATE INDEX idx_credentials_connector ON connector_credentials(connector_id);
CREATE INDEX idx_credentials_tenant ON connector_credentials(tenant_id);
CREATE INDEX idx_credentials_user ON connector_credentials(user_id);
CREATE INDEX idx_credentials_valid ON connector_credentials(is_valid) WHERE is_valid = TRUE;

-- =============================================================================
-- Webhook Registrations
-- =============================================================================

CREATE TABLE IF NOT EXISTS connector_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id VARCHAR(100) NOT NULL,
    trigger_id VARCHAR(100) NOT NULL,
    credential_id UUID NOT NULL REFERENCES connector_credentials(id) ON DELETE CASCADE,
    tenant_id VARCHAR(100),
    
    -- Webhook details
    webhook_url TEXT NOT NULL,
    webhook_secret VARCHAR(255),  -- For signature verification
    external_webhook_id VARCHAR(255),  -- ID from the external service
    
    -- Configuration
    config JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_received_at TIMESTAMPTZ,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_connector ON connector_webhooks(connector_id);
CREATE INDEX idx_webhooks_credential ON connector_webhooks(credential_id);
CREATE INDEX idx_webhooks_active ON connector_webhooks(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- Polling State (for polling triggers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS connector_polling_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id VARCHAR(100) NOT NULL,
    trigger_id VARCHAR(100) NOT NULL,
    credential_id UUID NOT NULL REFERENCES connector_credentials(id) ON DELETE CASCADE,
    tenant_id VARCHAR(100),
    
    -- Polling configuration
    config JSONB DEFAULT '{}',
    poll_interval_seconds INTEGER DEFAULT 300,
    
    -- State
    poll_state JSONB DEFAULT '{}',  -- Last cursor, timestamp, etc.
    last_poll_at TIMESTAMPTZ,
    next_poll_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    consecutive_errors INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_polling_config UNIQUE (connector_id, trigger_id, credential_id, tenant_id)
);

CREATE INDEX idx_polling_next ON connector_polling_state(next_poll_at) WHERE is_active = TRUE;
CREATE INDEX idx_polling_credential ON connector_polling_state(credential_id);

-- =============================================================================
-- Execution Log
-- =============================================================================

CREATE TABLE IF NOT EXISTS connector_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id VARCHAR(100) NOT NULL,
    action_id VARCHAR(100) NOT NULL,
    credential_id UUID REFERENCES connector_credentials(id) ON DELETE SET NULL,
    tenant_id VARCHAR(100),
    user_id VARCHAR(100),
    
    -- Execution context
    workflow_id VARCHAR(255),
    workflow_run_id VARCHAR(255),
    step_id VARCHAR(255),
    correlation_id VARCHAR(255),
    
    -- Input/Output (consider encryption for sensitive data)
    inputs JSONB,
    outputs JSONB,
    
    -- Result
    success BOOLEAN NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    execution_time_ms INTEGER,
    
    -- Rate limiting info
    rate_limit_remaining INTEGER
);

-- Partition by month for performance
-- In production, consider partitioning: CREATE TABLE connector_executions ... PARTITION BY RANGE (started_at);

CREATE INDEX idx_executions_connector ON connector_executions(connector_id);
CREATE INDEX idx_executions_workflow ON connector_executions(workflow_id);
CREATE INDEX idx_executions_started ON connector_executions(started_at DESC);
CREATE INDEX idx_executions_success ON connector_executions(success);
CREATE INDEX idx_executions_tenant ON connector_executions(tenant_id);

-- =============================================================================
-- Rate Limiting
-- =============================================================================

CREATE TABLE IF NOT EXISTS connector_rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connector_id VARCHAR(100) NOT NULL,
    credential_id UUID REFERENCES connector_credentials(id) ON DELETE CASCADE,
    tenant_id VARCHAR(100),
    
    -- Rate limit window
    window_start TIMESTAMPTZ NOT NULL,
    window_duration_seconds INTEGER NOT NULL DEFAULT 60,
    
    -- Counts
    request_count INTEGER DEFAULT 0,
    max_requests INTEGER NOT NULL,
    
    -- Status
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMPTZ,
    
    CONSTRAINT unique_rate_window UNIQUE (connector_id, credential_id, window_start)
);

CREATE INDEX idx_rate_limits_window ON connector_rate_limits(window_start);
CREATE INDEX idx_rate_limits_blocked ON connector_rate_limits(is_blocked, blocked_until) WHERE is_blocked = TRUE;

-- =============================================================================
-- Connector Metadata Cache (optional - for faster UI)
-- =============================================================================

CREATE TABLE IF NOT EXISTS connector_metadata_cache (
    connector_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    icon_url TEXT,
    categories VARCHAR(100)[] DEFAULT '{}',
    tags VARCHAR(100)[] DEFAULT '{}',
    
    -- Full schema cache
    auth_schema JSONB,
    actions_schema JSONB,
    triggers_schema JSONB,
    
    -- Metadata
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'code'  -- 'code' or 'manifest'
);

CREATE INDEX idx_metadata_categories ON connector_metadata_cache USING GIN(categories);
CREATE INDEX idx_metadata_tags ON connector_metadata_cache USING GIN(tags);

-- =============================================================================
-- Views
-- =============================================================================

-- Active credentials summary
CREATE OR REPLACE VIEW v_active_credentials AS
SELECT 
    cc.id,
    cc.connector_id,
    cc.tenant_id,
    cc.user_id,
    cc.name,
    cc.auth_type,
    cc.is_valid,
    cc.created_at,
    cc.last_used_at,
    COALESCE(wh.webhook_count, 0) AS webhook_count,
    COALESCE(ps.polling_count, 0) AS polling_count
FROM connector_credentials cc
LEFT JOIN (
    SELECT credential_id, COUNT(*) AS webhook_count 
    FROM connector_webhooks 
    WHERE is_active = TRUE 
    GROUP BY credential_id
) wh ON cc.id = wh.credential_id
LEFT JOIN (
    SELECT credential_id, COUNT(*) AS polling_count 
    FROM connector_polling_state 
    WHERE is_active = TRUE 
    GROUP BY credential_id
) ps ON cc.id = ps.credential_id
WHERE cc.is_valid = TRUE;

-- Execution statistics by connector
CREATE OR REPLACE VIEW v_connector_stats AS
SELECT 
    connector_id,
    tenant_id,
    COUNT(*) AS total_executions,
    COUNT(*) FILTER (WHERE success = TRUE) AS successful,
    COUNT(*) FILTER (WHERE success = FALSE) AS failed,
    AVG(execution_time_ms) AS avg_execution_ms,
    MAX(started_at) AS last_execution,
    DATE_TRUNC('day', started_at) AS day
FROM connector_executions
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY connector_id, tenant_id, DATE_TRUNC('day', started_at)
ORDER BY day DESC;

-- =============================================================================
-- Functions
-- =============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER tr_credentials_updated 
    BEFORE UPDATE ON connector_credentials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_webhooks_updated 
    BEFORE UPDATE ON connector_webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_polling_updated 
    BEFORE UPDATE ON connector_polling_state 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Check rate limit function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_connector_id VARCHAR(100),
    p_credential_id UUID,
    p_max_requests INTEGER,
    p_window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    v_window_start := DATE_TRUNC('minute', NOW());
    
    -- Upsert rate limit record
    INSERT INTO connector_rate_limits (
        connector_id, credential_id, window_start, 
        window_duration_seconds, request_count, max_requests
    )
    VALUES (
        p_connector_id, p_credential_id, v_window_start,
        p_window_seconds, 1, p_max_requests
    )
    ON CONFLICT (connector_id, credential_id, window_start) 
    DO UPDATE SET 
        request_count = connector_rate_limits.request_count + 1
    RETURNING request_count INTO v_count;
    
    -- Check if over limit
    IF v_count > p_max_requests THEN
        UPDATE connector_rate_limits 
        SET is_blocked = TRUE, 
            blocked_until = v_window_start + (p_window_seconds || ' seconds')::INTERVAL
        WHERE connector_id = p_connector_id 
          AND credential_id = p_credential_id 
          AND window_start = v_window_start;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old execution logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_executions(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM connector_executions 
    WHERE started_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Sample Data for Testing (optional)
-- =============================================================================

-- Uncomment to insert test data
/*
INSERT INTO connector_credentials (
    connector_id, tenant_id, user_id, name, 
    encrypted_data, auth_type
) VALUES (
    'twilio', 'tenant1', 'user1', 'Production Twilio',
    'encrypted_base64_data_here', 'basic'
);
*/

-- =============================================================================
-- Grants (adjust based on your user setup)
-- =============================================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ucmp_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ucmp_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ucmp_app;
