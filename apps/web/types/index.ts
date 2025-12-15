// Navigation Types
export type PageView =
  | "dashboard"
  | "itsm-requests"
  | "monitoring"
  | "systems"
  | "phone-systems"
  | "call-report"
  | "automation-dashboard"
  | "automation-builder"
  | "agents"
  | "mcp"
  | "fax-management"
  | "ivr"
  | "self-service"
  | "integrations"
  | "devices"
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

export interface DeviceIntegration {
  id: number;
  device_id: number;
  integration_id?: number;
  host?: string;
  port?: number;
  base_url?: string;
  enabled: boolean;
  verify_ssl: boolean;
  timeout: number;
  config_extra?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Relationships
  credentials?: DeviceCredential[];
  ssh_config?: DeviceSSHConfig;
}

export type CredentialType = "basic" | "api_key" | "oauth" | "ssh_key";

export interface DeviceCredential {
  id: number;
  device_integration_id: number;
  credential_type: CredentialType;
  username?: string;
  // Note: encrypted fields are not exposed to frontend
  client_id?: string;
  created_at: string;
  updated_at: string;
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
