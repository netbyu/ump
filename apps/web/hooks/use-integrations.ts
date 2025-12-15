"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface IntegrationType {
  id: string;
  name: string;
  vendor: string;
  category: "itsm" | "pbx" | "crm" | "hr" | "comm";
  description: string;
  icon: string;
  supported_features: string[];
}

export interface Integration {
  id: string;
  integration_type_id: string;
  name: string;
  status: "active" | "inactive" | "error" | "configuring";
  enabled: boolean;
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
  integration_type?: IntegrationType;
  lastSync?: string;
  recordsCount?: number;
  errorCount?: number;
}

export interface CreateIntegrationData {
  integration_type_id: string;
  name: string;
  config: Record<string, string>;
}

export interface UpdateIntegrationData {
  name?: string;
  config?: Record<string, string>;
  enabled?: boolean;
}

// Fetch all integrations
export function useIntegrations() {
  return useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Integration[] }>("/api/integrations");
      return response;
    },
  });
}

// Fetch integration types
export function useIntegrationTypes() {
  return useQuery({
    queryKey: ["integration-types"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: IntegrationType[] }>("/api/integrations/types");
      return response;
    },
  });
}

// Fetch a single integration
export function useIntegration(id: string) {
  return useQuery({
    queryKey: ["integrations", id],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Integration }>(`/api/integrations/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// Create integration
export function useCreateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateIntegrationData) => {
      const response = await apiClient.post<{ data: Integration }>("/api/integrations", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

// Update integration
export function useUpdateIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateIntegrationData }) => {
      const response = await apiClient.put<{ data: Integration }>(`/api/integrations/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["integrations", variables.id] });
    },
  });
}

// Delete integration
export function useDeleteIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/integrations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
  });
}

// Test integration connection
export function useTestIntegration() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/api/integrations/${id}/test`
      );
      return response;
    },
  });
}

// Sync integration
export function useSyncIntegration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `/api/integrations/${id}/sync`
      );
      return response;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["integrations", id] });
    },
  });
}
