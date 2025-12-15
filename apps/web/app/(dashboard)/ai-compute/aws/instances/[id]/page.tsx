"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Trash2,
  Terminal,
  Network,
  HardDrive,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { aiComputeAPI } from "@/lib/ai-compute-api";
import type { InstanceStatus } from "@/types/ai-compute";
import { toast } from "sonner";

const statusColors: Record<
  InstanceStatus,
  "success" | "warning" | "destructive" | "default"
> = {
  running: "success",
  pending: "warning",
  stopping: "warning",
  stopped: "default",
  terminated: "destructive",
  unknown: "default",
};

export default function InstanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const instanceId = params.id as string;

  // Fetch instance details
  const { data: instance, isLoading, error } = useQuery({
    queryKey: ["ai-instance", instanceId],
    queryFn: () => aiComputeAPI.getInstance(instanceId),
    refetchInterval: 30000,
  });

  // Terminate mutation
  const terminateMutation = useMutation({
    mutationFn: aiComputeAPI.terminateInstance,
    onSuccess: () => {
      toast.success("Instance terminated successfully");
      queryClient.invalidateQueries({ queryKey: ["ai-instances"] });
      router.push("/ai-compute/instances");
    },
    onError: (error: Error) => {
      toast.error("Failed to terminate instance", {
        description: error.message,
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading instance details...</div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load instance</p>
          <Link href="/ai-compute/instances">
            <Button>Back to Instances</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ai-compute/instances">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{instance.name}</h1>
              <Badge variant={statusColors[instance.status]}>
                {instance.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{instance.instance_id}</p>
          </div>
        </div>
        {instance.status !== "terminated" && (
          <Button
            variant="destructive"
            onClick={() => terminateMutation.mutate(instanceId)}
            disabled={terminateMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Terminate
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connection Info */}
          {instance.status === "running" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Connection Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {instance.ssh_command && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">SSH Command</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(instance.ssh_command!, "SSH command")
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <code className="block p-3 bg-muted rounded-md text-sm font-mono">
                      {instance.ssh_command}
                    </code>
                  </div>
                )}

                {instance.ollama_endpoint && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        Ollama API Endpoint
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              instance.ollama_endpoint!,
                              "Ollama endpoint"
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={instance.ollama_endpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <code className="block p-3 bg-muted rounded-md text-sm">
                      {instance.ollama_endpoint}
                    </code>
                  </div>
                )}

                {instance.vllm_endpoint && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        vLLM API Endpoint
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              instance.vllm_endpoint!,
                              "vLLM endpoint"
                            )
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={instance.vllm_endpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <code className="block p-3 bg-muted rounded-md text-sm">
                      {instance.vllm_endpoint}
                    </code>
                  </div>
                )}

                {instance.tgi_endpoint && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        TGI API Endpoint
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(instance.tgi_endpoint!, "TGI endpoint")
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a
                            href={instance.tgi_endpoint}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    <code className="block p-3 bg-muted rounded-md text-sm">
                      {instance.tgi_endpoint}
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Instance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailRow label="Instance Type" value={instance.instance_type} />
              <DetailRow label="Framework" value={instance.framework} />
              {instance.model && <DetailRow label="Model" value={instance.model} />}
              <DetailRow label="Region" value={instance.region} />
              {instance.gpu && (
                <DetailRow
                  label="GPU"
                  value={`${instance.gpu} (${instance.gpu_memory})`}
                />
              )}
              {instance.public_ip && (
                <DetailRow label="Public IP" value={instance.public_ip} />
              )}
              {instance.private_ip && (
                <DetailRow label="Private IP" value={instance.private_ip} />
              )}
              <DetailRow
                label="Launched At"
                value={new Date(instance.launched_at).toLocaleString()}
              />
              {instance.terminated_at && (
                <DetailRow
                  label="Terminated At"
                  value={new Date(instance.terminated_at).toLocaleString()}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cost Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">
                  {instance.uptime_hours?.toFixed(2) || "0.00"}h
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-2xl font-bold text-green-600">
                  ${instance.estimated_cost?.toFixed(2) || "0.00"}
                </p>
              </div>
              {instance.spot_price && (
                <div className="pt-3 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spot Price</span>
                    <span className="font-medium">
                      ${instance.spot_price.toFixed(3)}/hr
                    </span>
                  </div>
                  {instance.max_price && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Max Price</span>
                      <span className="font-medium">
                        ${instance.max_price.toFixed(3)}/hr
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {instance.status === "running" && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a
                    href={`https://console.aws.amazon.com/ec2/v2/home?region=${instance.region}#Instances:instanceId=${instance.instance_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View in AWS Console
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
