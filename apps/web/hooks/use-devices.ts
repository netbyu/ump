import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Device,
  DeviceCreate,
  DeviceUpdate,
  DeviceFilters,
  DeviceTypeInfo,
  DeviceManufacturer,
  DeviceLocation,
  DeviceGroup,
  DeviceGroupTypeInfo,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Query keys
const DEVICES_KEY = "devices";
const DEVICE_TYPES_KEY = "device-types";
const DEVICE_MANUFACTURERS_KEY = "device-manufacturers";
const DEVICE_LOCATIONS_KEY = "device-locations";
const DEVICE_GROUPS_KEY = "device-groups";
const DEVICE_GROUP_TYPES_KEY = "device-group-types";

// API functions
async function fetchDevices(filters?: DeviceFilters): Promise<Device[]> {
  const params = new URLSearchParams();
  if (filters?.device_type) params.append("device_type", filters.device_type);
  if (filters?.device_type_id) params.append("device_type_id", filters.device_type_id.toString());
  if (filters?.manufacturer_id) params.append("manufacturer_id", filters.manufacturer_id.toString());
  if (filters?.location_id) params.append("location_id", filters.location_id.toString());
  if (filters?.is_active !== undefined) params.append("is_active", filters.is_active.toString());
  if (filters?.search) params.append("search", filters.search);

  const url = `${API_BASE}/api/devices${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch devices");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchDevice(deviceId: number): Promise<Device> {
  const response = await fetch(`${API_BASE}/api/devices/${deviceId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch device");
  }
  return response.json();
}

async function createDevice(device: DeviceCreate): Promise<Device> {
  const response = await fetch(`${API_BASE}/api/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create device");
  }
  const result = await response.json();
  return result.data || result;
}

async function updateDevice(deviceId: number, device: DeviceUpdate): Promise<Device> {
  const response = await fetch(`${API_BASE}/api/devices/${deviceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update device");
  }
  const result = await response.json();
  return result.data || result;
}

async function deleteDevice(deviceId: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/devices/${deviceId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete device");
  }
}

async function activateDevice(deviceId: number): Promise<Device> {
  const response = await fetch(`${API_BASE}/api/devices/${deviceId}/activate`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to activate device");
  }
  return response.json();
}

async function deactivateDevice(deviceId: number): Promise<Device> {
  const response = await fetch(`${API_BASE}/api/devices/${deviceId}/deactivate`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error("Failed to deactivate device");
  }
  return response.json();
}

// Lookup data fetchers
async function fetchDeviceTypes(): Promise<DeviceTypeInfo[]> {
  const response = await fetch(`${API_BASE}/api/devices/types`);
  if (!response.ok) {
    throw new Error("Failed to fetch device types");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchDeviceManufacturers(): Promise<DeviceManufacturer[]> {
  const response = await fetch(`${API_BASE}/api/devices/manufacturers`);
  if (!response.ok) {
    throw new Error("Failed to fetch manufacturers");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchDeviceLocations(): Promise<DeviceLocation[]> {
  const response = await fetch(`${API_BASE}/api/devices/locations`);
  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchDeviceGroups(): Promise<DeviceGroup[]> {
  const response = await fetch(`${API_BASE}/api/devices/groups`);
  if (!response.ok) {
    throw new Error("Failed to fetch device groups");
  }
  const result = await response.json();
  return result.data || result;
}

async function fetchDeviceGroupTypes(): Promise<DeviceGroupTypeInfo[]> {
  const response = await fetch(`${API_BASE}/api/devices/group-types`);
  if (!response.ok) {
    throw new Error("Failed to fetch device group types");
  }
  const result = await response.json();
  return result.data || result;
}

// Hooks
export function useDevices(filters?: DeviceFilters) {
  return useQuery({
    queryKey: [DEVICES_KEY, filters],
    queryFn: () => fetchDevices(filters),
    staleTime: 30000, // 30 seconds
  });
}

export function useDevice(deviceId: number) {
  return useQuery({
    queryKey: [DEVICES_KEY, deviceId],
    queryFn: () => fetchDevice(deviceId),
    enabled: !!deviceId,
  });
}

export function useDeviceTypes() {
  return useQuery({
    queryKey: [DEVICE_TYPES_KEY],
    queryFn: fetchDeviceTypes,
    staleTime: 300000, // 5 minutes - lookup data changes rarely
  });
}

export function useDeviceManufacturers() {
  return useQuery({
    queryKey: [DEVICE_MANUFACTURERS_KEY],
    queryFn: fetchDeviceManufacturers,
    staleTime: 300000,
  });
}

export function useDeviceLocations() {
  return useQuery({
    queryKey: [DEVICE_LOCATIONS_KEY],
    queryFn: fetchDeviceLocations,
    staleTime: 300000,
  });
}

export function useDeviceGroups() {
  return useQuery({
    queryKey: [DEVICE_GROUPS_KEY],
    queryFn: fetchDeviceGroups,
    staleTime: 300000,
  });
}

export function useDeviceGroupTypes() {
  return useQuery({
    queryKey: [DEVICE_GROUP_TYPES_KEY],
    queryFn: fetchDeviceGroupTypes,
    staleTime: 300000, // 5 minutes - lookup data changes rarely
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, device }: { deviceId: number; device: DeviceUpdate }) =>
      updateDevice(deviceId, device),
    onSuccess: (_, { deviceId }) => {
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY, deviceId] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] });
    },
  });
}

export function useActivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateDevice,
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY, deviceId] });
    },
  });
}

export function useDeactivateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateDevice,
    onSuccess: (_, deviceId) => {
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY] });
      queryClient.invalidateQueries({ queryKey: [DEVICES_KEY, deviceId] });
    },
  });
}
