-- AI Compute Management Database Schema
-- PostgreSQL schema for tracking AWS Spot instances

-- AI Instances table
CREATE TABLE IF NOT EXISTS ai_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- TODO: Add foreign key to users table when integrating with main UMP

    -- AWS Instance Info
    instance_id VARCHAR(255) UNIQUE NOT NULL, -- AWS instance ID (e.g., i-0abc123def456)
    name VARCHAR(255) NOT NULL,
    instance_type VARCHAR(50) NOT NULL, -- e.g., g5.xlarge
    region VARCHAR(50) NOT NULL,
    availability_zone VARCHAR(50),

    -- Framework & Model
    framework VARCHAR(50) NOT NULL, -- ollama, vllm, tgi, llama-cpp, custom
    model VARCHAR(255), -- Model name

    -- Network & Connection
    public_ip VARCHAR(50),
    public_dns VARCHAR(255),
    private_ip VARCHAR(50),
    key_pair_name VARCHAR(255),
    security_group_id VARCHAR(255),

    -- Status & Lifecycle
    status VARCHAR(50) NOT NULL, -- pending, running, stopping, stopped, terminated
    launched_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terminated_at TIMESTAMP WITH TIME ZONE,

    -- Cost & Pricing
    spot_price DECIMAL(10, 4), -- Current spot price at launch
    max_price DECIMAL(10, 4), -- Maximum price set
    estimated_cost DECIMAL(10, 2) DEFAULT 0.00, -- Running estimate

    -- Configuration
    volume_size_gb INTEGER,
    ami_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_instance_id (instance_id),
    INDEX idx_status (status),
    INDEX idx_launched_at (launched_at)
);

-- AI AWS Credentials table (encrypted storage)
CREATE TABLE IF NOT EXISTS ai_aws_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- TODO: Add foreign key to users table

    -- AWS Credentials (should be encrypted at application level)
    access_key_id VARCHAR(255) NOT NULL,
    secret_access_key TEXT NOT NULL, -- Encrypted

    -- Default Settings
    default_region VARCHAR(50) DEFAULT 'us-east-1',
    default_key_pair_name VARCHAR(255),
    default_security_group_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id),
    INDEX idx_user_id (user_id)
);

-- AI Instance Events table (for audit trail and cost tracking)
CREATE TABLE IF NOT EXISTS ai_instance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES ai_instances(id) ON DELETE CASCADE,

    -- Event Info
    event_type VARCHAR(50) NOT NULL, -- launched, stopped, started, terminated, status_change
    old_status VARCHAR(50),
    new_status VARCHAR(50),

    -- Cost Snapshot
    spot_price_at_event DECIMAL(10, 4),
    cost_at_event DECIMAL(10, 2),

    -- Metadata
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB, -- Additional event details

    INDEX idx_instance_id (instance_id),
    INDEX idx_event_type (event_type),
    INDEX idx_event_timestamp (event_timestamp)
);

-- AI Cost Summary table (for analytics and reporting)
CREATE TABLE IF NOT EXISTS ai_cost_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly

    -- Cost Metrics
    total_cost DECIMAL(10, 2) DEFAULT 0.00,
    instance_count INTEGER DEFAULT 0,
    gpu_hours DECIMAL(10, 2) DEFAULT 0.00,

    -- Breakdown by Instance Type
    cost_by_instance_type JSONB, -- {"g5.xlarge": 12.50, "g5.2xlarge": 24.30}
    cost_by_framework JSONB, -- {"ollama": 15.00, "vllm": 21.80}

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, period_start, period_end, period_type),
    INDEX idx_user_id (user_id),
    INDEX idx_period (period_start, period_end)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for ai_instances
CREATE TRIGGER update_ai_instances_updated_at
    BEFORE UPDATE ON ai_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for ai_aws_credentials
CREATE TRIGGER update_ai_aws_credentials_updated_at
    BEFORE UPDATE ON ai_aws_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate estimated cost
CREATE OR REPLACE FUNCTION calculate_instance_cost(
    p_instance_id UUID
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_spot_price DECIMAL(10, 4);
    v_launched_at TIMESTAMP WITH TIME ZONE;
    v_terminated_at TIMESTAMP WITH TIME ZONE;
    v_uptime_hours DECIMAL(10, 2);
    v_cost DECIMAL(10, 2);
BEGIN
    -- Get instance details
    SELECT spot_price, launched_at, terminated_at
    INTO v_spot_price, v_launched_at, v_terminated_at
    FROM ai_instances
    WHERE id = p_instance_id;

    -- Calculate uptime hours
    IF v_terminated_at IS NOT NULL THEN
        v_uptime_hours := EXTRACT(EPOCH FROM (v_terminated_at - v_launched_at)) / 3600;
    ELSE
        v_uptime_hours := EXTRACT(EPOCH FROM (NOW() - v_launched_at)) / 3600;
    END IF;

    -- Calculate cost
    v_cost := v_uptime_hours * COALESCE(v_spot_price, 0);

    RETURN ROUND(v_cost, 2);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE ai_instances IS 'Tracks AWS Spot GPU instances launched for LLM testing';
COMMENT ON TABLE ai_aws_credentials IS 'Stores encrypted AWS credentials per user';
COMMENT ON TABLE ai_instance_events IS 'Audit trail and event history for instances';
COMMENT ON TABLE ai_cost_summary IS 'Aggregated cost data for analytics and reporting';
