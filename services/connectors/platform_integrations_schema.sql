-- Platform Integrations Schema
-- For software/SaaS platform integrations (Salesforce, Slack, Teams, etc.)

CREATE TYPE integration_type AS ENUM ('device', 'platform');

-- ============================================================================
-- Platform Integrations
-- Similar to device integrations but for software platforms
-- ============================================================================

CREATE TABLE platform_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Platform identification
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Provider reference (from providers catalog)
    provider_id VARCHAR(255) NOT NULL, -- e.g., "salesforce", "slack", "teams"
    provider_name VARCHAR(255), -- Denormalized for quick access

    -- Integration type
    integration_type integration_type DEFAULT 'platform',

    -- Connector instance (from connectors table)
    connector_id UUID, -- REFERENCES connectors(id)

    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- REFERENCES users(id)
    updated_by UUID,

    -- Tenant isolation
    tenant_id UUID
);

-- Indexes for platform_integrations
CREATE INDEX idx_pi_provider_id ON platform_integrations(provider_id);
CREATE INDEX idx_pi_connector_id ON platform_integrations(connector_id);
CREATE INDEX idx_pi_integration_type ON platform_integrations(integration_type);
CREATE INDEX idx_pi_is_active ON platform_integrations(is_active);
CREATE INDEX idx_pi_tenant_id ON platform_integrations(tenant_id);

-- Add integration_type to existing device_integrations if needed
-- (Only if device_integrations table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables
               WHERE table_name = 'device_integrations') THEN
        ALTER TABLE device_integrations
        ADD COLUMN IF NOT EXISTS integration_type integration_type DEFAULT 'device';

        CREATE INDEX IF NOT EXISTS idx_device_integrations_type
        ON device_integrations(integration_type);
    END IF;
END $$;

-- Unified integrations view (combines devices and platforms)
-- Only create if device_integrations exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables
               WHERE table_name = 'device_integrations') THEN
        EXECUTE '
        CREATE OR REPLACE VIEW all_integrations AS
        SELECT
            id,
            name,
            ''device'' as source_table,
            integration_type,
            provider_id::text,
            connector_id,
            is_active,
            is_verified,
            created_at,
            updated_at
        FROM device_integrations
        UNION ALL
        SELECT
            id,
            name,
            ''platform'' as source_table,
            integration_type,
            provider_id,
            connector_id,
            is_active,
            is_verified,
            created_at,
            updated_at
        FROM platform_integrations';
    ELSE
        -- Just platform integrations view for now
        EXECUTE '
        CREATE OR REPLACE VIEW all_integrations AS
        SELECT
            id,
            name,
            ''platform'' as source_table,
            integration_type,
            provider_id,
            connector_id,
            is_active,
            is_verified,
            created_at,
            updated_at
        FROM platform_integrations';
    END IF;
END $$;

-- Comments
COMMENT ON TABLE platform_integrations IS
'Integrations with software platforms and SaaS applications (Salesforce, Slack, etc.)';

COMMENT ON VIEW all_integrations IS
'Unified view of all integrations (devices + platforms) for cross-type queries';
