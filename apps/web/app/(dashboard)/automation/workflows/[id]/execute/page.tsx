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

  // For demo, we'll use a mock execution ID
  // In real app, this would be from URL params or query string
  const executionId = `${workflowId}-exec-${Date.now()}`;

  // Poll Temporal workflow for real-time updates
  const { data: execution, isLoading } = useQuery({
    queryKey: ["workflow-execution", executionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/workflows/executions/${executionId}`
      );
      if (!response.ok) {
        // Return mock data for demo
        return {
          execution_id: executionId,
          workflow_id: workflowId,
          workflow_name: "Customer Onboarding",
          status: "running",
          total_steps: 5,
          completed_steps: 2,
          started_at: new Date().toISOString(),
          step_results: [
            {
              step_id: "step-1",
              step_name: "Validate Email",
              step_order: 1,
              deployment_mode: "always_auto",
              impact_level: "accessory",
              status: "completed",
              duration_ms: 234,
              started_at: new Date(Date.now() - 60000).toISOString(),
              completed_at: new Date(Date.now() - 59766).toISOString(),
            },
            {
              step_id: "step-2",
              step_name: "Check Duplicates",
              step_order: 2,
              deployment_mode: "auto_monitored",
              impact_level: "read",
              status: "completed",
              duration_ms: 1200,
              started_at: new Date(Date.now() - 59000).toISOString(),
              completed_at: new Date(Date.now() - 57800).toISOString(),
            },
            {
              step_id: "step-3",
              step_name: "Create CRM Record",
              step_order: 3,
              deployment_mode: "validation_required",
              impact_level: "write",
              status: "waiting_approval",
              started_at: new Date().toISOString(),
              preview_data: {
                operation: "CREATE",
                target: "salesforce.contacts",
                environment: "PRODUCTION",
                record_data: {
                  name: "John Doe",
                  email: "john@example.com",
                  company: "Acme Corp",
                  tier: "premium",
                  credit_limit: 5000,
                },
              },
              impact_analysis: {
                impact_level: "write",
                risk_level: "medium",
                environment: "PRODUCTION",
                warnings: [
                  "⚠️ This will execute in PRODUCTION environment",
                  "This will create a new customer record",
                  "💳 Setting credit limit to $5,000",
                ],
                required_checks: [
                  "I have reviewed the customer data",
                  "I confirm this is for PRODUCTION",
                  "I have approval for credit limit over $1,000",
                ],
              },
            },
            {
              step_id: "step-4",
              step_name: "Setup Billing Account",
              step_order: 4,
              deployment_mode: "always_manual",
              impact_level: "critical",
              status: "pending",
            },
            {
              step_id: "step-5",
              step_name: "Send Welcome Email",
              step_order: 5,
              deployment_mode: "always_auto",
              impact_level: "accessory",
              status: "pending",
            },
          ],
        };
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
