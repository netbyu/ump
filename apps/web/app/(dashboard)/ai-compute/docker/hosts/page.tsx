"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Server,
  Settings,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

interface DockerHost {
  id: string;
  name: string;
  description?: string;
  portainer_endpoint_id: number;
  host_url: string;
  status: "online" | "offline";

  // Default settings for this host
  default_framework: string;
  default_gpu_enabled: boolean;
  auto_create_connection: boolean;
  default_port_range_start: number;

  // Resource limits
  max_containers: number;
  cpu_limit?: number;
  memory_limit?: string;

  tags: string[];
  is_active: boolean;
  created_at: string;
}

export default function DockerHostsPage() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingHost, setEditingHost] = useState<DockerHost | null>(null);

  const [hostForm, setHostForm] = useState({
    name: "",
    description: "",
    portainer_endpoint_id: 0,
    host_url: "",
    default_framework: "ollama",
    default_gpu_enabled: true,
    auto_create_connection: true,
    default_port_range_start: 11434,
    max_containers: 10,
    tags: [] as string[],
  });

  // Fetch Portainer endpoints
  const { data: portainerEndpoints } = useQuery({
    queryKey: ["docker-endpoints"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/docker/endpoints`);
      if (!response.ok) throw new Error("Failed to fetch endpoints");
      return response.json();
    },
  });

  // Fetch configured Docker hosts (from localStorage for now)
  const {
    data: hosts,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["docker-hosts"],
    queryFn: async () => {
      const stored = localStorage.getItem("docker_hosts");
      if (stored) {
        return JSON.parse(stored) as DockerHost[];
      }
      return [];
    },
  });

  const saveHost = () => {
    const currentHosts = hosts || [];
    const newHost: DockerHost = {
      id: editingHost?.id || `host-${Date.now()}`,
      ...hostForm,
      status: "offline",
      is_active: true,
      created_at: editingHost?.created_at || new Date().toISOString(),
    };

    let updatedHosts;
    if (editingHost) {
      updatedHosts = currentHosts.map((h) => (h.id === editingHost.id ? newHost : h));
      toast.success("Docker host updated");
    } else {
      updatedHosts = [...currentHosts, newHost];
      toast.success("Docker host added");
    }

    localStorage.setItem("docker_hosts", JSON.stringify(updatedHosts));
    queryClient.invalidateQueries({ queryKey: ["docker-hosts"] });
    setAddDialogOpen(false);
    setEditingHost(null);
    resetForm();
  };

  const deleteHost = (hostId: string) => {
    const currentHosts = hosts || [];
    const updatedHosts = currentHosts.filter((h) => h.id !== hostId);
    localStorage.setItem("docker_hosts", JSON.stringify(updatedHosts));
    queryClient.invalidateQueries({ queryKey: ["docker-hosts"] });
    toast.success("Docker host removed");
  };

  const resetForm = () => {
    setHostForm({
      name: "",
      description: "",
      portainer_endpoint_id: 0,
      host_url: "",
      default_framework: "ollama",
      default_gpu_enabled: true,
      auto_create_connection: true,
      default_port_range_start: 11434,
      max_containers: 10,
      tags: [],
    });
  };

  const openEditDialog = (host: DockerHost) => {
    setEditingHost(host);
    setHostForm({
      name: host.name,
      description: host.description || "",
      portainer_endpoint_id: host.portainer_endpoint_id,
      host_url: host.host_url,
      default_framework: host.default_framework,
      default_gpu_enabled: host.default_gpu_enabled,
      auto_create_connection: host.auto_create_connection,
      default_port_range_start: host.default_port_range_start,
      max_containers: host.max_containers,
      tags: host.tags,
    });
    setAddDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ai-compute/docker">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Docker Hosts</h1>
            <p className="text-muted-foreground">
              Manage Docker hosts for LLM deployment
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setAddDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Add Docker Host
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{hosts?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Configured Hosts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">
              {hosts?.filter((h) => h.status === "online").length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">
              {portainerEndpoints?.length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Portainer Endpoints</p>
          </CardContent>
        </Card>
      </div>

      {/* Hosts List */}
      <Card>
        <CardHeader>
          <CardTitle>Docker Hosts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading hosts...</div>
          )}

          {hosts && hosts.length === 0 && (
            <div className="text-center py-8">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No Docker hosts configured</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Host
              </Button>
            </div>
          )}

          {hosts && hosts.length > 0 && (
            <div className="space-y-3">
              {hosts.map((host) => (
                <div
                  key={host.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Server className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{host.name}</p>
                        <Badge variant={host.status === "online" ? "success" : "default"}>
                          {host.status}
                        </Badge>
                        {host.is_active && (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {host.description || host.host_url}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span>Default: {host.default_framework}</span>
                        <span>•</span>
                        <span>GPU: {host.default_gpu_enabled ? "Enabled" : "Disabled"}</span>
                        <span>•</span>
                        <span>Max containers: {host.max_containers}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/ai-compute/docker/hosts/${host.id}`}>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(host)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteHost(host.id)}
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

      {/* Add/Edit Host Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingHost ? "Edit" : "Add"} Docker Host</DialogTitle>
            <DialogDescription>
              Configure a Docker host for LLM deployment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div>
              <Label htmlFor="name">Host Name *</Label>
              <Input
                id="name"
                value={hostForm.name}
                onChange={(e) => setHostForm({ ...hostForm, name: e.target.value })}
                placeholder="Production GPU Server"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={hostForm.description}
                onChange={(e) => setHostForm({ ...hostForm, description: e.target.value })}
                placeholder="4x NVIDIA A100 GPUs, 128GB RAM"
                rows={2}
              />
            </div>

            {/* Portainer Endpoint */}
            <div>
              <Label htmlFor="endpoint">Portainer Endpoint *</Label>
              <Select
                value={hostForm.portainer_endpoint_id.toString()}
                onValueChange={(value) =>
                  setHostForm({ ...hostForm, portainer_endpoint_id: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Portainer endpoint" />
                </SelectTrigger>
                <SelectContent>
                  {portainerEndpoints?.map((endpoint: any) => (
                    <SelectItem key={endpoint.id} value={endpoint.id.toString()}>
                      <div>
                        <div className="font-medium">{endpoint.name}</div>
                        <div className="text-xs text-muted-foreground">{endpoint.url}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="host_url">Host URL/IP</Label>
              <Input
                id="host_url"
                value={hostForm.host_url}
                onChange={(e) => setHostForm({ ...hostForm, host_url: e.target.value })}
                placeholder="192.168.1.100 or host.example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Public IP or hostname for accessing deployed containers
              </p>
            </div>

            {/* Default Settings */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Default Deployment Settings</h4>

              <div className="space-y-3">
                <div>
                  <Label>Default Framework</Label>
                  <Select
                    value={hostForm.default_framework}
                    onValueChange={(value) =>
                      setHostForm({ ...hostForm, default_framework: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="vllm">vLLM</SelectItem>
                      <SelectItem value="tgi">TGI</SelectItem>
                      <SelectItem value="llama-cpp">llama.cpp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>GPU Enabled by Default</Label>
                  <input
                    type="checkbox"
                    checked={hostForm.default_gpu_enabled}
                    onChange={(e) =>
                      setHostForm({ ...hostForm, default_gpu_enabled: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Auto-create LLM Connections</Label>
                  <input
                    type="checkbox"
                    checked={hostForm.auto_create_connection}
                    onChange={(e) =>
                      setHostForm({ ...hostForm, auto_create_connection: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div>
                  <Label>Default Port Range Start</Label>
                  <Input
                    type="number"
                    value={hostForm.default_port_range_start}
                    onChange={(e) =>
                      setHostForm({ ...hostForm, default_port_range_start: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Starting port for auto-assigned ports (e.g., 11434, 11435, ...)
                  </p>
                </div>

                <div>
                  <Label>Max Containers</Label>
                  <Input
                    type="number"
                    value={hostForm.max_containers}
                    onChange={(e) =>
                      setHostForm({ ...hostForm, max_containers: parseInt(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of LLM containers on this host
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddDialogOpen(false); setEditingHost(null); }}>
              Cancel
            </Button>
            <Button onClick={saveHost} disabled={!hostForm.name || !hostForm.portainer_endpoint_id}>
              {editingHost ? "Update" : "Add"} Host
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
