"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Plus,
  Cloud,
  CheckCircle,
  XCircle,
  Settings,
  Trash2,
  TestTube,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_CONNECTORS_API_URL || "http://localhost:8003/api";

export default function PlatformIntegrationsPage() {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newIntegration, setNewIntegration] = useState({
    name: "",
    description: "",
    provider_id: "",
    connector_id: "",
  });

  // Fetch platform integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ["platform-integrations"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/platform-integrations`);
      if (!response.ok) throw new Error("Failed to fetch platform integrations");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch providers for selection
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/providers`);
      if (!response.ok) throw new Error("Failed to fetch providers");
      return response.json();
    },
  });

  // Fetch connectors for selection
  const { data: connectors } = useQuery({
    queryKey: ["connectors"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/connectors`);
      if (!response.ok) throw new Error("Failed to fetch connectors");
      return response.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newIntegration) => {
      const response = await fetch(`${API_BASE_URL}/platform-integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create integration");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Platform integration created");
      queryClient.invalidateQueries({ queryKey: ["platform-integrations"] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to create integration", { description: error.message });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/platform-integrations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete integration");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Platform integration deleted");
      queryClient.invalidateQueries({ queryKey: ["platform-integrations"] });
    },
  });

  // Test mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/platform-integrations/${id}/test`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Test failed");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Integration test successful");
      } else {
        toast.error("Integration test failed");
      }
    },
  });

  const resetForm = () => {
    setNewIntegration({
      name: "",
      description: "",
      provider_id: "",
      connector_id: "",
    });
  };

  const filteredIntegrations = integrations?.items?.filter((int: any) =>
    searchQuery === "" ||
    int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    int.provider_id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/integrations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Platform Integrations</h1>
            <p className="text-muted-foreground">
              Software and SaaS platform integrations
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Platform Integration
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search platform integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Integrations List */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Integrations</CardTitle>
          <CardDescription>
            Configured integrations with software platforms and SaaS applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading platform integrations...
            </div>
          )}

          {!isLoading && filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Cloud className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No platform integrations</p>
              <p className="text-muted-foreground mb-6">
                Create your first platform integration to connect with SaaS applications
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Platform Integration
              </Button>
            </div>
          )}

          {filteredIntegrations.length > 0 && (
            <div className="space-y-3">
              {filteredIntegrations.map((integration: any) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Cloud className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{integration.name}</p>
                        <Badge
                          variant={integration.is_verified ? "success" : "outline"}
                        >
                          {integration.is_verified ? "Verified" : "Not Verified"}
                        </Badge>
                        <Badge variant="outline">{integration.provider_id}</Badge>
                      </div>
                      {integration.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {integration.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testMutation.mutate(integration.id)}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(integration.id)}
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

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Platform Integration</DialogTitle>
            <DialogDescription>
              Create an integration with a software platform or SaaS application
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Integration Name *</Label>
              <Input
                id="name"
                value={newIntegration.name}
                onChange={(e) =>
                  setNewIntegration({ ...newIntegration, name: e.target.value })
                }
                placeholder="Production Salesforce"
              />
            </div>

            <div>
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={newIntegration.provider_id}
                onValueChange={(value) =>
                  setNewIntegration({ ...newIntegration, provider_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.items?.map((provider: any) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="connector">Connector *</Label>
              <Select
                value={newIntegration.connector_id}
                onValueChange={(value) =>
                  setNewIntegration({ ...newIntegration, connector_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a configured connector" />
                </SelectTrigger>
                <SelectContent>
                  {connectors?.items
                    ?.filter((c: any) => c.provider_id === newIntegration.provider_id)
                    .map((connector: any) => (
                      <SelectItem key={connector.id} value={connector.id}>
                        {connector.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Or{" "}
                <Link
                  href={`/providers/add/${newIntegration.provider_id}`}
                  className="text-blue-600 hover:underline"
                >
                  create a new connector
                </Link>
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newIntegration.description}
                onChange={(e) =>
                  setNewIntegration({ ...newIntegration, description: e.target.value })
                }
                placeholder="Main CRM instance for customer management"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newIntegration)}
              disabled={!newIntegration.name || !newIntegration.provider_id || !newIntegration.connector_id}
            >
              Create Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
