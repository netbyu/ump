// Navigation Types
export type PageView =
  | "dashboard"
  | "itsm-requests"
  | "monitoring"
  | "phone-systems"
  | "call-report"
  | "automation-dashboard"
  | "automation-builder"
  | "agents"
  | "mcp"
  | "ai-compute"
  | "fax-management"
  | "ivr"
  | "self-service"
  | "nodes"
  | "providers"
  | "connectors"
  | "stacks"
  | "admin"
  | "settings";

// User & Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "admin" | "operator" | "viewer";

export interface UserPermissions {
  roles: string[];
  permissions: {
    resource: string;
    actions: string[];
  }[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Phone System Types
export interface PhoneSystem {
  id: string;
  name: string;
  type: PhoneSystemType;
  status: SystemStatus;
  ipAddress: string;
  location: string;
  totalExtensions: number;
  activeExtensions: number;
  lastSync: string;
  createdAt: string;
}

export type PhoneSystemType = "cisco" | "avaya" | "asterisk" | "teams" | "other";

export type SystemStatus = "online" | "offline" | "degraded" | "maintenance";

export interface Extension {
  id: string;
  number: string;
  displayName: string;
  userId?: string;
  phoneSystemId: string;
  status: ExtensionStatus;
  type: ExtensionType;
}

export type ExtensionStatus = "registered" | "unregistered" | "busy" | "dnd";

export type ExtensionType = "user" | "shared" | "conference" | "queue";

// Infrastructure Types
export interface InfrastructureDevice {
  id: string;
  name: string;
  type: DeviceType;
  ipAddress: string;
  status: SystemStatus;
  location: string;
  lastSeen: string;
  metadata: Record<string, unknown>;
}

export type DeviceType = "server" | "switch" | "router" | "gateway" | "pbx";

// Automation / Temporal Types
export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  schedule?: string;
  lastRun?: string;
  nextRun?: string;
  createdBy: string;
  createdAt: string;
}

export type WorkflowStatus = "active" | "paused" | "failed" | "completed";

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
}

export type ExecutionStatus = "running" | "completed" | "failed" | "cancelled";

// AI Chat Types (LiveKit)
export interface ChatSession {
  id: string;
  userId: string;
  status: ChatSessionStatus;
  startedAt: string;
  endedAt?: string;
  roomName: string;
}

export type ChatSessionStatus = "active" | "ended" | "error";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// Device Management Types (UCMP.devices schema)
export interface Device {
  id: number;
  uuid: string;
  device_name: string;
  device_type: string;
  device_type_id?: number;
  primary_address: string;
  location_id?: number;
  manufacturer?: string;
  manufacturer_id?: number;
  model?: string;
  serial_number?: string;
  firmware_version?: string;
  mac_address?: string;
  description?: string;
  is_active: boolean;
  has_vip?: boolean;
  vip_address?: string;
  extra_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Joined data from API
  device_type_name?: string;
  location_name?: string;
  manufacturer_name?: string;
  device_type_info?: DeviceTypeInfo;
  location_info?: DeviceLocation;
  manufacturer_info?: DeviceManufacturer;
}

export interface DeviceTypeInfo {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  category: DeviceCategory;
  is_active: boolean;
  display_order: number;
}

export type DeviceCategory = "server" | "telephony" | "endpoint" | "network" | "other";

export interface DeviceManufacturer {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  website?: string;
  logo_url?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  display_order: number;
}

export interface DeviceLocation {
  id: number;
  uuid: string;
  name: string;
  code?: string;
  organization?: string;
  organization_full?: string;
  avaya_location_id?: number;
  avaya_smgr_id?: number;
  address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  description?: string;
  is_active: boolean;
  parent_id?: number;
  extra_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Group types define how devices are assigned to groups
// - manual: Devices explicitly assigned via DeviceGroupMembership
// - by_location: Auto-group devices by location_id
// - by_type: Auto-group devices by device_type
// - by_manufacturer: Auto-group devices by manufacturer
export type DeviceGroupTypeName = "manual" | "by_location" | "by_type" | "by_manufacturer";

// Database-defined group type with behavior description
export interface DeviceGroupTypeInfo {
  id: number;
  name: DeviceGroupTypeName;
  display_name: string;
  description?: string;
  grouping_behavior: string;
  match_field?: string;
  icon?: string;
  color?: string;
}

export interface DeviceGroup {
  id: number;
  name: string;
  parent_id?: number;
  description?: string;
  group_type?: DeviceGroupTypeName;  // Legacy string field
  group_type_id?: number;
  group_type_info?: DeviceGroupTypeInfo;
  icon?: string;
  color?: string;
  display_order: number;
  is_active: boolean;
  avaya_location_id?: number;
  extra_data?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface DeviceGroupMembership {
  id: number;
  device_id: number;
  group_id: number;
  added_at: string;
  added_by?: string;
  is_primary: boolean;
  notes?: string;
}

// =============================================================================
// Credential Group Types (Reusable credentials)
// =============================================================================

export type CredentialType = "basic" | "api_key" | "oauth" | "ssh_key" | "custom";
export type CredentialScope = "global" | "location" | "group";

/**
 * CredentialGroup - Reusable credentials that can be shared across device integrations
 */
export interface CredentialGroup {
  id: number;
  name: string;
  description?: string;
  credential_type: CredentialType;

