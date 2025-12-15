import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { PhoneSystem, PaginatedResponse, ApiResponse } from "@/types";

const QUERY_KEY = "phone-systems";

export function usePhoneSystems(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [QUERY_KEY, { page, pageSize }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<PhoneSystem>>(
        `/api/phone-systems?page=${page}&pageSize=${pageSize}`
      ),
  });
}

export function usePhoneSystem(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => apiClient.get<ApiResponse<PhoneSystem>>(`/api/phone-systems/${id}`),
    enabled: !!id,
  });
}

export function useCreatePhoneSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<PhoneSystem>) =>
      apiClient.post<ApiResponse<PhoneSystem>>("/api/phone-systems", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdatePhoneSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PhoneSystem> }) =>
      apiClient.put<ApiResponse<PhoneSystem>>(`/api/phone-systems/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}

export function useDeletePhoneSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<ApiResponse<void>>(`/api/phone-systems/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useSyncPhoneSystem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiResponse<PhoneSystem>>(`/api/phone-systems/${id}/sync`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });
}
