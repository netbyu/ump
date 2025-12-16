/**
 * Platform Integration Types
 * For software/SaaS platform integrations (distinct from device integrations)
 */

export type IntegrationType = "device" | "platform";

export interface PlatformIntegration {
  id: string;
  name: string;
  description?: string;

  // Provider reference
  provider_id: string;
  provider_name?: string;
  provider_icon_url?: string;

  // Integration type
  integration_type: IntegrationType;

  // Connector instance
  connector_id?: string;
  connector_name?: string;

  // Configuration
  config?: Record<string, unknown>;

  // Status
  is_active: boolean;
  is_verified: boolean;
  last_verified_at?: string;
  last_sync_at?: string;

  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string;

  // Tenant
  tenant_id?: string;
}

export interface PlatformIntegrationCreate {
  name: string;
  description?: string;
  provider_id: string;
  connector_id?: string;
  config?: Record<string, unknown>;
}

export interface PlatformIntegrationUpdate {
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
  is_active?: boolean;
}

export interface PlatformIntegrationFilters {
  provider_id?: string;
  is_active?: boolean;
  search?: string;
}

export interface PlatformIntegrationList {
  items: PlatformIntegration[];
  total: number;
}

/**
 * Unified integration (combines device and platform)
 */
export interface UnifiedIntegration {
  id: string;
  name: string;
  source_table: "device" | "platform";
  integration_type: IntegrationType;
  provider_id: string;
  provider_name?: string;
  provider_icon_url?: string;
  connector_id?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
}
