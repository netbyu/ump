import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type {
  Workflow,
  WorkflowExecution,
  PaginatedResponse,
  ApiResponse,
} from "@/types";

const WORKFLOWS_KEY = "workflows";
const EXECUTIONS_KEY = "workflow-executions";

export function useWorkflows(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [WORKFLOWS_KEY, { page, pageSize }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<Workflow>>(
        `/api/workflows?page=${page}&pageSize=${pageSize}`
      ),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: [WORKFLOWS_KEY, id],
    queryFn: () => apiClient.get<ApiResponse<Workflow>>(`/api/workflows/${id}`),
    enabled: !!id,
  });
}

export function useWorkflowExecutions(workflowId: string, page = 1, pageSize = 10) {
  return useQuery({
    queryKey: [EXECUTIONS_KEY, workflowId, { page, pageSize }],
    queryFn: () =>
      apiClient.get<PaginatedResponse<WorkflowExecution>>(
        `/api/workflows/${workflowId}/executions?page=${page}&pageSize=${pageSize}`
      ),
    enabled: !!workflowId,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Workflow>) =>
      apiClient.post<ApiResponse<Workflow>>("/api/workflows", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
    },
  });
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workflow> }) =>
      apiClient.put<ApiResponse<Workflow>>(`/api/workflows/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY] });
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY, id] });
    },
  });
}

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiResponse<WorkflowExecution>>(`/api/workflows/${id}/trigger`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [EXECUTIONS_KEY, id] });
    },
  });
}

export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiResponse<Workflow>>(`/api/workflows/${id}/pause`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY, id] });
    },
  });
}

export function useResumeWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<ApiResponse<Workflow>>(`/api/workflows/${id}/resume`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [WORKFLOWS_KEY, id] });
    },
  });
}
