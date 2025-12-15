"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Rocket, DollarSign, Cpu, HardDrive, AlertCircle, CheckCircle, Info, Search } from "lucide-react";
import Link from "next/link";
import { aiComputeAPI } from "@/lib/ai-compute-api";
import type { Framework, InstanceTypeInfo } from "@/types/ai-compute";
import { toast } from "sonner";
import { ModelBrowser } from "@/components/ai-compute/model-browser";

const FRAMEWORKS: { value: Framework; label: string; description: string }[] = [
  {
    value: "ollama",
    label: "Ollama",
    description: "Easy setup, great for testing",
  },
  {
    value: "vllm",
    label: "vLLM",
    description: "High throughput, OpenAI-compatible",
  },
  {
    value: "tgi",
    label: "Text Generation Inference",
    description: "HuggingFace models",
  },
  {
    value: "llama-cpp",
    label: "llama.cpp",
    description: "CPU/low-VRAM, GGUF models",
  },
  { value: "custom", label: "Custom", description: "Manual setup" },
];

const POPULAR_INSTANCE_TYPES = [
  "g5.xlarge",
  "g5.2xlarge",
  "g4dn.xlarge",
  "g6.xlarge",
];

export default function LaunchInstancePage() {
  const router = useRouter();
  const [modelBrowserOpen, setModelBrowserOpen] = useState(false);

  const [formData, setFormData] = useState({
    instance_type: "g5.xlarge",
    framework: "ollama" as Framework,
    model: "",
    name: "",
    volume_size_gb: 100,
    max_price: undefined as number | undefined,
  });

  // Fetch pricing to show cost estimates
  const { data: pricing } = useQuery({
    queryKey: ["ai-pricing"],
    queryFn: () => aiComputeAPI.getPricing(),
  });

  // Fetch spot capacity and quotas
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ["spot-capacity"],
    queryFn: () => aiComputeAPI.getSpotCapacity(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Launch mutation
  const launchMutation = useMutation({
    mutationFn: aiComputeAPI.launchInstance,
    onSuccess: (data) => {
      toast.success("Instance launched successfully!", {
        description: `${data.name} is starting up...`,
      });
      router.push(`/ai-compute/instances/${data.instance_id}`);
    },
    onError: (error: Error) => {
      toast.error("Failed to launch instance", {
        description: error.message,
      });
    },
  });

  const selectedInstanceType = pricing?.instance_types.find(
    (it) => it.instance_type === formData.instance_type
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please enter an instance name");
      return;
    }

    launchMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ai-compute">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Launch GPU Instance</h1>
          <p className="text-muted-foreground">
            Configure and launch a new spot instance
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instance Type */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Instance Type</CardTitle>
                  {quotaData && (
                    <div className="text-sm text-muted-foreground">
                      vCPU Quota: {quotaData.vcpu_used} / {quotaData.vcpu_limit || "?"} used
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quota Status Banner */}
                {quotaData && quotaData.vcpu_available !== null && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      quotaData.vcpu_available < 20
                        ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200"
                        : "bg-green-50 dark:bg-green-950/20 border-green-200"
                    }`}
                  >
                    {quotaData.vcpu_available < 20 ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    <div className="text-sm">
                      <span className="font-medium">
                        {quotaData.vcpu_available} vCPUs available
                      </span>
                      {quotaData.vcpu_available < 20 && (
                        <span className="text-muted-foreground ml-2">
                          - Limited capacity for large instances
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {POPULAR_INSTANCE_TYPES.map((type) => {
                    const info = pricing?.instance_types.find(
                      (it) => it.instance_type === type
                    );
                    const quota = quotaData?.instance_limits?.[type];
                    const canLaunch = !quota || quota.sufficient_quota;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, instance_type: type })
                        }
                        disabled={!canLaunch}
                        className={`p-4 rounded-lg border-2 text-left transition-colors relative ${
                          formData.instance_type === type
                            ? "border-primary bg-primary/5"
                            : !canLaunch
                            ? "border-border opacity-50 cursor-not-allowed"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{type}</div>
                          {quota && (
                            <Badge
                              variant={canLaunch ? "success" : "destructive"}
                              className="text-xs"
                            >
                              {quota.max_instances !== null
                                ? `Max: ${quota.max_instances}`
                                : "OK"}
                            </Badge>
                          )}
                        </div>
                        {info && (
                          <>
                            <div className="text-sm text-muted-foreground mt-1">
                              {info.gpu_count}x {info.gpu_model} (
                              {info.gpu_memory_gb}GB)
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="text-sm font-medium text-green-600">
                                ~${info.spot_price_estimate.toFixed(2)}/hr
                              </div>
                              {quota && (
                                <div className="text-xs text-muted-foreground">
                                  {quota.vcpus} vCPUs
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {!canLaunch && (
                          <div className="text-xs text-destructive mt-1">
                            Insufficient quota
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <Label htmlFor="instance_type">Or select another type</Label>
                  <Select
                    value={formData.instance_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, instance_type: value })
                    }
                  >
                    <SelectTrigger className="h-auto py-3">
                      <SelectValue>
                        {selectedInstanceType && (
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-medium">{selectedInstanceType.instance_type}</span>
                            <span className="text-xs text-muted-foreground">
                              {selectedInstanceType.gpu_count}x {selectedInstanceType.gpu_model} • {selectedInstanceType.vcpus} vCPUs • {selectedInstanceType.memory_gb}GB RAM
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {pricing?.instance_types.map((it) => (
                        <SelectItem
                          key={it.instance_type}
                          value={it.instance_type}
                          className="py-3"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="font-semibold">{it.instance_type}</span>
                              <span className="text-sm font-medium text-green-600">
                                ~${it.spot_price_estimate.toFixed(2)}/hr
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <span>🎮 {it.gpu_count}x {it.gpu_model} ({it.gpu_memory_gb}GB VRAM)</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span>💻 {it.vcpus} vCPUs</span>
                                <span>•</span>
                                <span>🧠 {it.memory_gb}GB RAM</span>
                                <span>•</span>
                                <span>💾 {it.storage_gb}GB Storage</span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Framework & Model */}
            <Card>
              <CardHeader>
                <CardTitle>Framework & Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="framework">Framework</Label>
                  <Select
                    value={formData.framework}
                    onValueChange={(value: Framework) =>
                      setFormData({ ...formData, framework: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRAMEWORKS.map((fw) => (
                        <SelectItem key={fw.value} value={fw.value}>
                          <div>
                            <div className="font-medium">{fw.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {fw.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="model">
                    Model (optional)
                    <span className="text-sm text-muted-foreground ml-2">
                      e.g., llama3.2:3b, meta-llama/Llama-3.2-3B
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="llama3.2:3b or browse models..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModelBrowserOpen(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  {formData.model && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {formData.model}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Instance Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="my-llm-test"
                  />
                </div>

                <div>
                  <Label htmlFor="volume_size">
                    Volume Size (GB)
                    <span className="text-sm text-muted-foreground ml-2">
                      Storage for models and data
                    </span>
                  </Label>
                  <Input
                    id="volume_size"
                    type="number"
                    min="50"
                    max="1000"
                    value={formData.volume_size_gb}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        volume_size_gb: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="max_price">
                    Max Spot Price (optional)
                    <span className="text-sm text-muted-foreground ml-2">
                      Leave empty for default
                    </span>
                  </Label>
                  <Input
                    id="max_price"
                    type="number"
                    step="0.01"
                    value={formData.max_price || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_price: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Auto"
                  />
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              size="lg"
              disabled={launchMutation.isPending}
              className="w-full"
            >
              {launchMutation.isPending ? (
                "Launching..."
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Launch Instance
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Cost Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedInstanceType && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      On-Demand Price
                    </span>
                    <span className="font-medium line-through text-muted-foreground">
                      ${selectedInstanceType.on_demand_price.toFixed(3)}/hr
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Spot Price (est.)
                    </span>
                    <span className="font-bold text-green-600 text-lg">
                      ${selectedInstanceType.spot_price_estimate.toFixed(3)}/hr
                    </span>
                  </div>
                  {selectedInstanceType.current_spot_price && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Current Spot
                      </span>
                      <span className="font-medium">
                        ${selectedInstanceType.current_spot_price.toFixed(3)}/hr
                      </span>
                    </div>
                  )}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Savings</span>
                      <Badge variant="success">
                        ~
                        {Math.round(
                          ((selectedInstanceType.on_demand_price -
                            selectedInstanceType.spot_price_estimate) /
                            selectedInstanceType.on_demand_price) *
                            100
                        )}
                        %
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <div className="text-sm font-medium">Estimated Cost</div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>1 hour:</span>
                        <span>
                          $
                          {selectedInstanceType.spot_price_estimate.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>8 hours:</span>
                        <span>
                          $
                          {(
                            selectedInstanceType.spot_price_estimate * 8
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>24 hours:</span>
                        <span>
                          $
                          {(
                            selectedInstanceType.spot_price_estimate * 24
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedInstanceType && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GPU</span>
                    <span className="font-medium">
                      {selectedInstanceType.gpu_count}x{" "}
                      {selectedInstanceType.gpu_model}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GPU Memory</span>
                    <span className="font-medium">
                      {selectedInstanceType.gpu_memory_gb}GB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">vCPUs</span>
                    <span className="font-medium">
                      {selectedInstanceType.vcpus}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-medium">
                      {selectedInstanceType.memory_gb}GB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-medium">
                      {formData.volume_size_gb}GB
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Model Browser Dialog */}
      <ModelBrowser
        open={modelBrowserOpen}
        onOpenChange={setModelBrowserOpen}
        framework={formData.framework}
        onSelectModel={(model) => setFormData({ ...formData, model })}
      />
    </div>
  );
}
