"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Settings,
  Save,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap,
  BarChart,
  User,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AUTOMATION_API_URL || "http://localhost:8001/api";

const IMPACT_LEVELS = [
  { value: "accessory", label: "Accessory", description: "Logs, notifications - Low risk", color: "text-gray-600" },
  { value: "read", label: "Read", description: "Queries, data fetching - Low risk", color: "text-blue-600" },
  { value: "write", label: "Write", description: "Updates, creates - Medium risk", color: "text-yellow-600" },
  { value: "critical", label: "Critical", description: "Deletions, payments - High risk", color: "text-red-600" },
  { value: "external", label: "External", description: "Third-party APIs - Variable risk", color: "text-purple-600" },
];

const DEPLOYMENT_MODES = [
  {
    value: "always_auto",
    label: "Always Automated",
    icon: <Zap className="h-4 w-4" />,
    description: "No approval needed, runs automatically",
    color: "text-blue-600",
  },
  {
    value: "auto_monitored",
    label: "Auto-Monitored",
    icon: <BarChart className="h-4 w-4" />,
    description: "Runs automatically with enhanced monitoring",
    color: "text-purple-600",
  },
  {
    value: "validation_required",
    label: "Validation Required",
    icon: <User className="h-4 w-4" />,
    description: "Human validation required before execution",
    color: "text-yellow-600",
  },
  {
    value: "always_manual",
    label: "Always Manual",
    icon: <User className="h-4 w-4" />,
    description: "Always requires manual approval",
    color: "text-orange-600",
  },
];

