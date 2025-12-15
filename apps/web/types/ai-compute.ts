/**
 * AI Compute Management Types
 */

export type Framework = "ollama" | "vllm" | "tgi" | "llama-cpp" | "custom";

export type InstanceStatus =
  | "pending"
  | "running"
  | "stopping"
  | "stopped"
  | "terminated"
  | "unknown";

export interface Instance {
  id: string;
  instance_id: string;
  name: string;
  instance_type: string;
  framework: Framework;
  model?: string;
  region: string;
  status: InstanceStatus;
  public_ip?: string;
  public_dns?: string;
  private_ip?: string;
  gpu?: string;
  gpu_memory?: string;
  spot_price?: number;
  max_price?: number;
  launched_at: string;
  terminated_at?: string;
  uptime_hours?: number;
  estimated_cost?: number;
  ssh_command?: string;
  ollama_endpoint?: string;
  vllm_endpoint?: string;
  tgi_endpoint?: string;
}

export interface InstanceCreate {
  instance_type: string;
  framework: Framework;
  model?: string;
  name: string;
  region?: string;
  volume_size_gb?: number;
  max_price?: number;
  hf_token?: string;
}

export interface InstanceListResponse {
  instances: Instance[];
  total: number;
  active_count: number;
  total_cost_estimate: number;
}

export interface InstanceTypeInfo {
  instance_type: string;
  gpu_count: number;
  gpu_model: string;
  gpu_memory_gb: number;
  vcpus: number;
  memory_gb: number;
  storage_gb: number;
  network_gbps: number;
  on_demand_price: number;
  spot_price_estimate: number;
  current_spot_price?: number;
  savings_percentage?: number;
  recommended_models: string[];
}

export interface PricingResponse {
  region: string;
  instance_types: InstanceTypeInfo[];
  updated_at: string;
}

export interface RecommendationRequest {
  model_name: string;
}

export interface RecommendationResponse {
  model_name: string;
  recommendations: InstanceTypeInfo[];
}
