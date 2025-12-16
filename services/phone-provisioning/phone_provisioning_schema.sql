-- SIP Phone Provisioning Database Schema
-- PostgreSQL schema for auto-provisioning SIP phones

-- ============================================================================
-- Phone Vendors and Models
-- ============================================================================

CREATE TYPE phone_vendor AS ENUM (
    'yealink',
    'polycom',
    'cisco',
    'grandstream',
    'fanvil',
    'snom',
    'panasonic',
    'aastra',
    'other'
);

CREATE TYPE provisioning_protocol AS ENUM (
    'tftp',
    'http',
    'https',
    'ftp'
);

-- Phone models/hardware definitions
CREATE TABLE phone_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Model info
    vendor phone_vendor NOT NULL,
    model_name VARCHAR(100) NOT NULL,  -- e.g., "T46S", "VVX 450"
    display_name VARCHAR(255) NOT NULL,  -- e.g., "Yealink T46S"
    description TEXT,

    -- Hardware specs
    line_count INTEGER DEFAULT 1,  -- Number of SIP accounts
    has_color_display BOOLEAN DEFAULT FALSE,
    has_bluetooth BOOLEAN DEFAULT FALSE,
    has_wifi BOOLEAN DEFAULT FALSE,
    has_expansion_module BOOLEAN DEFAULT FALSE,

    -- Provisioning details
    provisioning_protocol provisioning_protocol DEFAULT 'tftp',
    config_file_pattern VARCHAR(255),  -- e.g., "{mac}.cfg", "y{mac}.cfg"
    firmware_pattern VARCHAR(255),     -- e.g., "{model}.rom"
    supports_auto_provision BOOLEAN DEFAULT TRUE,

    -- Template
    default_template_id UUID,  -- REFERENCES phone_templates(id)

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(vendor, model_name)
);

CREATE INDEX idx_phone_models_vendor ON phone_models(vendor);
CREATE INDEX idx_phone_models_is_active ON phone_models(is_active);

-- ============================================================================
-- Configuration Templates
-- ============================================================================

CREATE TABLE phone_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    vendor phone_vendor NOT NULL,
    model_pattern VARCHAR(100),  -- e.g., "T4*", "VVX *" - applies to multiple models

    -- Template content
    template_content TEXT NOT NULL,  -- Jinja2/template with variables

    -- Variables used in template
    required_variables JSONB DEFAULT '[]'::jsonb,  -- ["extension", "password", "server_ip"]
    optional_variables JSONB DEFAULT '{}'::jsonb,   -- {"timezone": "America/New_York"}

    -- Features
    features JSONB DEFAULT '{}'::jsonb,  -- {"blf": true, "call_forward": true, "voicemail": true}

    -- Version compatibility
    firmware_min_version VARCHAR(50),
    firmware_max_version VARCHAR(50),

    -- Priority (for selecting template)
    priority INTEGER DEFAULT 0,

    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    UNIQUE(name)
);

CREATE INDEX idx_phone_templates_vendor ON phone_templates(vendor);
CREATE INDEX idx_phone_templates_is_active ON phone_templates(is_active);

-- ============================================================================
-- Phone Assignments (MAC → Extension mapping)
-- ============================================================================

CREATE TABLE phone_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Phone identification
    mac_address VARCHAR(17) NOT NULL,  -- Format: AA:BB:CC:DD:EE:FF
    phone_model_id UUID REFERENCES phone_models(id),
    vendor phone_vendor,

    -- Assignment
    extension VARCHAR(20) NOT NULL,
    extension_name VARCHAR(255),  -- Display name
    sip_password VARCHAR(255),    -- SIP registration password (encrypted)

    -- PBX/Node reference
    pbx_node_id UUID,  -- REFERENCES nodes(id)
    pbx_server_ip VARCHAR(50),
    pbx_domain VARCHAR(255),

    -- Template
    template_id UUID REFERENCES phone_templates(id),

    -- Custom configuration
    custom_config JSONB DEFAULT '{}'::jsonb,  -- Overrides for this phone

    -- Network
    static_ip VARCHAR(50),
    subnet_mask VARCHAR(50),
    gateway VARCHAR(50),
    dns_server VARCHAR(50),
    vlan_id INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_provisioned BOOLEAN DEFAULT FALSE,
    last_provisioned_at TIMESTAMP WITH TIME ZONE,
    provisioning_status VARCHAR(50) DEFAULT 'pending',  -- pending, success, failed
    last_error TEXT,

    -- Phone status
    last_seen_at TIMESTAMP WITH TIME ZONE,
    firmware_version VARCHAR(50),
    ip_address VARCHAR(50),

    -- Location
    location_id UUID,
    physical_location TEXT,  -- e.g., "Building A, Floor 2, Desk 23"

    -- Metadata
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,

    UNIQUE(mac_address),
    UNIQUE(extension, pbx_node_id)  -- One extension per PBX
);

