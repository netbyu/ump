-- Workflow Deployment & Step-Level Automation Schema
-- PostgreSQL schema for granular workflow deployment control

-- ============================================================================
-- Step Impact and Deployment Configuration
-- ============================================================================

CREATE TYPE step_impact_level AS ENUM (
    'accessory',    -- Low risk: logs, notifications, non-critical
    'read',         -- Low risk: queries, data fetching
    'write',        -- Medium risk: updates, creates, modifications
    'critical',     -- High risk: deletions, payments, irreversible ops
    'external'      -- Variable risk: third-party API calls
);

CREATE TYPE step_deployment_mode AS ENUM (
    'always_auto',          -- No approval needed, runs automatically
    'auto_monitored',       -- Runs auto but heavily monitored
    'validation_required',  -- Human validation required
    'always_manual'         -- Always requires approval
);

CREATE TYPE workflow_deployment_mode AS ENUM (
    'draft',       -- Not deployed
    'manual',      -- All steps require approval
    'monitoring',  -- Auto-run with metrics tracking
    'automated',   -- Fully automated
    'canary',      -- A/B testing mode
    'paused'       -- Temporarily disabled
);

-- ============================================================================
-- Workflow Step Deployment Configuration
-- ============================================================================

CREATE TABLE workflow_step_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL, -- e.g., "customer_onboarding"
    step_id VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,

    -- Step identification
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- http_request, database_write, send_email, etc.

    -- Risk classification
    impact_level step_impact_level NOT NULL DEFAULT 'write',
    risk_level VARCHAR(50) NOT NULL DEFAULT 'medium', -- low, medium, high, critical

    -- Current deployment mode
    current_mode step_deployment_mode NOT NULL DEFAULT 'validation_required',

    -- Validation configuration (for validation_required/always_manual modes)
    validation_config JSONB DEFAULT '{
        "show_preview": true,
        "require_confirmation": false,
        "require_typed_confirmation": false,
        "confirmation_text": null,
        "approval_template": "Approve execution of {{step_name}}?",
        "timeout_minutes": 30,
        "show_impact_analysis": true,
        "required_checkboxes": []
    }'::jsonb,

    -- Promotion criteria (mode-specific thresholds)
    promotion_criteria JSONB DEFAULT '{
        "min_success_rate": 95.0,
        "min_successful_runs": 100,
        "min_consecutive_success": 50,
        "monitoring_days": 7,
        "max_error_rate": 5.0
    }'::jsonb,

    -- Monitoring configuration
    monitoring_config JSONB DEFAULT '{
        "track_performance": true,
        "alert_on_failure": true,
        "alert_threshold": 3,
        "rollback_threshold": 85.0,
        "collect_metrics": true
    }'::jsonb,

    -- Promotion history
    promoted_from step_deployment_mode,
    promoted_at TIMESTAMP WITH TIME ZONE,
    promoted_by UUID, -- REFERENCES users(id)
    promotion_reason TEXT,

    -- Rollback history
    last_rollback_at TIMESTAMP WITH TIME ZONE,
    rollback_count INTEGER DEFAULT 0,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(workflow_id, step_id)
);

-- Indexes for workflow_step_deployments
CREATE INDEX idx_wsd_workflow_id ON workflow_step_deployments(workflow_id);
CREATE INDEX idx_wsd_step_id ON workflow_step_deployments(step_id);
CREATE INDEX idx_wsd_current_mode ON workflow_step_deployments(current_mode);
CREATE INDEX idx_wsd_impact_level ON workflow_step_deployments(impact_level);

-- ============================================================================
-- Workflow Deployments
-- ============================================================================

CREATE TABLE workflow_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL,

    -- Deployment info
    deployment_mode workflow_deployment_mode NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,

    -- Deployment metadata
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deployed_by UUID, -- REFERENCES users(id)
    deployment_notes TEXT,

    -- Canary configuration (for canary mode)
    canary_percentage INTEGER CHECK (canary_percentage BETWEEN 0 AND 100),
    canary_baseline_workflow_id UUID, -- Compare against this workflow

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    deactivated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for workflow_deployments
CREATE INDEX idx_wd_workflow_id ON workflow_deployments(workflow_id);
CREATE INDEX idx_wd_deployment_mode ON workflow_deployments(deployment_mode);
CREATE INDEX idx_wd_is_active ON workflow_deployments(is_active);

-- ============================================================================
-- Workflow Executions (with step tracking)
-- ============================================================================

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL,
    deployment_id UUID REFERENCES workflow_deployments(id),

    -- Execution details
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, waiting_approval, completed, failed, cancelled
    deployment_mode workflow_deployment_mode NOT NULL,

    -- Current step (for running executions)
    current_step_id VARCHAR(255),
    current_step_order INTEGER,
    pending_approval BOOLEAN DEFAULT FALSE,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- Results
    total_steps INTEGER NOT NULL,
    completed_steps INTEGER DEFAULT 0,
    failed_step_id VARCHAR(255),
    error_message TEXT,

    -- Trigger info
    triggered_by VARCHAR(100), -- manual, schedule, webhook, event
    trigger_data JSONB,

    -- Retry tracking
    retry_count INTEGER DEFAULT 0,
    is_retry BOOLEAN DEFAULT FALSE,
    original_execution_id UUID
);

