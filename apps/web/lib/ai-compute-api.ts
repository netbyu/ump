/**
 * AI Compute Management API Client
 */

import type {
  Instance,
  InstanceCreate,
  InstanceListResponse,
  PricingResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "@/types/ai-compute";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

export const aiComputeAPI = {
  // Instances
  async listInstances(status?: string): Promise<InstanceListResponse> {
    const params = status ? `?status=${status}` : "";
    return fetchAPI<InstanceListResponse>(`/instances${params}`);
  },

  async getInstance(instanceId: string): Promise<Instance> {
    return fetchAPI<Instance>(`/instances/${instanceId}`);
  },

  async launchInstance(data: InstanceCreate): Promise<Instance> {
    return fetchAPI<Instance>("/instances/launch", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async terminateInstance(instanceId: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/instances/${instanceId}`, {
      method: "DELETE",
    });
  },

  async stopInstance(instanceId: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/instances/${instanceId}/stop`, {
      method: "POST",
    });
  },

  async startInstance(instanceId: string): Promise<{ message: string }> {
    return fetchAPI<{ message: string }>(`/instances/${instanceId}/start`, {
      method: "POST",
    });
  },

  // Pricing
  async getPricing(): Promise<PricingResponse> {
    return fetchAPI<PricingResponse>("/pricing");
  },

  async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    return fetchAPI<RecommendationResponse>("/pricing/recommendations", {
      method: "POST",
      body: JSON.stringify(request),
    });
  },

  async getSpotPrice(instanceType: string) {
    return fetchAPI<{
      instance_type: string;
      current_spot_price: number;
      on_demand_price?: number;
      savings_percentage?: number;
      timestamp: string;
    }>(`/pricing/spot/${instanceType}`);
  },

  // Quotas
  async getSpotCapacity(region?: string) {
    const params = region ? `?region=${region}` : "";
    return fetchAPI<{
      region: string;
      vcpu_limit: number | null;
      vcpu_used: number;
      vcpu_available: number | null;
      instance_limits: Record<string, {
        vcpus: number;
        max_instances: number | null;
        sufficient_quota: boolean;
      }>;
      spot_availability: Record<string, {
        available: boolean;
        availability_zones: string[];
      }>;
      running_instances?: Record<string, number>;
    }>(`/quotas/spot-capacity${params}`);
  },

  async getServiceQuotas(region?: string) {
    const params = region ? `?region=${region}` : "";
    return fetchAPI<{
      region: string;
      quotas: Record<string, {
        value: number | null;
        adjustable: boolean;
        unit: string;
        error?: string;
      }>;
    }>(`/quotas/service-quotas${params}`);
  },

  // Models
  async getCuratedModels(framework?: string) {
    const params = framework ? `?framework=${framework}` : "";
    return fetchAPI<any>(`/models/curated${params}`);
  },

  async searchModels(query: string, task: string = "text-generation", limit: number = 20) {
    return fetchAPI<{
      query: string;
      task: string;
      count: number;
      models: Array<{
        id: string;
        name: string;
        author: string;
        downloads: number;
        likes: number;
        tags: string[];
        pipeline_tag: string;
        description?: string;
        gated: boolean;
      }>;
    }>(`/models/search?query=${encodeURIComponent(query)}&task=${task}&limit=${limit}`);
  },

  async getTrendingModels(task: string = "text-generation", limit: number = 20) {
    return fetchAPI<{
      task: string;
      count: number;
      models: Array<{
        id: string;
        name: string;
        author: string;
        downloads: number;
        likes: number;
        tags: string[];
        pipeline_tag: string;
        gated: boolean;
      }>;
    }>(`/models/trending?task=${task}&limit=${limit}`);
  },
};