  // Display metadata (non-sensitive)
  username?: string; // For basic auth display
  key_hint?: string; // Last 4 chars of API key

  // Scope and access
  scope: CredentialScope;
  scope_id?: number; // location_id or group_id if scoped

  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;

  // Usage count (from API)
  usage_count?: number;
}

export interface CredentialGroupCreate {
  name: string;
  description?: string;
  credential_type: CredentialType;
  credentials: Record<string, string>; // The actual credentials to encrypt
  scope?: CredentialScope;
  scope_id?: number;
}

export interface CredentialGroupUpdate {
  name?: string;
  description?: string;
  credentials?: Record<string, string>; // Only if updating credentials
  scope?: CredentialScope;
  scope_id?: number;
  is_active?: boolean;
}

// =============================================================================
// Device Integration Types
// =============================================================================

export type CredentialSource = "local" | "group";

/**
 * DeviceIntegration - Links a Device directly to a Provider
 *
 * Simplified architecture: Device -> Provider (no Connector intermediary)
 * Inherits host from device.primary_address by default.
 *
 * Credentials can be:
 * - Local: stored directly on the integration
 * - Group: reference to a shared CredentialGroup
 */
export interface DeviceIntegration {
  id: number;
  device_id: number;
  provider_id: string; // Provider ID from connectors service catalog

  // Connection settings (null = inherit from device/provider defaults)
  host_override?: string; // If null, use device.primary_address
  port?: number;
  base_url?: string;

  // Provider-specific configuration (based on provider's config schema)
  config?: Record<string, unknown>;

  // Credential source
  credential_source: CredentialSource;
  credential_group_id?: number; // If credential_source='group'

  // Local credential metadata (only when credential_source='local')
  // Note: actual credentials are encrypted, only metadata shown
  credential_username?: string;
  credential_type?: CredentialType;

  // Config
  enabled: boolean;
  verify_ssl: boolean;
  timeout: number;

  // Status
  is_verified: boolean;
  last_verified_at?: string;
  last_error?: string;

  created_at: string;
  updated_at: string;