-- Indexes for workflow_executions
CREATE INDEX idx_we_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_we_deployment_id ON workflow_executions(deployment_id);
CREATE INDEX idx_we_status ON workflow_executions(status);
CREATE INDEX idx_we_pending_approval ON workflow_executions(pending_approval);
CREATE INDEX idx_we_started_at ON workflow_executions(started_at);

-- ============================================================================
-- Step Executions (detailed step tracking)
-- ============================================================================

CREATE TABLE workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id VARCHAR(255) NOT NULL,
    workflow_id VARCHAR(255) NOT NULL,

    -- Step info
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(100) NOT NULL,
    deployment_mode step_deployment_mode NOT NULL,

    -- Execution status
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, waiting_approval, running, completed, failed, skipped

    -- Approval tracking (for manual/validation modes)
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID, -- REFERENCES users(id)
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_action VARCHAR(50), -- approved, rejected, edited
    approval_notes TEXT,

    -- Preview data (shown during approval)
    preview_data JSONB,
    impact_analysis JSONB,

    -- Execution details
    input_data JSONB,
    output_data JSONB,
    error_data JSONB,

    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,

    -- Retry tracking
    retry_count INTEGER DEFAULT 0
);

-- Indexes for workflow_step_executions
CREATE INDEX idx_wse_execution_id ON workflow_step_executions(execution_id);
CREATE INDEX idx_wse_step_id ON workflow_step_executions(step_id);
CREATE INDEX idx_wse_status ON workflow_step_executions(status);
CREATE INDEX idx_wse_requires_approval ON workflow_step_executions(requires_approval);
CREATE INDEX idx_wse_started_at ON workflow_step_executions(started_at);

-- ============================================================================
-- Step Metrics (aggregated analytics)
-- ============================================================================

CREATE TABLE workflow_step_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id VARCHAR(255) NOT NULL,
    step_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    deployment_mode step_deployment_mode NOT NULL,

    -- Execution metrics
    total_executions INTEGER DEFAULT 0,
    successful_executions INTEGER DEFAULT 0,
    failed_executions INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),

    -- Performance metrics
    avg_duration_ms INTEGER,
    p50_duration_ms INTEGER,
    p95_duration_ms INTEGER,
    p99_duration_ms INTEGER,
    min_duration_ms INTEGER,
    max_duration_ms INTEGER,

    -- Approval metrics (for manual/validation modes)
    total_approvals INTEGER DEFAULT 0,
    total_rejections INTEGER DEFAULT 0,
    total_edits INTEGER DEFAULT 0,
    avg_approval_time_seconds INTEGER,

    -- Consecutive tracking
    consecutive_successes INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,

    -- Error tracking
    error_types JSONB, -- {"timeout": 5, "validation": 2, "network": 1}

    UNIQUE(workflow_id, step_id, date)
);

-- Indexes for workflow_step_metrics_daily
CREATE INDEX idx_wsmd_workflow_step ON workflow_step_metrics_daily(workflow_id, step_id);
CREATE INDEX idx_wsmd_date ON workflow_step_metrics_daily(date);

-- ============================================================================
-- Functions
-- ============================================================================

-- Calculate if step is ready for promotion
CREATE OR REPLACE FUNCTION check_step_promotion_ready(
    p_workflow_id UUID,
    p_step_id UUID,
    p_current_mode step_deployment_mode
)
RETURNS JSONB AS $$
DECLARE
    v_config RECORD;
    v_metrics RECORD;
    v_result JSONB;
BEGIN
    -- Get step configuration
    SELECT * INTO v_config
    FROM workflow_step_deployments
    WHERE workflow_id = p_workflow_id AND step_id = p_step_id;

    -- Calculate metrics from last N days
    SELECT
        SUM(total_executions) as total_runs,
        AVG(success_rate) as avg_success_rate,
        MAX(consecutive_successes) as max_consecutive,
        COUNT(DISTINCT date) as monitoring_days
    INTO v_metrics
    FROM workflow_step_metrics_daily
    WHERE workflow_id = p_workflow_id
      AND step_id = p_step_id
      AND date >= CURRENT_DATE - INTERVAL '30 days';

    -- Extract criteria from JSONB
    v_result := jsonb_build_object(
        'ready', (
            v_metrics.avg_success_rate >= (v_config.promotion_criteria->>'min_success_rate')::numeric AND
            v_metrics.total_runs >= (v_config.promotion_criteria->>'min_successful_runs')::integer AND
            v_metrics.max_consecutive >= (v_config.promotion_criteria->>'min_consecutive_success')::integer AND
            v_metrics.monitoring_days >= (v_config.promotion_criteria->>'monitoring_days')::integer
        ),
        'current_metrics', jsonb_build_object(
            'success_rate', COALESCE(v_metrics.avg_success_rate, 0),
            'total_runs', COALESCE(v_metrics.total_runs, 0),
            'consecutive_successes', COALESCE(v_metrics.max_consecutive, 0),
            'monitoring_days', COALESCE(v_metrics.monitoring_days, 0)
        ),
        'required_criteria', v_config.promotion_criteria
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_workflow_step_deployments_updated_at
    BEFORE UPDATE ON workflow_step_deployments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE workflow_step_deployments IS 'Per-step deployment configuration and promotion criteria';
COMMENT ON TABLE workflow_executions IS 'Workflow execution tracking with step-level approval support';
COMMENT ON TABLE workflow_step_executions IS 'Detailed tracking of individual step executions';
COMMENT ON TABLE workflow_step_metrics_daily IS 'Daily aggregated metrics per step for promotion decisions';
