-- Migration: Add device_group_types lookup table
-- Date: 2025-12-15
-- Description: Create a lookup table for device group types with their behaviors

-- Create device_group_types lookup table
CREATE TABLE IF NOT EXISTS devices.device_group_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    grouping_behavior TEXT NOT NULL,  -- Description of how devices are grouped
    match_field VARCHAR(100),          -- Field to match on (e.g., 'device_group_id', 'location_id', 'device_type', 'manufacturer')
    icon VARCHAR(50),
    color VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default group types
INSERT INTO devices.device_group_types (name, display_name, description, grouping_behavior, match_field, icon, display_order, is_active)
VALUES
    ('manual', 'Manual', 'Devices are explicitly assigned to this group',
     'Devices must be manually assigned via device_group_id field', 'device_group_id', 'hand', 1, TRUE),

    ('by_location', 'By Location', 'Devices are automatically grouped by their location',
     'Devices are automatically matched based on their location_id or avaya_location_id', 'location_id', 'map-pin', 2, TRUE),

    ('by_type', 'By Device Type', 'Devices are automatically grouped by their type',
     'Devices are automatically matched based on their device_type field', 'device_type', 'layers', 3, TRUE),

    ('by_manufacturer', 'By Manufacturer', 'Devices are automatically grouped by manufacturer',
     'Devices are automatically matched based on their manufacturer field', 'manufacturer', 'factory', 4, TRUE)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    grouping_behavior = EXCLUDED.grouping_behavior,
    match_field = EXCLUDED.match_field,
    icon = EXCLUDED.icon,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Add group_type_id column to device_groups if it doesn't exist (for FK relationship)
ALTER TABLE devices.device_groups
ADD COLUMN IF NOT EXISTS group_type_id INTEGER REFERENCES devices.device_group_types(id);

-- Update existing groups to link to group_type_id based on group_type string
UPDATE devices.device_groups dg
SET group_type_id = dgt.id
FROM devices.device_group_types dgt
WHERE dg.group_type = dgt.name AND dg.group_type_id IS NULL;

-- Set default group_type_id for groups without one (default to 'manual')
UPDATE devices.device_groups
SET group_type_id = (SELECT id FROM devices.device_group_types WHERE name = 'manual' LIMIT 1)
WHERE group_type_id IS NULL;

-- Create index on group_type_id
CREATE INDEX IF NOT EXISTS idx_device_groups_group_type_id ON devices.device_groups(group_type_id);

-- Add comment to table
COMMENT ON TABLE devices.device_group_types IS 'Lookup table defining device group types and their grouping behaviors';
COMMENT ON COLUMN devices.device_group_types.grouping_behavior IS 'Human-readable description of how devices are assigned to groups of this type';
COMMENT ON COLUMN devices.device_group_types.match_field IS 'The device field used for automatic matching (e.g., location_id, device_type)';
