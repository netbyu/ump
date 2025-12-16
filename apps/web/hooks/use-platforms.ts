/**
 * React Query hooks for Platforms API
 *
 * Platforms are external services/systems we query for device-related information.
 * Examples: Zabbix, Avaya SMGR, Cisco UCM, Portainer, etc.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Platform,
  PlatformCreate,
  PlatformUpdate,
  PlatformFilters,
  PlatformTypeInfo,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

// Query keys
const PLATFORMS_KEY = "platforms";
const PLATFORM_TYPES_KEY = "platform-types";

// API functions
async function fetchPlatforms(filters?: PlatformFilters): Promise<Platform[]> {
  const params = new URLSearchParams();
  if (filters?.platform_type) params.append("platform_type", filters.platform_type);
  if (filters?.platform_type_id) params.append("platform_type_id", filters.platform_type_id.toString());
  if (filters?.is_active !== undefined) params.append("is_active", filters.is_active.toString());
  if (filters?.is_verified !== undefined) params.append("is_verified", filters.is_verified.toString());
  if (filters?.search) params.append("search", filters.search);

  const url = `${API_BASE}/api/platforms${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch platforms");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchPlatform(platformId: number): Promise<Platform> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch platform");
  }
  const result = await response.json();
  return result.data || result;
}

async function createPlatform(platform: PlatformCreate): Promise<Platform> {
  const response = await fetch(`${API_BASE}/api/platforms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(platform),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create platform");
  }
  const result = await response.json();
  return result.data || result;
}

async function updatePlatform(platformId: number, platform: PlatformUpdate): Promise<Platform> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(platform),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update platform");
  }
  const result = await response.json();
  return result.data || result;
}

async function deletePlatform(platformId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete platform");
  }
}

async function activatePlatform(platformId: number): Promise<Platform> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}/activate`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to activate platform");
  }
  const result = await response.json();
  return result.data || result;
}

async function deactivatePlatform(platformId: number): Promise<Platform> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}/deactivate`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to deactivate platform");
  }
  const result = await response.json();
  return result.data || result;
}

async function testPlatformConnection(platformId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}/test`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to test platform connection");
  }
  return response.json();
}

async function syncPlatform(platformId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/platforms/${platformId}/sync`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to sync platform");
  }
  return response.json();
}

// Lookup data fetchers
async function fetchPlatformTypes(): Promise<PlatformTypeInfo[]> {
  const response = await fetch(`${API_BASE}/api/platforms/types`);
  if (!response.ok) {
    throw new Error("Failed to fetch platform types");
  }
  const result = await response.json();
  return result.data || result;
}

// Hooks
export function usePlatforms(filters?: PlatformFilters) {
  return useQuery({
    queryKey: [PLATFORMS_KEY, filters],
    queryFn: () => fetchPlatforms(filters),
    staleTime: 30000, // 30 seconds
  });
}

export function usePlatform(platformId: number) {
  return useQuery({
    queryKey: [PLATFORMS_KEY, platformId],
    queryFn: () => fetchPlatform(platformId),
    enabled: !!platformId,
  });
}

export function usePlatformTypes() {
  return useQuery({
    queryKey: [PLATFORM_TYPES_KEY],
    queryFn: fetchPlatformTypes,
    staleTime: 300000, // 5 minutes - lookup data changes rarely
  });
}

export function useCreatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
    },
  });
}

export function useUpdatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platformId, platform }: { platformId: number; platform: PlatformUpdate }) =>
      updatePlatform(platformId, platform),
    onSuccess: (_, { platformId }) => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY, platformId] });
    },
  });
}

export function useDeletePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlatform,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
    },
  });
}

export function useActivatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activatePlatform,
    onSuccess: (_, platformId) => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY, platformId] });
    },
  });
}

export function useDeactivatePlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivatePlatform,
    onSuccess: (_, platformId) => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY, platformId] });
    },
  });
}

export function useTestPlatformConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: testPlatformConnection,
    onSuccess: (_, platformId) => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY, platformId] });
    },
  });
}

export function useSyncPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncPlatform,
    onSuccess: (_, platformId) => {
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY] });
      queryClient.invalidateQueries({ queryKey: [PLATFORMS_KEY, platformId] });
    },
  });
}
