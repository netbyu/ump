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
  | "fax-management"
  | "ivr"
  | "self-service"
  | "integrations"
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
