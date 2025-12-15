"use client";

import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Server,
  Activity,
  Container,
  Settings as SettingsIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

export default function DockerHostSettingsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const hostId = params.id as string;

  const { data: hosts } = useQuery({
    queryKey: ["docker-hosts"],
    queryFn: async () => {
      const stored = localStorage.getItem("docker_hosts");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const host = hosts?.find((h: any) => h.id === hostId);

  const [settings, setSettings] = useState({
    default_framework: host?.default_framework || "ollama",
    default_gpu_enabled: host?.default_gpu_enabled || true,
    auto_create_connection: host?.auto_create_connection || true,
    default_port_range_start: host?.default_port_range_start || 11434,
    max_containers: host?.max_containers || 10,
  });

  const saveSettings = () => {
    const currentHosts = hosts || [];
    const updatedHosts = currentHosts.map((h: any) =>
      h.id === hostId ? { ...h, ...settings } : h
    );
    localStorage.setItem("docker_hosts", JSON.stringify(updatedHosts));
    queryClient.invalidateQueries({ queryKey: ["docker-hosts"] });
    toast.success("Host settings saved");
  };

  if (!host) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Host not found</p>
          <Link href="/ai-compute/docker/hosts">
            <Button>Back to Hosts</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ai-compute/docker/hosts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{host.name}</h1>
            <Badge variant={host.status === "online" ? "success" : "default"}>
              {host.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{host.description || host.host_url}</p>
        </div>
      </div>

      <Tabs defaultValue="deployment" className="space-y-6">
        <TabsList>
          <TabsTrigger value="deployment">
            <Container className="h-4 w-4 mr-2" />
            Deployment
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Activity className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="info">
            <Server className="h-4 w-4 mr-2" />
            Host Info
          </TabsTrigger>
        </TabsList>

        {/* Deployment Settings */}
        <TabsContent value="deployment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Deployment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Framework</Label>
                <Select
                  value={settings.default_framework}
                  onValueChange={(value) =>
                    setSettings({ ...settings, default_framework: value })
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
                <div>
                  <Label>Enable GPU by Default</Label>
                  <p className="text-xs text-muted-foreground">
                    Use GPU for new containers on this host
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.default_gpu_enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, default_gpu_enabled: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-create LLM Connections</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create connections for deployments
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.auto_create_connection}
                  onChange={(e) =>
                    setSettings({ ...settings, auto_create_connection: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>

              <div>
                <Label>Port Range Start</Label>
                <Input
                  type="number"
                  value={settings.default_port_range_start}
                  onChange={(e) =>
                    setSettings({ ...settings, default_port_range_start: parseInt(e.target.value) })
                  }
                />
              </div>

              <Button onClick={saveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resource Limits */}
        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Max Containers</Label>
                <Input
                  type="number"
                  value={settings.max_containers}
                  onChange={(e) =>
                    setSettings({ ...settings, max_containers: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum LLM containers allowed on this host
                </p>
              </div>

              <Button onClick={saveSettings}>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Host Info */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Host Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Portainer Endpoint ID</span>
                <span className="font-medium">{host.portainer_endpoint_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host URL</span>
                <span className="font-medium">{host.host_url}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={host.status === "online" ? "success" : "default"}>
                  {host.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(host.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
