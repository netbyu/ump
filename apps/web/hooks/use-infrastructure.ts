import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { InfrastructureDevice, PaginatedResponse, ApiResponse } from "@/types";

const QUERY_KEY = "infrastructure";

export function useInfrastructureDevices(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [QUERY_KEY, { page, pageSize }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<InfrastructureDevice>>(
        `/api/infrastructure?page=${page}&pageSize=${pageSize}`
      ),
  });
}

export function useInfrastructureDevice(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () =>
      apiClient.get<ApiResponse<InfrastructureDevice>>(`/api/infrastructure/${id}`),
    enabled: !!id,
  });
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<InfrastructureDevice>) =>
      apiClient.post<ApiResponse<InfrastructureDevice>>("/api/infrastructure", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<InfrastructureDevice>;
    }) =>
      apiClient.put<ApiResponse<InfrastructureDevice>>(
        `/api/infrastructure/${id}`,
        data
      ),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiResponse<void>>(`/api/infrastructure/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function usePingDevice() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiResponse<{ latency: number; status: string }>>(
        `/api/infrastructure/${id}/ping`
      ),
  });
}
