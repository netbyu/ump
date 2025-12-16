-- Nodes and Integrations Schema
-- Node = Physical/virtual system that can host multiple integrations
-- Integration = Specific service/role on a node using a provider

-- ============================================================================
-- Node Types
-- ============================================================================

CREATE TYPE node_type AS ENUM (
    'windows_server',
    'linux_server',
    'cloud_platform',      -- Salesforce, AWS, etc.
    'network_device',      -- Switches, routers
    'telephony_device',    -- PBX, gateway
    'virtualization_host', -- VMware, Hyper-V
    'container_host',      -- Docker, Kubernetes
    'database_server',
    'web_server',
    'application_server',
    'storage_system',
    'other'
);

CREATE TYPE node_status AS ENUM (
    'online',
    'offline',
    'degraded',
    'maintenance',
    'unknown'
);

-- ============================================================================
-- Nodes Table
-- Represents a physical or virtual system that can host integrations
-- ============================================================================

CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    node_type node_type NOT NULL DEFAULT 'other',

    -- Network Info
    hostname VARCHAR(255),
    ip_address VARCHAR(50),
    fqdn VARCHAR(255),  -- Fully qualified domain name

    -- Location
    location_id UUID,  -- REFERENCES locations(id)
    location_name VARCHAR(255),  -- Denormalized

    -- Status
    status node_status DEFAULT 'unknown',
    last_seen_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    os_type VARCHAR(100),  -- Windows, Linux, etc.
    os_version VARCHAR(100),
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255),

    -- Additional data
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,

    -- State
    is_active BOOLEAN DEFAULT TRUE,
    is_monitored BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Tenant
    tenant_id UUID
);

-- Indexes for nodes
CREATE INDEX idx_nodes_name ON nodes(name);
CREATE INDEX idx_nodes_type ON nodes(node_type);
CREATE INDEX idx_nodes_hostname ON nodes(hostname);
CREATE INDEX idx_nodes_ip_address ON nodes(ip_address);
CREATE INDEX idx_nodes_location_id ON nodes(location_id);
CREATE INDEX idx_nodes_status ON nodes(status);
CREATE INDEX idx_nodes_is_active ON nodes(is_active);
CREATE INDEX idx_nodes_tenant_id ON nodes(tenant_id);
CREATE INDEX idx_nodes_tags ON nodes USING GIN(tags);

-- ============================================================================
-- Node Integrations Table
-- Represents a specific service/role on a node
-- ============================================================================

CREATE TABLE node_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent node
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,

    -- Integration info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    purpose VARCHAR(100),  -- ad_sync, email, api, database, monitoring, etc.

    -- Provider and connector
    provider_id VARCHAR(255) NOT NULL,  -- e.g., "microsoft_ad", "salesforce"
    provider_name VARCHAR(255),  -- Denormalized
    connector_id UUID,  -- REFERENCES connectors(id)
    connector_name VARCHAR(255),  -- Denormalized

    -- Configuration specific to this integration
    config JSONB DEFAULT '{}'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    verification_status VARCHAR(50),  -- success, failed, pending
    last_error TEXT,

    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    use_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Tenant
    tenant_id UUID,

    UNIQUE(node_id, provider_id, purpose)  -- One integration per node/provider/purpose combo
);

-- Indexes for node_integrations
CREATE INDEX idx_ni_node_id ON node_integrations(node_id);
CREATE INDEX idx_ni_provider_id ON node_integrations(provider_id);
CREATE INDEX idx_ni_connector_id ON node_integrations(connector_id);
CREATE INDEX idx_ni_purpose ON node_integrations(purpose);
CREATE INDEX idx_ni_is_active ON node_integrations(is_active);
CREATE INDEX idx_ni_is_verified ON node_integrations(is_verified);
CREATE INDEX idx_ni_tenant_id ON node_integrations(tenant_id);

-- ============================================================================
-- Views
-- ============================================================================

-- Nodes with integration count
CREATE OR REPLACE VIEW nodes_with_integration_count AS
SELECT
    n.*,
    COUNT(ni.id) as integration_count,
    COUNT(CASE WHEN ni.is_active AND ni.is_verified THEN 1 END) as active_integration_count
FROM nodes n
LEFT JOIN node_integrations ni ON n.id = ni.node_id
GROUP BY n.id;

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_integrations_updated_at
    BEFORE UPDATE ON node_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE nodes IS
'Physical or virtual systems that can host multiple integrations (servers, platforms, devices)';

COMMENT ON TABLE node_integrations IS
'Specific service/role integrations on a node - one node can have many integrations';

COMMENT ON COLUMN node_integrations.purpose IS
'What this integration is for: ad_sync, email, api, database, monitoring, crm, ticketing, etc.';

-- ============================================================================
-- Sample Data
-- ============================================================================

-- Example: Microsoft Server with multiple integrations
INSERT INTO nodes (name, node_type, hostname, ip_address, description, os_type)
VALUES
    ('Microsoft Server 01', 'windows_server', 'ms-server-01', '192.168.1.50',
     'Main Windows server - AD, Exchange, SQL', 'Windows Server 2022'),
    ('FreePBX Production', 'telephony_device', 'pbx-prod', '192.168.1.100',
     'Production FreePBX server', 'Linux'),
    ('Salesforce Production', 'cloud_platform', 'company.salesforce.com', NULL,
     'Production Salesforce instance', 'SaaS')
ON CONFLICT DO NOTHING;
