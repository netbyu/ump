"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { WorkflowExecutionTimeline } from "@/components/automation/workflow-execution-timeline";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTOMATION_API_URL || "http://localhost:8001/api";

export default function WorkflowExecutePage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const workflowId = params.id as string;

  // Get execution ID from URL or generate one for new executions
  const executionId = `${workflowId}-exec-${Date.now()}`;

  // Poll Temporal workflow for real-time updates
  const { data: execution, isLoading } = useQuery({
    queryKey: ["workflow-execution", executionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/workflows/executions/${executionId}`
      );
      if (!response.ok) {
        // No execution data available
        return null;
      }
      return response.json();
    },
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });

  // Approve step mutation
  const approveMutation = useMutation({
    mutationFn: async ({ stepId, data }: { stepId: string; data?: any }) => {
      const response = await fetch(
        `${API_BASE_URL}/workflows/executions/${executionId}/steps/${stepId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edited_data: data }),
        }
      );
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast.success("Step approved - workflow continuing...");
      queryClient.invalidateQueries({ queryKey: ["workflow-execution", executionId] });
    },
    onError: (error) => {
      toast.error("Failed to approve step", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  // Reject step mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ stepId, reason }: { stepId: string; reason: string }) => {
      const response = await fetch(
        `${API_BASE_URL}/workflows/executions/${executionId}/steps/${stepId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      toast.error("Step rejected - workflow will fail");
      queryClient.invalidateQueries({ queryKey: ["workflow-execution", executionId] });
    },
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/automation/workflows/${workflowId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Workflow Execution</h1>
          <p className="text-sm text-muted-foreground">
            Real-time execution timeline with step approvals
          </p>
        </div>
      </div>

      {/* Timeline */}
      <WorkflowExecutionTimeline
        execution={execution}
        isLoading={isLoading}
        onApproveStep={(stepId, data) => approveMutation.mutate({ stepId, data })}
        onRejectStep={(stepId, reason) => rejectMutation.mutate({ stepId, reason })}
      />
    </div>
  );
}