CREATE INDEX idx_phone_assignments_mac ON phone_assignments(mac_address);
CREATE INDEX idx_phone_assignments_extension ON phone_assignments(extension);
CREATE INDEX idx_phone_assignments_pbx_node ON phone_assignments(pbx_node_id);
CREATE INDEX idx_phone_assignments_phone_model ON phone_assignments(phone_model_id);
CREATE INDEX idx_phone_assignments_is_active ON phone_assignments(is_active);
CREATE INDEX idx_phone_assignments_is_provisioned ON phone_assignments(is_provisioned);
CREATE INDEX idx_phone_assignments_vendor ON phone_assignments(vendor);

-- ============================================================================
-- Provisioning Log
-- ============================================================================

CREATE TABLE phone_provisioning_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Phone
    assignment_id UUID REFERENCES phone_assignments(id) ON DELETE CASCADE,
    mac_address VARCHAR(17) NOT NULL,

    -- Request details
    request_ip VARCHAR(50),
    request_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_agent TEXT,
    protocol provisioning_protocol,

    -- Response
    config_generated BOOLEAN DEFAULT FALSE,
    config_file_path VARCHAR(500),
    config_size_bytes INTEGER,

    -- Status
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,

    -- Performance
    generation_time_ms INTEGER,

    INDEX idx_provisioning_log_assignment ON phone_provisioning_log(assignment_id),
    INDEX idx_provisioning_log_mac ON phone_provisioning_log(mac_address),
    INDEX idx_provisioning_log_request_time ON phone_provisioning_log(request_time)
);

-- ============================================================================
-- Firmware Repository
-- ============================================================================

CREATE TABLE phone_firmware (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Firmware info
    vendor phone_vendor NOT NULL,
    model_pattern VARCHAR(100),  -- Applies to which models
    version VARCHAR(50) NOT NULL,
    release_date DATE,

    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    checksum_md5 VARCHAR(32),

    -- Details
    release_notes TEXT,
    is_stable BOOLEAN DEFAULT TRUE,
    is_recommended BOOLEAN DEFAULT FALSE,

    -- Metadata
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID,

    UNIQUE(vendor, model_pattern, version)
);

CREATE INDEX idx_firmware_vendor ON phone_firmware(vendor);
CREATE INDEX idx_firmware_is_stable ON phone_firmware(is_stable);

-- ============================================================================
-- Functions
-- ============================================================================

-- Trigger for updated_at
CREATE TRIGGER update_phone_models_updated_at
    BEFORE UPDATE ON phone_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_templates_updated_at
    BEFORE UPDATE ON phone_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_assignments_updated_at
    BEFORE UPDATE ON phone_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to get provisioning stats
CREATE OR REPLACE FUNCTION get_provisioning_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
    total_phones BIGINT,
    provisioned_phones BIGINT,
    pending_phones BIGINT,
    failed_phones BIGINT,
    recent_provisions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_phones,
        COUNT(CASE WHEN is_provisioned THEN 1 END)::BIGINT as provisioned_phones,
        COUNT(CASE WHEN provisioning_status = 'pending' THEN 1 END)::BIGINT as pending_phones,
        COUNT(CASE WHEN provisioning_status = 'failed' THEN 1 END)::BIGINT as failed_phones,
        COUNT(CASE WHEN last_provisioned_at >= NOW() - (p_days || ' days')::INTERVAL THEN 1 END)::BIGINT as recent_provisions
    FROM phone_assignments
    WHERE is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE phone_models IS 'Supported IP phone hardware models';
COMMENT ON TABLE phone_templates IS 'Configuration templates for generating phone configs';
COMMENT ON TABLE phone_assignments IS 'MAC address to extension assignments for provisioning';
COMMENT ON TABLE phone_provisioning_log IS 'Audit log of provisioning requests';
COMMENT ON TABLE phone_firmware IS 'Firmware repository for IP phones';

-- ============================================================================
-- Sample Data
-- ============================================================================

-- Insert common phone models
INSERT INTO phone_models (vendor, model_name, display_name, line_count, config_file_pattern, description)
VALUES
    ('yealink', 'T46S', 'Yealink T46S', 16, 'y{mac}.cfg', 'Mid-range color display phone'),
    ('yealink', 'T48S', 'Yealink T48S', 16, 'y{mac}.cfg', 'High-end color touch screen'),
    ('polycom', 'VVX450', 'Polycom VVX 450', 12, '{mac}.cfg', 'Business media phone'),
    ('grandstream', 'GXP2170', 'Grandstream GXP2170', 12, 'cfg{mac}.xml', 'Enterprise IP phone'),
    ('cisco', '8841', 'Cisco 8841', 5, 'SEP{mac}.cnf.xml', 'Business IP phone')
ON CONFLICT (vendor, model_name) DO NOTHING;
