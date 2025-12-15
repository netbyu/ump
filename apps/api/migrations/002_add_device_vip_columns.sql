-- Migration: Add VIP columns to devices table
-- Date: 2025-12-15
-- Description: Add has_vip and vip_address columns for Virtual IP support

-- Add has_vip column (boolean, default false)
ALTER TABLE devices.devices
ADD COLUMN IF NOT EXISTS has_vip BOOLEAN DEFAULT FALSE;

-- Add vip_address column (varchar for IP address)
ALTER TABLE devices.devices
ADD COLUMN IF NOT EXISTS vip_address VARCHAR(255);

-- Optional: Create index on has_vip for filtering devices with VIPs
CREATE INDEX IF NOT EXISTS idx_devices_has_vip ON devices.devices(has_vip) WHERE has_vip = TRUE;

-- Optional: Create index on vip_address for searching by VIP
CREATE INDEX IF NOT EXISTS idx_devices_vip_address ON devices.devices(vip_address) WHERE vip_address IS NOT NULL;
