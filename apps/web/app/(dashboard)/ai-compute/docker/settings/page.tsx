"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Container,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

export default function DockerSettingsPage() {
  const [portainerConfig, setPortainerConfig] = useState({
    url: "http://localhost:9000",
    api_token: "",
  });

  const [dockerPreferences, setDockerPreferences] = useState({
    default_framework: "ollama",
    default_gpu_enabled: true,
    auto_create_connection: true,
    auto_start: true,
  });

  // Fetch Docker endpoints to test connection
  const {
    data: endpoints,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["docker-endpoints"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/docker/endpoints`);
      if (!response.ok) throw new Error("Failed to fetch endpoints");
      return response.json();
    },
    retry: false,
  });

  const savePortainerConfig = () => {
    localStorage.setItem("portainer_config", JSON.stringify(portainerConfig));
    toast.success("Portainer configuration saved", {
      description: "Please update PORTAINER_URL and PORTAINER_API_TOKEN in API .env file",
    });
  };

  const savePreferences = () => {
    localStorage.setItem("docker_preferences", JSON.stringify(dockerPreferences));
    toast.success("Docker preferences saved");
  };

  const testConnection = async () => {
    try {
      await refetch();
      if (endpoints && endpoints.length > 0) {
        toast.success("Portainer connection successful", {
          description: `Found ${endpoints.length} Docker host(s)`,
        });
      }
    } catch (error) {
      toast.error("Portainer connection failed", {
        description: "Check URL and API token",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ai-compute">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Docker/Portainer Settings</h1>
          <p className="text-muted-foreground">
            Configure Portainer connection and Docker deployment preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="portainer" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="portainer">
            <Server className="h-4 w-4 mr-2" />
            Portainer
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Container className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="hosts">
            <Server className="h-4 w-4 mr-2" />
            Docker Hosts
          </TabsTrigger>
        </TabsList>

        {/* Portainer Configuration */}
        <TabsContent value="portainer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portainer Connection</CardTitle>
              <CardDescription>
                Configure connection to Portainer for Docker management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Status */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                  ) : error ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : endpoints && endpoints.length > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="font-medium">
                      {isLoading
                        ? "Checking connection..."
                        : error
                        ? "Not Connected"
                        : endpoints && endpoints.length > 0
                        ? `Connected - ${endpoints.length} Docker host(s)`
                        : "No Docker hosts found"}
                    </p>
                    {!isLoading && !error && endpoints && endpoints.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Portainer connection active
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Portainer URL</Label>
                <Input
                  value={portainerConfig.url}
                  onChange={(e) =>
                    setPortainerConfig({ ...portainerConfig, url: e.target.value })
                  }
                  placeholder="http://localhost:9000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Update in backend: services/ai/api/.env → PORTAINER_URL
                </p>
              </div>

              <div>
                <Label>API Token</Label>
                <Input
                  type="password"
                  value={portainerConfig.api_token}
                  onChange={(e) =>
                    setPortainerConfig({ ...portainerConfig, api_token: e.target.value })
                  }
                  placeholder="ptr_..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Update in backend: services/ai/api/.env → PORTAINER_API_TOKEN
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={testConnection}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button variant="outline" asChild>
                  <a href={portainerConfig.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Portainer
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-2">1. Install Portainer:</p>
                <code className="block p-3 bg-muted rounded-md text-xs">
                  docker run -d -p 9000:9000 --name portainer --restart=always \<br />
                  &nbsp;&nbsp;-v /var/run/docker.sock:/var/run/docker.sock \<br />
                  &nbsp;&nbsp;-v portainer_data:/data portainer/portainer-ce:latest
                </code>
              </div>

              <div>
                <p className="font-medium mb-2">2. Get API Token:</p>
                <p className="text-muted-foreground">
                  Open Portainer → User Settings → Access tokens → Add token
                </p>
              </div>

              <div>
                <p className="font-medium mb-2">3. Update Backend .env:</p>
                <code className="block p-3 bg-muted rounded-md text-xs">
                  PORTAINER_URL=http://localhost:9000<br />
                  PORTAINER_API_TOKEN=ptr_your_token_here
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Docker Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Deployment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Framework</Label>
                <Select
                  value={dockerPreferences.default_framework}
                  onValueChange={(value) =>
                    setDockerPreferences({ ...dockerPreferences, default_framework: value })
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
                <Label>Enable GPU by Default</Label>
                <input
                  type="checkbox"
                  checked={dockerPreferences.default_gpu_enabled}
                  onChange={(e) =>
                    setDockerPreferences({
                      ...dockerPreferences,
                      default_gpu_enabled: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Auto-create LLM Connection</Label>
                <input
                  type="checkbox"
                  checked={dockerPreferences.auto_create_connection}
                  onChange={(e) =>
                    setDockerPreferences({
                      ...dockerPreferences,
                      auto_create_connection: e.target.checked,
                    })
                  }
                  className="h-4 w-4"
                />
              </div>

              <Button onClick={savePreferences}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Docker Hosts */}
        <TabsContent value="hosts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Docker Hosts</CardTitle>
                  <CardDescription>Docker endpoints configured in Portainer</CardDescription>
                </div>
                <Link href="/ai-compute/docker/hosts">
                  <Button variant="outline" size="sm">
                    Manage Hosts
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <div className="text-center py-8">Loading...</div>}

              {error && (
                <div className="text-center py-8 text-destructive">
                  Not connected to Portainer. Check configuration.
                </div>
              )}

              {endpoints && endpoints.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No Docker hosts configured in Portainer
                </div>
              )}

              {endpoints && endpoints.length > 0 && (
                <div className="space-y-2">
                  {endpoints.map((endpoint: any) => (
                    <div
                      key={endpoint.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{endpoint.name}</p>
                        <p className="text-sm text-muted-foreground">{endpoint.url}</p>
                      </div>
                      <Badge variant={endpoint.status === 1 ? "success" : "destructive"}>
                        {endpoint.status === 1 ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
