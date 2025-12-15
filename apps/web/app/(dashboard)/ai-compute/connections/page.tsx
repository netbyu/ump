"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Plus,
  Server,
  Cloud,
  Laptop,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Link as LinkIcon,
  Video,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

const CONNECTION_TYPES = [
  { value: "local", label: "Local", icon: Laptop, description: "Ollama, llama.cpp on local machine" },
  { value: "remote", label: "Remote", icon: Server, description: "Custom OpenAI-compatible endpoint" },
  { value: "aws_spot", label: "AWS Spot", icon: Cloud, description: "AWS Spot GPU instances" },
  { value: "openai", label: "OpenAI", icon: Cloud, description: "OpenAI API" },
  { value: "anthropic", label: "Anthropic", icon: Cloud, description: "Claude API" },
  { value: "google", label: "Google", icon: Cloud, description: "Gemini API" },
  { value: "groq", label: "Groq", icon: Cloud, description: "Groq API" },
  { value: "together", label: "Together AI", icon: Cloud, description: "Together AI API" },
];

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);

  const [newConnection, setNewConnection] = useState({
    name: "",
    connection_type: "local" as string,
    description: "",
    base_url: "",
    model_name: "",
    api_key: "",
    organization_id: "",
    timeout: 30,
    max_retries: 3,
    temperature: 0.7,
    max_tokens: 2048,
    tags: [] as string[],
    use_in_livekit: false,
    use_in_mcp: false,
    use_in_automation: false,
  });

  // Fetch connections
  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ["llm-connections"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/connections`);
      if (!response.ok) throw new Error("Failed to fetch connections");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Create connection mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newConnection) => {
      const response = await fetch(`${API_BASE_URL}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create connection");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Connection created successfully");
      queryClient.invalidateQueries({ queryKey: ["llm-connections"] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to create connection", { description: error.message });
    },
  });

  // Delete connection mutation
  const deleteMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`${API_BASE_URL}/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete connection");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Connection deleted");
      queryClient.invalidateQueries({ queryKey: ["llm-connections"] });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete connection", { description: error.message });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const response = await fetch(`${API_BASE_URL}/connections/${connectionId}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello, how are you?" }),
      });
      if (!response.ok) throw new Error("Failed to test connection");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Connection test successful", {
          description: `Latency: ${data.latency_ms.toFixed(0)}ms`,
        });
      } else {
        toast.error("Connection test failed", { description: data.error });
      }
      queryClient.invalidateQueries({ queryKey: ["llm-connections"] });
      setTestingConnectionId(null);
    },
    onError: (error: Error) => {
      toast.error("Connection test failed", { description: error.message });
      setTestingConnectionId(null);
    },
  });

  const resetForm = () => {
    setNewConnection({
      name: "",
      connection_type: "local",
      description: "",
      base_url: "",
      model_name: "",
      api_key: "",
      organization_id: "",
      timeout: 30,
      max_retries: 3,
      temperature: 0.7,
      max_tokens: 2048,
      tags: [],
      use_in_livekit: false,
      use_in_mcp: false,
      use_in_automation: false,
    });
  };

  const handleTest = (connectionId: string) => {
    setTestingConnectionId(connectionId);
    testMutation.mutate(connectionId);
  };

  const statusColors: Record<string, "success" | "warning" | "destructive" | "default"> = {
    active: "success",
    inactive: "default",
    error: "destructive",
    testing: "warning",
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
            <h1 className="text-3xl font-bold">LLM Connections</h1>
            <p className="text-muted-foreground">
              Manage local, remote, and third-party LLM connections
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Connection
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{connectionsData?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{connectionsData?.active_count || 0}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Video className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {connectionsData?.connections?.filter((c: any) => c.use_in_livekit).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">LiveKit Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <LinkIcon className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {connectionsData?.connections?.filter((c: any) => c.use_in_mcp).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">MCP Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections List */}
      <Card>
        <CardHeader>
          <CardTitle>All Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading connections...</div>
          )}

          {connectionsData && connectionsData.connections.length === 0 && (
            <div className="text-center py-8">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No connections configured</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Connection
              </Button>
            </div>
          )}

          {connectionsData && connectionsData.connections.length > 0 && (
            <div className="space-y-3">
              {connectionsData.connections.map((connection: any) => {
                const TypeIcon = CONNECTION_TYPES.find((t) => t.value === connection.connection_type)?.icon || Server;

                return (
                  <div
                    key={connection.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <TypeIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-medium">{connection.name}</p>
                          <Badge variant={statusColors[connection.status]}>
                            {connection.status}
                          </Badge>
                          <Badge variant="outline">{connection.connection_type}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          {connection.model_name && <span>Model: {connection.model_name}</span>}
                          {connection.base_url && (
                            <>
                              <span>•</span>
                              <span>{connection.base_url}</span>
                            </>
                          )}
                        </div>
                        {connection.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {connection.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {connection.use_in_livekit && (
                            <Badge variant="outline" className="text-xs">
                              <Video className="h-3 w-3 mr-1" />
                              LiveKit
                            </Badge>
                          )}
                          {connection.use_in_mcp && (
                            <Badge variant="outline" className="text-xs">
                              <LinkIcon className="h-3 w-3 mr-1" />
                              MCP
                            </Badge>
                          )}
                          {connection.use_in_automation && (
                            <Badge variant="outline" className="text-xs">
                              <Workflow className="h-3 w-3 mr-1" />
                              Automation
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(connection.id)}
                        disabled={testingConnectionId === connection.id}
                      >
                        {testingConnectionId === connection.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(connection.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Connection Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add LLM Connection</DialogTitle>
            <DialogDescription>
              Configure a new LLM connection for use in LiveKit, MCP, and automation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Connection Name *</Label>
                <Input
                  id="name"
                  value={newConnection.name}
                  onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                  placeholder="My LLM Connection"
                />
              </div>

              <div>
                <Label htmlFor="connection_type">Connection Type *</Label>
                <Select
                  value={newConnection.connection_type}
                  onValueChange={(value) =>
                    setNewConnection({ ...newConnection, connection_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONNECTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newConnection.description}
                  onChange={(e) =>
                    setNewConnection({ ...newConnection, description: e.target.value })
                  }
                  placeholder="Description of this connection..."
                  rows={2}
                />
              </div>
            </div>

            {/* Endpoint Configuration */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Endpoint Configuration</h4>

              <div>
                <Label htmlFor="base_url">Base URL</Label>
                <Input
                  id="base_url"
                  value={newConnection.base_url}
                  onChange={(e) =>
                    setNewConnection({ ...newConnection, base_url: e.target.value })
                  }
                  placeholder="http://localhost:11434 or https://api.openai.com/v1"
                />
              </div>

              <div>
                <Label htmlFor="model_name">Default Model</Label>
                <Input
                  id="model_name"
                  value={newConnection.model_name}
                  onChange={(e) =>
                    setNewConnection({ ...newConnection, model_name: e.target.value })
                  }
                  placeholder="llama3.2:3b or gpt-4"
                />
              </div>

              <div>
                <Label htmlFor="api_key">API Key (if required)</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={newConnection.api_key}
                  onChange={(e) =>
                    setNewConnection({ ...newConnection, api_key: e.target.value })
                  }
                  placeholder="sk-..."
                />
              </div>
            </div>

            {/* Integration Options */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Use In</h4>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-purple-600" />
                  <Label htmlFor="use_in_livekit" className="cursor-pointer">
                    LiveKit (Real-time AI chat)
                  </Label>
                </div>
                <Switch
                  id="use_in_livekit"
                  checked={newConnection.use_in_livekit}
                  onCheckedChange={(checked) =>
                    setNewConnection({ ...newConnection, use_in_livekit: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-orange-600" />
                  <Label htmlFor="use_in_mcp" className="cursor-pointer">
                    MCP Servers (Model Context Protocol)
                  </Label>
                </div>
                <Switch
                  id="use_in_mcp"
                  checked={newConnection.use_in_mcp}
                  onCheckedChange={(checked) =>
                    setNewConnection({ ...newConnection, use_in_mcp: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="use_in_automation" className="cursor-pointer">
                    Automation Workflows
                  </Label>
                </div>
                <Switch
                  id="use_in_automation"
                  checked={newConnection.use_in_automation}
                  onCheckedChange={(checked) =>
                    setNewConnection({ ...newConnection, use_in_automation: checked })
                  }
                />
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium">Advanced Options</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={newConnection.timeout}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, timeout: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="max_retries">Max Retries</Label>
                  <Input
                    id="max_retries"
                    type="number"
                    value={newConnection.max_retries}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, max_retries: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    value={newConnection.temperature}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, temperature: parseFloat(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    value={newConnection.max_tokens}
                    onChange={(e) =>
                      setNewConnection({ ...newConnection, max_tokens: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newConnection)}
              disabled={!newConnection.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Connection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
