-- LLM Connections Database Schema
-- PostgreSQL schema for managing all LLM connections

-- LLM Connections table
CREATE TABLE IF NOT EXISTS llm_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- TODO: Add foreign key to users table when integrating with main UMP

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    connection_type VARCHAR(50) NOT NULL, -- local, remote, aws_spot, openai, anthropic, google, azure, groq, together, custom
    description TEXT,

    -- Endpoint Configuration
    base_url VARCHAR(500), -- API endpoint URL
    model_name VARCHAR(255), -- Default model name

    -- Authentication (encrypted at application level)
    api_key TEXT, -- Encrypted API key
    organization_id VARCHAR(255), -- For OpenAI, etc.

    -- Configuration
    timeout INTEGER DEFAULT 30, -- Request timeout in seconds
    max_retries INTEGER DEFAULT 3,
    temperature DECIMAL(3, 2), -- Default temperature (0.00-2.00)
    max_tokens INTEGER, -- Default max tokens
    extra_config JSONB, -- Additional configuration

    -- Status & Health
    status VARCHAR(50) DEFAULT 'inactive', -- active, inactive, error, testing
    last_tested_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    health_check_failures INTEGER DEFAULT 0,

    -- Integration Flags
    use_in_livekit BOOLEAN DEFAULT FALSE, -- Available for LiveKit
    use_in_mcp BOOLEAN DEFAULT FALSE, -- Available for MCP servers
    use_in_automation BOOLEAN DEFAULT FALSE, -- Available for automation workflows

    -- Tags and Organization
    tags TEXT[], -- Array of tags for filtering/organization
    is_active BOOLEAN DEFAULT TRUE,

    -- AWS Spot Instance Reference (if applicable)
    aws_instance_id VARCHAR(255), -- Links to ai_instances table
    aws_public_ip VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_connection_type (connection_type),
    INDEX idx_status (status),
    INDEX idx_is_active (is_active),
    INDEX idx_tags (tags) USING GIN,
    INDEX idx_use_in_livekit (use_in_livekit),
    INDEX idx_use_in_mcp (use_in_mcp)
);

-- LLM Connection Usage Log
CREATE TABLE IF NOT EXISTS llm_connection_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES llm_connections(id) ON DELETE CASCADE,
    user_id UUID,

    -- Usage Details
    service VARCHAR(50) NOT NULL, -- livekit, mcp, automation, api, manual
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,

    -- Performance Metrics
    latency_ms DECIMAL(10, 2), -- Response latency
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- Request Details
    model_used VARCHAR(255), -- Actual model that responded
    temperature DECIMAL(3, 2),
    max_tokens INTEGER,
    request_metadata JSONB,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_connection_id (connection_id),
    INDEX idx_user_id (user_id),
    INDEX idx_service (service),
    INDEX idx_created_at (created_at)
);

-- LLM Connection Health Checks
CREATE TABLE IF NOT EXISTS llm_connection_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES llm_connections(id) ON DELETE CASCADE,

    -- Health Check Results
    status VARCHAR(50) NOT NULL, -- healthy, unhealthy, timeout, error
    latency_ms DECIMAL(10, 2),
    error_message TEXT,

    -- Test Details
    test_prompt TEXT,
    test_response TEXT,

    -- Timestamp
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_connection_id (connection_id),
    INDEX idx_status (status),
    INDEX idx_checked_at (checked_at)
);

-- Trigger for updated_at
CREATE TRIGGER update_llm_connections_updated_at
    BEFORE UPDATE ON llm_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats(
    p_connection_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_requests BIGINT,
    successful_requests BIGINT,
    failed_requests BIGINT,
    total_tokens BIGINT,
    avg_latency_ms DECIMAL(10, 2),
    success_rate DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_requests,
        SUM(CASE WHEN success THEN 1 ELSE 0 END)::BIGINT as successful_requests,
        SUM(CASE WHEN NOT success THEN 1 ELSE 0 END)::BIGINT as failed_requests,
        SUM(total_tokens)::BIGINT as total_tokens,
        AVG(latency_ms) as avg_latency_ms,
        ROUND((SUM(CASE WHEN success THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as success_rate
    FROM llm_connection_usage
    WHERE connection_id = p_connection_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE llm_connections IS 'Manages all LLM connections (local, remote, third-party, AWS)';
COMMENT ON TABLE llm_connection_usage IS 'Tracks usage and performance of LLM connections';
COMMENT ON TABLE llm_connection_health_checks IS 'Health check history for LLM connections';

-- Default connection templates
INSERT INTO llm_connections (name, connection_type, base_url, description, use_in_livekit, use_in_mcp, is_active)
VALUES
    ('Local Ollama', 'local', 'http://localhost:11434', 'Local Ollama instance', true, true, false),
    ('Local llama.cpp', 'local', 'http://localhost:8080', 'Local llama.cpp server', true, true, false)
ON CONFLICT DO NOTHING;