  // Denormalized (from API joins)
  device_name?: string;
  device_address?: string;
  provider_name?: string;
  provider_category?: string;
  credential_group_name?: string;
}

export interface DeviceIntegrationCreate {
  provider_id: string;
  host_override?: string;
  port?: number;
  base_url?: string;
  config?: Record<string, unknown>; // Provider-specific config
  credential_source?: CredentialSource;
  credential_group_id?: number; // If using shared credentials
  credentials?: Record<string, string>; // If using local credentials
  enabled?: boolean;
  verify_ssl?: boolean;
  timeout?: number;
}

export interface DeviceIntegrationUpdate {
  host_override?: string;
  port?: number;
  base_url?: string;
  config?: Record<string, unknown>;
  credential_source?: CredentialSource;
  credential_group_id?: number;
  credentials?: Record<string, string>;
  enabled?: boolean;
  verify_ssl?: boolean;
  timeout?: number;
}

export interface DeviceSSHConfig {
  id: number;
  device_integration_id: number;
  enabled: boolean;
  ssh_host?: string;
  ssh_port: number;
  ssh_username?: string;
  config_path?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceCreate {
  device_name: string;
  device_type?: string;
  device_type_id?: number;
  primary_address: string;
  location_id?: number;
  manufacturer?: string;
  manufacturer_id?: number;
  model?: string;
  serial_number?: string;
  firmware_version?: string;
  mac_address?: string;
  description?: string;
  is_active?: boolean;
  has_vip?: boolean;
  vip_address?: string;
}

export interface DeviceUpdate extends Partial<DeviceCreate> {}

export interface DeviceFilters {
  device_type?: string;
  device_type_id?: number;
  manufacturer_id?: number;
  location_id?: number;
  is_active?: boolean;
  search?: string;
}

// =============================================================================
// Provider & Connector Types (Connectors Service)
// =============================================================================

/**
 * Provider - Template/definition of an external service (e.g., Zabbix, Portainer, Asterisk)
 * Defines how to connect to a type of service
 */
export interface Provider {
  id: string;
  name: string;
  description: string;
  version: string;
  icon_url?: string;
  categories: string[];
  tags: string[];
  protocol: ProtocolType;
  auth_type: string;
  supports_webhooks: boolean;
}

/**
 * Protocol types for provider communication
 */
export type ProtocolType =
  | "rest"
  | "json_rpc"
  | "graphql"
  | "soap"
  | "grpc"
  | "websocket"
  | "native"
  | "ami"
  | "custom";

export interface ProviderAuthSchema {
  auth_type: string;
  fields: ProviderField[];
  oauth2_config?: Record<string, unknown>;
}

export interface ProviderDetail extends Provider {
  actions: ProviderAction[];
  triggers: ProviderTrigger[];
  auth_schema: ProviderAuthSchema;
  documentation_url?: string;
  base_url?: string;
}

export interface ProviderAction {
  id: string;
  name: string;
  description: string;
  category?: string;
  inputs: ProviderField[];
  outputs: ProviderField[];
  is_idempotent: boolean;
}

export interface ProviderTrigger {
  id: string;
  name: string;
  description: string;
  trigger_type: "polling" | "webhook" | "event";
  outputs: ProviderField[];
  config_fields: ProviderField[];
}

export interface ProviderField {
  name: string;
  type: string;
  label: string;
  description?: string;
  required: boolean;
  default?: unknown;
  options?: { value: string; label: string }[];
  placeholder?: string;
  secret?: boolean;
}

export interface ProviderFilters {
  category?: string;
  search?: string;
  auth_type?: string;
}

/**
 * Connector - A configured instance of a provider with stored credentials
 * Represents a connection to a specific device/service
 */
export interface Connector {
  id: string;
  name: string;
  provider_id: string;
  description: string;
  is_active: boolean;
  is_verified: boolean;
  last_verified_at?: string;
  created_at?: string;
  updated_at?: string;
  // Denormalized provider info
  provider_name?: string;
  provider_icon_url?: string;
}

export interface ConnectorCreate {
  name: string;
  provider_id: string;
  description?: string;
  credentials: Record<string, unknown>;
  config?: Record<string, unknown>;
}

export interface ConnectorUpdate {
  name?: string;
  description?: string;
  credentials?: Record<string, unknown>;
  config?: Record<string, unknown>;
  is_active?: boolean;
}

export interface ConnectorFilters {
  provider_id?: string;
  is_active?: boolean;
  search?: string;
}

export interface ConnectorList {
  items: Connector[];
  total: number;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details: Record<string, unknown>;
}

// =============================================================================
// Platforms Types (Management platforms, monitoring systems)
// =============================================================================

export type PlatformCategory = "monitoring" | "telecom" | "infrastructure" | "management" | "other";

/**
 * PlatformType - Lookup for types of platforms (monitoring, management, provisioning)
 */
export interface PlatformTypeInfo {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: PlatformCategory;
  is_active: boolean;
  display_order: number;
}

/**
 * Platform - Services/systems that we query for device-related information.
 *
 * Unlike Devices (physical/virtual endpoints), Platforms are management systems,
 * monitoring systems, or service endpoints that aggregate or control multiple devices.
 * Examples: Zabbix, Avaya SMGR, Cisco UCM, Portainer, etc.
 */
export interface Platform {
  id: number;
  uuid: string;
  name: string;
  platform_type: string;
  platform_type_id?: number;
  platform_type_name?: string;
  platform_type_info?: PlatformTypeInfo;

  // Connection information
  primary_address: string;
  port?: number;
  base_path?: string;

  // Provider link (from connectors service catalog)
  provider_id?: string;

  description?: string;

  // Vendor info
  vendor?: string;
  version?: string;

  // Status
  is_active: boolean;
  is_verified: boolean;
  last_verified_at?: string;
  last_sync_at?: string;
  last_error?: string;

  // Configuration
  config?: Record<string, unknown>;

  // Credential settings
  credential_source: CredentialSource;
  credential_group_id?: number;
  credential_group_name?: string;

  // SSL/Connection settings
  verify_ssl: boolean;
  timeout: number;

  // Metadata
  extra_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface PlatformCreate {
  name: string;
  platform_type?: string;
  platform_type_id?: number;
  primary_address: string;
  port?: number;
  base_path?: string;
  provider_id?: string;
  description?: string;
  vendor?: string;
  version?: string;
  config?: Record<string, unknown>;
  credential_source?: CredentialSource;
  credential_group_id?: number;
  credentials?: Record<string, string>;
  verify_ssl?: boolean;
  timeout?: number;
  is_active?: boolean;
}

export interface PlatformUpdate extends Partial<PlatformCreate> {}

export interface PlatformFilters {
  platform_type?: string;
  platform_type_id?: number;
  is_active?: boolean;
  is_verified?: boolean;
  search?: string;
}

// Legacy aliases for backwards compatibility
export type SystemCategory = PlatformCategory;
export type SystemTypeInfo = PlatformTypeInfo;
export type System = Platform;
export type SystemCreate = PlatformCreate;
export type SystemUpdate = PlatformUpdate;
export type SystemFilters = PlatformFilters;
