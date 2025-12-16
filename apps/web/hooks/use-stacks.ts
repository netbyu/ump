/**
 * React Query hooks for Stack Deployment API
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002";

// Types
export interface StackComponent {
  name: string;
  display_name: string;
  description?: string;
  image: string;
  tag: string;
  ports: Array<{ host: number; container: number }>;
  environment: Record<string, string>;
  volumes: string[];
  command?: string;
  depends_on: string[];
  cpu_limit?: number;
  memory_limit?: string;
  gpu_required: boolean;
  health_check?: Record<string, unknown>;
}

export interface StackResourceRequirements {
  min_ram_gb: number;
  min_vram_gb?: number;
  min_cpu_cores: number;
  min_disk_gb: number;
  requires_gpu: boolean;
  recommended_instance_type?: string;
}

export interface StackAutoSetup {
  create_llm_connections: boolean;
  configure_redis: boolean;
  run_database_migrations: boolean;
  pull_models: boolean;
  create_network: boolean;
  post_deploy_commands: string[];
  health_check_endpoints: string[];
  max_startup_time_seconds: number;
}

export interface StackTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  icon?: string;
  tags: string[];
  components: StackComponent[];
  deployment_targets: string[];
  resources: StackResourceRequirements;
  auto_setup: StackAutoSetup;
  configurable_options: Array<{
    id: string;
    label: string;
    type: string;
    default: unknown;
    description?: string;
  }>;
  setup_instructions?: string;
  usage_instructions?: string;
}

export interface DeployedComponent {
  name: string;
  container_id?: string;
  status: "pending" | "starting" | "running" | "stopped" | "error";
  port_mappings: Record<number, number>;
  health_status?: string;
  started_at?: string;
  error_message?: string;
}

export interface StackDeployment {
  id: string;
  stack_id: string;
  name: string;
  description?: string;
  deployment_target: string;
  status: "deploying" | "running" | "partially_running" | "stopped" | "error" | "terminated";
  docker_host_id?: string;
  docker_host_name?: string;
  aws_instance_id?: string;
  host_ip?: string;
  components: DeployedComponent[];
  total_components: number;
  running_components: number;
  access_urls: Record<string, string>;
  llm_connection_ids: string[];
  deployed_at: string;
  deployed_by?: string;
  last_health_check?: string;
}

export interface StackDeploymentCreate {
  stack_id: string;
  name: string;
  description?: string;
  deployment_target: string;
  docker_host_id?: string;
  portainer_endpoint_id?: number;
  aws_instance_type?: string;
  aws_region?: string;
  config_overrides?: Record<string, unknown>;
  create_llm_connections?: boolean;
  use_in_livekit?: boolean;
  use_in_temporal?: boolean;
}

// Query keys
const STACKS_KEY = "stacks";
const STACK_TEMPLATES_KEY = "stack-templates";
const STACK_DEPLOYMENTS_KEY = "stack-deployments";

// API functions
async function fetchStackTemplates(category?: string): Promise<StackTemplate[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);

  const url = `${AI_API_BASE}/api/stacks/templates${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch stack templates");
  }
  const result = await response.json();
  return result.templates || result;
}

async function fetchStackTemplate(stackId: string): Promise<StackTemplate> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/templates/${stackId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch stack template");
  }
  return response.json();
}

async function fetchStackDeployments(): Promise<StackDeployment[]> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/deployments`);
  if (!response.ok) {
    throw new Error("Failed to fetch stack deployments");
  }
  const result = await response.json();
  return result.stacks || result;
}

async function fetchStackDeployment(deploymentId: string): Promise<StackDeployment> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/deployments/${deploymentId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch stack deployment");
  }
  return response.json();
}

async function deployStack(data: StackDeploymentCreate): Promise<StackDeployment> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/deploy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to deploy stack");
  }
  return response.json();
}

async function stopStackDeployment(deploymentId: string): Promise<void> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/deployments/${deploymentId}/stop`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to stop stack deployment");
  }
}

async function startStackDeployment(deploymentId: string): Promise<void> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/deployments/${deploymentId}/start`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to start stack deployment");
  }
}

async function deleteStackDeployment(deploymentId: string): Promise<void> {
  const response = await fetch(`${AI_API_BASE}/api/stacks/deployments/${deploymentId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete stack deployment");
  }
}

// Hooks
export function useStackTemplates(category?: string) {
  return useQuery({
    queryKey: [STACK_TEMPLATES_KEY, category],
    queryFn: () => fetchStackTemplates(category),
    staleTime: 300000, // 5 minutes
  });
}

export function useStackTemplate(stackId: string) {
  return useQuery({
    queryKey: [STACK_TEMPLATES_KEY, stackId],
    queryFn: () => fetchStackTemplate(stackId),
    enabled: !!stackId,
  });
}

export function useStackDeployments() {
  return useQuery({
    queryKey: [STACK_DEPLOYMENTS_KEY],
    queryFn: fetchStackDeployments,
    staleTime: 10000, // 10 seconds - deployments can change quickly
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useStackDeployment(deploymentId: string) {
  return useQuery({
    queryKey: [STACK_DEPLOYMENTS_KEY, deploymentId],
    queryFn: () => fetchStackDeployment(deploymentId),
    enabled: !!deploymentId,
    refetchInterval: 10000, // Refetch every 10 seconds for active deployments
  });
}

export function useDeployStack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deployStack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STACK_DEPLOYMENTS_KEY] });
    },
  });
}

export function useStopStackDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: stopStackDeployment,
    onSuccess: (_, deploymentId) => {
      queryClient.invalidateQueries({ queryKey: [STACK_DEPLOYMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STACK_DEPLOYMENTS_KEY, deploymentId] });
    },
  });
}

export function useStartStackDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startStackDeployment,
    onSuccess: (_, deploymentId) => {
      queryClient.invalidateQueries({ queryKey: [STACK_DEPLOYMENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STACK_DEPLOYMENTS_KEY, deploymentId] });
    },
  });
}

export function useDeleteStackDeployment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteStackDeployment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [STACK_DEPLOYMENTS_KEY] });
    },
  });
}
