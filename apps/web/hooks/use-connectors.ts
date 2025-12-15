/**
 * React Query hooks for Connectors Service API
 *
 * Terminology:
 * - Provider: Template/definition of an external service (621+ available)
 * - Connector: A configured instance of a provider with credentials
 *
 * Note: DeviceIntegration (linking devices to connectors) is managed in use-devices.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Provider,
  ProviderDetail,
  ProviderFilters,
  Connector,
  ConnectorCreate,
  ConnectorUpdate,
  ConnectorFilters,
  ConnectorList,
  TestConnectionResponse,
} from "@/types";

const CONNECTORS_API =
  process.env.NEXT_PUBLIC_CONNECTORS_API_URL || "http://localhost:8003";

// Query keys
const PROVIDERS_KEY = "providers";
const CONNECTORS_KEY = "connectors";

// =============================================================================
// Provider API Functions
// =============================================================================

async function fetchProviders(filters?: ProviderFilters): Promise<Provider[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append("category", filters.category);
  if (filters?.search) params.append("search", filters.search);

  const url = `${CONNECTORS_API}/api/providers${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch providers");
  return response.json();
}

async function fetchProviderCategories(): Promise<string[]> {
  const response = await fetch(`${CONNECTORS_API}/api/providers/categories`);
  if (!response.ok) throw new Error("Failed to fetch categories");
  return response.json();
}

async function fetchProvider(providerId: string): Promise<ProviderDetail> {
  const response = await fetch(`${CONNECTORS_API}/api/providers/${providerId}`);
  if (!response.ok) throw new Error(`Failed to fetch provider: ${providerId}`);
  return response.json();
}

async function testProviderCredentials(
  providerId: string,
  credentials: Record<string, unknown>
): Promise<TestConnectionResponse> {
  const response = await fetch(
    `${CONNECTORS_API}/api/providers/${providerId}/test`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credentials }),
    }
  );
  if (!response.ok) throw new Error("Failed to test credentials");
  return response.json();
}

// =============================================================================
// Connector API Functions
// =============================================================================

async function fetchConnectors(
  filters?: ConnectorFilters
): Promise<ConnectorList> {
  const params = new URLSearchParams();
  if (filters?.provider_id) params.append("provider_id", filters.provider_id);
  if (filters?.is_active !== undefined)
    params.append("is_active", filters.is_active.toString());
  if (filters?.search) params.append("search", filters.search);

  const url = `${CONNECTORS_API}/api/connectors${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch connectors");
  return response.json();
}

async function fetchConnector(connectorId: string): Promise<Connector> {
  const response = await fetch(
    `${CONNECTORS_API}/api/connectors/${connectorId}`
  );
  if (!response.ok)
    throw new Error(`Failed to fetch connector: ${connectorId}`);
  return response.json();
}

async function createConnector(connector: ConnectorCreate): Promise<Connector> {
  const response = await fetch(`${CONNECTORS_API}/api/connectors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(connector),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to create connector");
  }
  return response.json();
}

async function updateConnector(
  connectorId: string,
  connector: ConnectorUpdate
): Promise<Connector> {
  const response = await fetch(
    `${CONNECTORS_API}/api/connectors/${connectorId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(connector),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to update connector");
  }
  return response.json();
}

async function deleteConnector(connectorId: string): Promise<void> {
  const response = await fetch(
    `${CONNECTORS_API}/api/connectors/${connectorId}`,
    {
      method: "DELETE",
    }
  );
  if (!response.ok) throw new Error("Failed to delete connector");
}

async function testConnector(
  connectorId: string
): Promise<TestConnectionResponse> {
  const response = await fetch(
    `${CONNECTORS_API}/api/connectors/${connectorId}/test`,
    {
      method: "POST",
    }
  );
  if (!response.ok) throw new Error("Failed to test connector");
  return response.json();
}

// =============================================================================
// Provider Hooks
// =============================================================================

export function useProviders(filters?: ProviderFilters) {
  return useQuery({
    queryKey: [PROVIDERS_KEY, filters],
    queryFn: () => fetchProviders(filters),
    staleTime: 300000, // 5 minutes (catalog doesn't change often)
  });
}

export function useProviderCategories() {
  return useQuery({
    queryKey: [PROVIDERS_KEY, "categories"],
    queryFn: fetchProviderCategories,
    staleTime: 600000, // 10 minutes
  });
}

export function useProvider(providerId: string) {
  return useQuery({
    queryKey: [PROVIDERS_KEY, providerId],
    queryFn: () => fetchProvider(providerId),
    enabled: !!providerId,
    staleTime: 300000,
  });
}

export function useTestProviderCredentials() {
  return useMutation({
    mutationFn: ({
      providerId,
      credentials,
    }: {
      providerId: string;
      credentials: Record<string, unknown>;
    }) => testProviderCredentials(providerId, credentials),
  });
}

// =============================================================================
// Connector Hooks
// =============================================================================

export function useConnectors(filters?: ConnectorFilters) {
  return useQuery({
    queryKey: [CONNECTORS_KEY, filters],
    queryFn: () => fetchConnectors(filters),
    staleTime: 30000, // 30 seconds
  });
}

export function useConnector(connectorId: string) {
  return useQuery({
    queryKey: [CONNECTORS_KEY, connectorId],
    queryFn: () => fetchConnector(connectorId),
    enabled: !!connectorId,
  });
}

export function useCreateConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConnector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONNECTORS_KEY] });
    },
  });
}

export function useUpdateConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      connectorId,
      connector,
    }: {
      connectorId: string;
      connector: ConnectorUpdate;
    }) => updateConnector(connectorId, connector),
    onSuccess: (_, { connectorId }) => {
      queryClient.invalidateQueries({ queryKey: [CONNECTORS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONNECTORS_KEY, connectorId] });
    },
  });
}

export function useDeleteConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConnector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONNECTORS_KEY] });
    },
  });
}

export function useTestConnector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: testConnector,
    onSuccess: (_, connectorId) => {
      queryClient.invalidateQueries({ queryKey: [CONNECTORS_KEY, connectorId] });
      queryClient.invalidateQueries({ queryKey: [CONNECTORS_KEY] });
    },
  });
}
