-- Migration: Add device_group_id column to devices table
-- Date: 2025-12-15
-- Description: Add device_group_id for direct group assignment and create default "Unassigned" group

-- Create default "Unassigned" group if it doesn't exist
INSERT INTO devices.device_groups (name, description, group_type, display_order, is_active)
SELECT 'Unassigned', 'Devices not assigned to any group', 'default', 0, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM devices.device_groups WHERE name = 'Unassigned'
);

-- Add device_group_id column if it doesn't exist
ALTER TABLE devices.devices
ADD COLUMN IF NOT EXISTS device_group_id INTEGER REFERENCES devices.device_groups(id);

-- Set default group for existing devices without a group
UPDATE devices.devices
SET device_group_id = (SELECT id FROM devices.device_groups WHERE name = 'Unassigned' LIMIT 1)
WHERE device_group_id IS NULL;

-- Create index on device_group_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_devices_device_group_id ON devices.devices(device_group_id);
