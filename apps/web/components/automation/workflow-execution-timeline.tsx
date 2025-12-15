"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  XCircle,
  Pause,
  Play,
  Zap,
  BarChart,
  User,
} from "lucide-react";
import { StepApprovalInterface } from "./step-approval-interface";

interface Step {
  step_id: string;
  step_name: string;
  step_order: number;
  deployment_mode: string;
  impact_level?: string;
  status: "pending" | "waiting_approval" | "running" | "completed" | "failed" | "rejected" | "timeout";

  // Timing
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;

  // Approval data
  requires_approval?: boolean;
  approved_by?: string;
  rejected_by?: string;

  // Preview data (for approval)
  preview_data?: any;
  impact_analysis?: any;

  // Results
  output_data?: any;
  error_message?: string;
}

interface WorkflowExecutionTimelineProps {
  execution: {
    execution_id: string;
    workflow_id: string;
    workflow_name?: string;
    status: string;
    total_steps: number;
    completed_steps: number;
    step_results: Step[];
    started_at?: string;
  };
  isLoading?: boolean;
  onApproveStep: (stepId: string, data?: any) => void;
  onRejectStep: (stepId: string, reason: string) => void;
}

export function WorkflowExecutionTimeline({
  execution,
  isLoading,
  onApproveStep,
  onRejectStep,
}: WorkflowExecutionTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progressPercentage = execution?.total_steps
    ? (execution.completed_steps / execution.total_steps) * 100
    : 0;

  const getStepIcon = (step: Step) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "running":
        return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
      case "waiting_approval":
        return <Pause className="h-6 w-6 text-yellow-600 animate-pulse" />;
      case "failed":
        return <XCircle className="h-6 w-6 text-red-600" />;
      case "rejected":
        return <XCircle className="h-6 w-6 text-orange-600" />;
      case "timeout":
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case "pending":
        return <Clock className="h-6 w-6 text-gray-400" />;
      default:
        return <Clock className="h-6 w-6 text-gray-400" />;
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "always_auto":
        return <Zap className="h-4 w-4 text-blue-600" />;
      case "auto_monitored":
        return <BarChart className="h-4 w-4 text-purple-600" />;
      case "validation_required":
        return <User className="h-4 w-4 text-yellow-600" />;
      case "always_manual":
        return <User className="h-4 w-4 text-orange-600" />;
      default:
        return <Play className="h-4 w-4 text-gray-600" />;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "always_auto":
        return <Badge variant="default" className="text-xs">🤖 Auto</Badge>;
      case "auto_monitored":
        return <Badge variant="outline" className="text-xs">📊 Monitored</Badge>;
      case "validation_required":
        return <Badge variant="warning" className="text-xs">👤 Validation</Badge>;
      case "always_manual":
        return <Badge variant="warning" className="text-xs">✋ Manual</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{mode}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "running":
        return <Badge variant="default">Running</Badge>;
      case "waiting_approval":
        return <Badge variant="warning" className="animate-pulse">Waiting Approval</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "timeout":
        return <Badge variant="warning">Timeout</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Execution Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">
                {execution?.workflow_name || "Workflow Execution"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Execution ID: {execution?.execution_id?.slice(0, 16)}...
              </p>
            </div>
            {getStatusBadge(execution?.status)}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {execution?.completed_steps || 0} / {execution?.total_steps || 0} steps
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Execution Info */}
          {execution?.started_at && (
            <div className="mt-4 text-sm text-muted-foreground">
              Started: {new Date(execution.started_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Timeline */}
      <div className="relative">
        {/* Vertical Timeline Line */}
        <div
          className="absolute left-8 top-0 w-0.5 bg-gray-300 dark:bg-gray-700"
          style={{ height: `${execution?.step_results?.length * 200}px` }}
        />

        {/* Steps */}
        <div className="space-y-6">
          {execution?.step_results?.map((step: Step, index: number) => (
            <div key={step.step_id} className="relative pl-20">
              {/* Step Icon (on timeline) */}
              <div className="absolute left-5 -ml-3 flex items-center justify-center bg-white dark:bg-gray-900 p-1 rounded-full border-2 border-gray-300 dark:border-gray-700">
                {getStepIcon(step)}
              </div>

              {/* Step Card */}
              <Card
                className={`transition-all ${
                  step.status === "waiting_approval"
                    ? "border-yellow-500 dark:border-yellow-600 border-2 shadow-lg scale-[1.02]"
                    : step.status === "running"
                    ? "border-blue-500 dark:border-blue-600 border-2"
                    : ""
                }`}
              >
                <CardContent className="pt-6">
                  {/* Step Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          STEP {step.step_order}
                        </span>
                        {getModeIcon(step.deployment_mode)}
                        {getModeBadge(step.deployment_mode)}
                      </div>
                      <h3 className="text-lg font-semibold mb-1">
                        {step.step_name}
                      </h3>
                      {step.impact_level && (
                        <p className="text-xs text-muted-foreground">
                          Impact: {step.impact_level}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(step.status)}
                  </div>

                  {/* Step Content by Status */}

                  {/* Completed */}
                  {step.status === "completed" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Completed successfully</span>
                      </div>
                      {step.duration_ms && (
                        <p className="text-sm text-muted-foreground">
                          Duration: {step.duration_ms}ms
                        </p>
                      )}
                      {step.approved_by && (
                        <p className="text-xs text-muted-foreground">
                          Approved by: {step.approved_by}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Running */}
                  {step.status === "running" && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Executing...</span>
                    </div>
                  )}

                  {/* Waiting for Approval - MAIN APPROVAL INTERFACE */}
                  {step.status === "waiting_approval" && (
                    <StepApprovalInterface
                      step={step}
                      onApprove={(data) => onApproveStep(step.step_id, data)}
                      onReject={(reason) => onRejectStep(step.step_id, reason)}
                    />
                  )}

                  {/* Failed */}
                  {step.status === "failed" && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-400">
                            Step Failed
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                            {step.error_message}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rejected */}
                  {step.status === "rejected" && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-orange-700 dark:text-orange-400">
                            Step Rejected
                          </p>
                          <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                            Rejected by: {step.rejected_by}
                          </p>
                          {step.error_message && (
                            <p className="text-sm text-orange-600 dark:text-orange-300">
                              Reason: {step.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeout */}
                  {step.status === "timeout" && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-700 dark:text-yellow-400">
                            Approval Timeout
                          </p>
                          <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
                            {step.error_message || "No approval received within timeout period"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending */}
                  {step.status === "pending" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Waiting for previous steps to complete...</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
