"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Rocket,
  Container,
  Play,
  Square,
  Trash2,
  RefreshCw,
  FileText,
  Settings,
  Server,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

const FRAMEWORKS = [
  { value: "ollama", label: "Ollama", port: 11434, description: "Easy setup, Ollama models" },
  { value: "vllm", label: "vLLM", port: 8000, description: "High performance, OpenAI-compatible" },
  { value: "tgi", label: "Text Generation Inference", port: 8080, description: "HuggingFace models" },
  { value: "llama-cpp", label: "llama.cpp", port: 8080, description: "GGUF models, CPU/GPU" },
];

export default function DockerLLMPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"deploy" | "manage">("deploy");

  // Deploy form state
  const [deployForm, setDeployForm] = useState({
    endpoint_id: 0,
    host_id: "",
    name: "",
    framework: "ollama",
    model_name: "",
    gpu_enabled: true,
    port: 11434,
    hf_token: "",
    auto_create_connection: true,
    use_in_livekit: false,
    use_in_mcp: false,
  });

  // Fetch configured Docker hosts
  const { data: hosts, isLoading: hostsLoading } = useQuery({
    queryKey: ["docker-hosts"],
    queryFn: async () => {
      const stored = localStorage.getItem("docker_hosts");
      return stored ? JSON.parse(stored) : [];
    },
  });

  // Fetch Docker endpoints (for fallback)
  const { data: endpoints, isLoading: endpointsLoading } = useQuery({
    queryKey: ["docker-endpoints"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/docker/endpoints`);
      if (!response.ok) throw new Error("Failed to fetch endpoints");
      return response.json();
    },
  });

  // Fetch containers
  const {
    data: containersData,
    isLoading: containersLoading,
    refetch: refetchContainers,
  } = useQuery({
    queryKey: ["docker-containers"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/docker/containers`);
      if (!response.ok) throw new Error("Failed to fetch containers");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Deploy mutation
  const deployMutation = useMutation({
    mutationFn: async (data: typeof deployForm) => {
      const response = await fetch(`${API_BASE_URL}/docker/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to deploy container");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success("LLM container deployed successfully!", {
        description: `${data.name} is starting up...`,
      });
      queryClient.invalidateQueries({ queryKey: ["docker-containers"] });
      setActiveTab("manage");
    },
    onError: (error: Error) => {
      toast.error("Failed to deploy container", {
        description: error.message,
      });
    },
  });

  // Container action mutations
  const startMutation = useMutation({
    mutationFn: async ({ containerId, endpointId }: { containerId: string; endpointId: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/docker/containers/${containerId}/start?endpoint_id=${endpointId}`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to start container");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Container started");
      refetchContainers();
    },
  });

  const stopMutation = useMutation({
    mutationFn: async ({ containerId, endpointId }: { containerId: string; endpointId: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/docker/containers/${containerId}/stop?endpoint_id=${endpointId}`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to stop container");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Container stopped");
      refetchContainers();
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ containerId, endpointId }: { containerId: string; endpointId: number }) => {
      const response = await fetch(
        `${API_BASE_URL}/docker/containers/${containerId}?endpoint_id=${endpointId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to remove container");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Container removed");
      refetchContainers();
    },
  });

  const handleHostChange = (hostId: string) => {
    const host = hosts?.find((h: any) => h.id === hostId);
    if (host) {
      const fw = FRAMEWORKS.find((f) => f.value === host.default_framework);
      setDeployForm({
        ...deployForm,
        host_id: hostId,
        endpoint_id: host.portainer_endpoint_id,
        framework: host.default_framework,
        gpu_enabled: host.default_gpu_enabled,
        auto_create_connection: host.auto_create_connection,
        port: fw?.port || host.default_port_range_start || 11434,
      });
    }
  };

  const handleFrameworkChange = (framework: string) => {
    const fw = FRAMEWORKS.find((f) => f.value === framework);
    setDeployForm({
      ...deployForm,
      framework,
      port: fw?.port || 8000,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployForm.name) {
      toast.error("Please enter a container name");
      return;
    }
    if (!deployForm.endpoint_id) {
      toast.error("Please select a Docker host");
      return;
    }
    deployMutation.mutate(deployForm);
  };

  const statusColors: Record<string, "success" | "warning" | "destructive" | "default"> = {
    running: "success",
    created: "warning",
    restarting: "warning",
    exited: "default",
    paused: "warning",
    dead: "destructive",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ai-compute">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Docker LLM Deployment</h1>
            <p className="text-muted-foreground">
              Deploy LLMs to remote Docker hosts via Portainer
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/ai-compute/docker/hosts">
            <Button variant="outline">
              <Server className="mr-2 h-4 w-4" />
              Manage Hosts
            </Button>
          </Link>
          <Link href="/ai-compute/docker/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "deploy" ? "default" : "outline"}
          onClick={() => setActiveTab("deploy")}
        >
          <Rocket className="mr-2 h-4 w-4" />
          Deploy New
        </Button>
        <Button
          variant={activeTab === "manage" ? "default" : "outline"}
          onClick={() => setActiveTab("manage")}
        >
          <Container className="mr-2 h-4 w-4" />
          Manage Containers ({containersData?.total || 0})
        </Button>
      </div>

      {/* Deploy Tab */}
      {activeTab === "deploy" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Docker Host Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Docker Host</CardTitle>
                    <Link href="/ai-compute/docker/hosts">
                      <Button variant="ghost" size="sm">
                        Manage Hosts
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hostsLoading ? (
                    <div className="text-muted-foreground">Loading configured hosts...</div>
                  ) : hosts && hosts.length > 0 ? (
                    <div>
                      <Label htmlFor="host">Select Docker Host *</Label>
                      <Select
                        value={deployForm.host_id}
                        onValueChange={handleHostChange}
                      >
                        <SelectTrigger className="h-auto py-3">
                          <SelectValue placeholder="Select a Docker host" />
                        </SelectTrigger>
                        <SelectContent>
                          {hosts.map((host: any) => (
                            <SelectItem key={host.id} value={host.id} className="py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{host.name}</span>
                                  <Badge variant={host.status === "online" ? "success" : "default"} className="text-xs">
                                    {host.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {host.description || host.host_url}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Default: {host.default_framework} • GPU: {host.default_gpu_enabled ? "✓" : "✗"} • Max: {host.max_containers}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        Host defaults will be applied automatically
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 mb-3">
                        No Docker hosts configured. Add your first host to get started.
                      </p>
                      <Link href="/ai-compute/docker/hosts">
                        <Button size="sm">
                          <Server className="mr-2 h-4 w-4" />
                          Add Docker Host
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Framework Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Framework & Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="framework">Framework *</Label>
                    <Select
                      value={deployForm.framework}
                      onValueChange={handleFrameworkChange}
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
                    <Label htmlFor="model_name">
                      Model
                      {(deployForm.framework === "vllm" || deployForm.framework === "tgi") && " *"}
                    </Label>
                    <Input
                      id="model_name"
                      value={deployForm.model_name}
                      onChange={(e) =>
                        setDeployForm({ ...deployForm, model_name: e.target.value })
                      }
                      placeholder={
                        deployForm.framework === "ollama"
                          ? "llama3.2:3b (optional)"
                          : "meta-llama/Llama-3.1-8B-Instruct"
                      }
                      required={deployForm.framework === "vllm" || deployForm.framework === "tgi"}
                    />
                  </div>

                  <div>
                    <Label htmlFor="hf_token">HuggingFace Token (for gated models)</Label>
                    <Input
                      id="hf_token"
                      type="password"
                      value={deployForm.hf_token}
                      onChange={(e) =>
                        setDeployForm({ ...deployForm, hf_token: e.target.value })
                      }
                      placeholder="hf_..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Container Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Container Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Container Name *</Label>
                    <Input
                      id="name"
                      required
                      value={deployForm.name}
                      onChange={(e) =>
                        setDeployForm({ ...deployForm, name: e.target.value })
                      }
                      placeholder="my-llm-container"
                    />
                  </div>

                  <div>
                    <Label htmlFor="port">Host Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={deployForm.port}
                      onChange={(e) =>
                        setDeployForm({ ...deployForm, port: parseInt(e.target.value) })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Port on the Docker host to expose the service
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="gpu_enabled">Enable GPU</Label>
                      <p className="text-xs text-muted-foreground">
                        Requires NVIDIA Docker runtime
                      </p>
                    </div>
                    <Switch
                      id="gpu_enabled"
                      checked={deployForm.gpu_enabled}
                      onCheckedChange={(checked) =>
                        setDeployForm({ ...deployForm, gpu_enabled: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Integration Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Integration Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto_create">Auto-create LLM Connection</Label>
                    <Switch
                      id="auto_create"
                      checked={deployForm.auto_create_connection}
                      onCheckedChange={(checked) =>
                        setDeployForm({ ...deployForm, auto_create_connection: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="use_livekit">Use in LiveKit</Label>
                    <Switch
                      id="use_livekit"
                      checked={deployForm.use_in_livekit}
                      onCheckedChange={(checked) =>
                        setDeployForm({ ...deployForm, use_in_livekit: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="use_mcp">Use in MCP</Label>
                    <Switch
                      id="use_mcp"
                      checked={deployForm.use_in_mcp}
                      onCheckedChange={(checked) =>
                        setDeployForm({ ...deployForm, use_in_mcp: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                type="submit"
                size="lg"
                disabled={deployMutation.isPending}
                className="w-full"
              >
                {deployMutation.isPending ? (
                  "Deploying..."
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Deploy Container
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Info Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium mb-1">Framework</p>
                  <p className="text-muted-foreground">
                    {FRAMEWORKS.find((f) => f.value === deployForm.framework)?.label}
                  </p>
                </div>
                <div>
                  <p className="font-medium mb-1">Default Port</p>
                  <p className="text-muted-foreground">{deployForm.port}</p>
                </div>
                <div>
                  <p className="font-medium mb-1">GPU Support</p>
                  <Badge variant={deployForm.gpu_enabled ? "success" : "default"}>
                    {deployForm.gpu_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {deployForm.auto_create_connection && (
                  <div className="pt-3 border-t">
                    <p className="font-medium mb-1">Auto-create Connection</p>
                    <p className="text-xs text-muted-foreground">
                      An LLM connection will be created automatically after deployment
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Docker host with Portainer agent</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>NVIDIA Docker runtime (for GPU)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Sufficient disk space for models</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>•</span>
                  <span>Network access to container registry</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Manage Tab */}
      {activeTab === "manage" && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{containersData?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Containers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-green-600">
                  {containersData?.running_count || 0}
                </p>
                <p className="text-sm text-muted-foreground">Running</p>
              </CardContent>
            </Card>
            {containersData?.by_framework &&
              Object.entries(containersData.by_framework)
                .slice(0, 2)
                .map(([framework, count]) => (
                  <Card key={framework}>
                    <CardContent className="pt-6">
                      <p className="text-2xl font-bold">{count as number}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {framework}
                      </p>
                    </CardContent>
                  </Card>
                ))}
          </div>

          {/* Container List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Running Containers</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchContainers()}
                  disabled={containersLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${containersLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {containersLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  Loading containers...
                </div>
              )}

              {containersData && containersData.containers.length === 0 && (
                <div className="text-center py-8">
                  <Container className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No containers deployed yet
                  </p>
                  <Button onClick={() => setActiveTab("deploy")}>
                    Deploy Your First Container
                  </Button>
                </div>
              )}

              {containersData && containersData.containers.length > 0 && (
                <div className="space-y-3">
                  {containersData.containers.map((container: any) => (
                    <div
                      key={container.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Container className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-medium">{container.name}</p>
                            <Badge variant={statusColors[container.status] || "default"}>
                              {container.status}
                            </Badge>
                            <Badge variant="outline">{container.framework}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{container.endpoint_name}</span>
                            {container.model_name && (
                              <>
                                <span>•</span>
                                <span>{container.model_name}</span>
                              </>
                            )}
                            {container.base_url && (
                              <>
                                <span>•</span>
                                <span>{container.base_url}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {container.status === "running" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              stopMutation.mutate({
                                containerId: container.container_id,
                                endpointId: container.endpoint_id,
                              })
                            }
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              startMutation.mutate({
                                containerId: container.container_id,
                                endpointId: container.endpoint_id,
                              })
                            }
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            removeMutation.mutate({
                              containerId: container.container_id,
                              endpointId: container.endpoint_id,
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