export default function ConfigureStepsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const workflowId = params.id as string;

  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<any>(null);

  const [stepConfig, setStepConfig] = useState({
    impact_level: "write",
    deployment_mode: "validation_required",
    min_success_rate: 95.0,
    min_successful_runs: 100,
    min_consecutive_success: 50,
    monitoring_days: 7,
  });

  // Fetch workflow steps
  const { data: steps, isLoading } = useQuery({
    queryKey: ["workflow-steps", workflowId],
    queryFn: async () => {
      // TODO: Replace with actual API call
      return [
        {
          step_id: "step-1",
          step_name: "Validate Email",
          step_order: 1,
          step_type: "validate_email",
          current_mode: "always_auto",
          impact_level: "accessory",
          metrics: { total_runs: 250, success_rate: 100 },
        },
        {
          step_id: "step-2",
          step_name: "Check Duplicates",
          step_order: 2,
          step_type: "check_duplicates",
          current_mode: "auto_monitored",
          impact_level: "read",
          metrics: { total_runs: 250, success_rate: 99.6 },
        },
        {
          step_id: "step-3",
          step_name: "Create CRM Record",
          step_order: 3,
          step_type: "create_crm_record",
          current_mode: "validation_required",
          impact_level: "write",
          metrics: { total_runs: 127, success_rate: 97.5 },
        },
        {
          step_id: "step-4",
          step_name: "Setup Billing Account",
          step_order: 4,
          step_type: "setup_billing_account",
          current_mode: "always_manual",
          impact_level: "critical",
          metrics: { total_runs: 23, success_rate: 100 },
        },
        {
          step_id: "step-5",
          step_name: "Send Welcome Email",
          step_order: 5,
          step_type: "send_email",
          current_mode: "always_auto",
          impact_level: "accessory",
          metrics: { total_runs: 245, success_rate: 99.2 },
        },
      ];
    },
  });

  const openConfigDialog = (step: any) => {
    setSelectedStep(step);
    setStepConfig({
      impact_level: step.impact_level,
      deployment_mode: step.current_mode,
      min_success_rate: 95.0,
      min_successful_runs: 100,
      min_consecutive_success: 50,
      monitoring_days: 7,
    });
    setConfigDialogOpen(true);
  };

  const saveStepConfig = () => {
    // TODO: API call to save configuration
    toast.success(`Step configuration saved for: ${selectedStep.step_name}`);
    setConfigDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["workflow-steps", workflowId] });
  };

  const getModeColor = (mode: string) => {
    const modeObj = DEPLOYMENT_MODES.find((m) => m.value === mode);
    return modeObj?.color || "text-gray-600";
  };

  const getPromotionStatus = (step: any) => {
    const metrics = step.metrics;

    if (step.current_mode === "always_auto") {
      return { ready: true, message: "Fully automated" };
    }

    const criteria = {
      success_rate: metrics.success_rate >= 95,
      total_runs: metrics.total_runs >= 100,
    };

    const allMet = Object.values(criteria).every((v) => v);

    return {
      ready: allMet,
      message: allMet ? "Ready for promotion" : "Continue monitoring",
      criteria,
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/automation/workflows/${workflowId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Configure Step Deployment</h1>
          <p className="text-muted-foreground">
            Set deployment modes and promotion criteria for each step
          </p>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps?.map((step: any) => {
          const promotionStatus = getPromotionStatus(step);

          return (
            <Card key={step.step_id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        STEP {step.step_order}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {step.impact_level}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{step.step_name}</CardTitle>
                    <CardDescription className="mt-1">
                      Type: {step.step_type}
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => openConfigDialog(step)}
                    variant="outline"
                    size="sm"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Current Mode */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Deployment Mode</p>
                    <div className="flex items-center gap-2">
                      {DEPLOYMENT_MODES.find((m) => m.value === step.current_mode)?.icon}
                      <span className={`font-medium ${getModeColor(step.current_mode)}`}>
                        {DEPLOYMENT_MODES.find((m) => m.value === step.current_mode)?.label}
                      </span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Performance</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Success Rate:</span>
                        <span className="font-medium">{step.metrics.success_rate}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Total Runs: {step.metrics.total_runs}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Promotion Status */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Promotion Status</p>
                    <div className="flex items-center gap-2">
                      {promotionStatus.ready ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600 font-medium">
                            {promotionStatus.message}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600 font-medium">
                            {promotionStatus.message}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configure: {selectedStep?.step_name}
            </DialogTitle>
            <DialogDescription>
              Set deployment mode and promotion criteria for this step
            </DialogDescription>
          </DialogHeader>

          {selectedStep && (
            <div className="space-y-6">
              {/* Impact Level */}
              <div>
                <Label>Step Impact Level</Label>
                <Select
                  value={stepConfig.impact_level}
                  onValueChange={(value) =>
                    setStepConfig({ ...stepConfig, impact_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMPACT_LEVELS.map((impact) => (
                      <SelectItem key={impact.value} value={impact.value}>
                        <div>
                          <div className={`font-medium ${impact.color}`}>
                            {impact.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {impact.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Deployment Mode */}
              <div>
                <Label>Deployment Mode</Label>
                <Select
                  value={stepConfig.deployment_mode}
                  onValueChange={(value) =>
                    setStepConfig({ ...stepConfig, deployment_mode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPLOYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div className="flex items-center gap-2">
                          {mode.icon}
                          <div>
                            <div className={`font-medium ${mode.color}`}>
                              {mode.label}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {mode.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Promotion Criteria */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Promotion Criteria</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Success Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={stepConfig.min_success_rate}
                      onChange={(e) =>
                        setStepConfig({
                          ...stepConfig,
                          min_success_rate: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Min Successful Runs</Label>
                    <Input
                      type="number"
                      min="0"
                      value={stepConfig.min_successful_runs}
                      onChange={(e) =>
                        setStepConfig({
                          ...stepConfig,
                          min_successful_runs: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Min Consecutive Success</Label>
                    <Input
                      type="number"
                      min="0"
                      value={stepConfig.min_consecutive_success}
                      onChange={(e) =>
                        setStepConfig({
                          ...stepConfig,
                          min_consecutive_success: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Monitoring Days</Label>
                    <Input
                      type="number"
                      min="1"
                      value={stepConfig.monitoring_days}
                      onChange={(e) =>
                        setStepConfig({
                          ...stepConfig,
                          monitoring_days: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 text-sm">
                  <p className="text-blue-900 dark:text-blue-100">
                    Step will be promoted to the next automation level when all criteria are met.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveStepConfig}>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
