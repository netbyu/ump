"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Rocket,
  Server,
  Container,
  Cloud,
  Layers,
  Mic,
  Workflow,
  Zap,
  CheckCircle,
  Play,
  Square,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Search,
  Filter,
  HardDrive,
  Activity,
  HeadphonesIcon,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:8002/api";

export default function AutomationStacksPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"templates" | "deployed">("templates");
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [deployForm, setDeployForm] = useState({
    name: "",
    description: "",
    deployment_target: "docker",
    docker_host_id: "",
    portainer_endpoint_id: 0,
    aws_instance_type: "g5.xlarge",
    aws_region: "ca-central-1",
    config_overrides: {} as Record<string, any>,
  });

  // Fetch stack templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["stack-templates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/stacks/templates`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  // Fetch deployed stacks
  const { data: deployedStacks, isLoading: deployedLoading } = useQuery({
    queryKey: ["deployed-stacks"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/stacks`);
      if (!response.ok) throw new Error("Failed to fetch deployed stacks");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch Docker hosts
  const { data: dockerHosts } = useQuery({
    queryKey: ["docker-hosts"],
    queryFn: async () => {
      const stored = localStorage.getItem("docker_hosts");
      return stored ? JSON.parse(stored) : [];
    },
  });

  // Deploy stack mutation
  const deployMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/stacks/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to deploy stack");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Stack deployment started!", {
        description: `${data.name} is being deployed...`,
      });
      queryClient.invalidateQueries({ queryKey: ["deployed-stacks"] });
      setDeployDialogOpen(false);
      setActiveTab("deployed");
    },
    onError: (error: Error) => {
      toast.error("Failed to deploy stack", {
        description: error.message,
      });
    },
  });

  const openDeployDialog = (template: any) => {
    setSelectedTemplate(template);
    setDeployForm({
      ...deployForm,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      config_overrides: {},
    });
    setDeployDialogOpen(true);
  };

  const handleDeploy = () => {
    if (!deployForm.name) {
      toast.error("Please enter a deployment name");
      return;
    }

    deployMutation.mutate({
      stack_id: selectedTemplate.id,
      ...deployForm,
    });
  };

  const getStackIcon = (category: string) => {
    switch (category) {
      case "voice_agent":
        return <Mic className="h-8 w-8 text-purple-600" />;
      case "temporal":
        return <Workflow className="h-8 w-8 text-blue-600" />;
      case "complete":
        return <Zap className="h-8 w-8 text-green-600" />;
      case "infrastructure":
        return <HardDrive className="h-8 w-8 text-orange-600" />;
      case "monitoring":
        return <Activity className="h-8 w-8 text-red-600" />;
      case "itsm":
        return <HeadphonesIcon className="h-8 w-8 text-teal-600" />;
      default:
        return <Layers className="h-8 w-8 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "voice_agent":
        return "bg-purple-500/10";
      case "temporal":
        return "bg-blue-500/10";
      case "complete":
        return "bg-green-500/10";
      case "infrastructure":
        return "bg-orange-500/10";
      case "monitoring":
        return "bg-red-500/10";
      case "itsm":
        return "bg-teal-500/10";
      default:
        return "bg-gray-500/10";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/infrastructure">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Automation Stacks</h1>
            <p className="text-muted-foreground">
              Deploy complete automation environments with one click
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="templates">
            <Layers className="mr-2 h-4 w-4" />
            Available Stacks ({templates?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="deployed">
            <Server className="mr-2 h-4 w-4" />
            Deployed ({deployedStacks?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search automation stacks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="voice_agent">Voice Agents</SelectItem>
                    <SelectItem value="temporal">Temporal</SelectItem>
                    <SelectItem value="complete">Complete Platform</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="monitoring">Monitoring</SelectItem>
                    <SelectItem value="itsm">ITSM / Helpdesk</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode Toggle */}
                <div className="flex gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <ListIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading */}
          {templatesLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading stack templates...
            </div>
          )}

          {/* Grid View */}
          {!templatesLoading && viewMode === "grid" && templates && templates.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {templates
                .filter((t: any) =>
                  (categoryFilter === "all" || t.category === categoryFilter) &&
                  (searchQuery === "" ||
                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    t.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
                )
                .map((template: any) => (
                <Card
                  key={template.id}
                  className="hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 rounded-lg ${getCategoryColor(template.category)}`}>
                        {getStackIcon(template.category)}
                      </div>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <CardTitle className="text-xl">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Components */}
                    <div>
                      <p className="text-sm font-medium mb-2">Components:</p>
                      <div className="space-y-1">
                        {template.components.slice(0, 5).map((comp: any) => (
                          <div
                            key={comp.name}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <Server className="h-3 w-3" />
                            <span>{comp.display_name}</span>
                          </div>
                        ))}
                        {template.components.length > 5 && (
                          <p className="text-xs text-muted-foreground">
                            +{template.components.length - 5} more...
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Resources */}
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Requirements:</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          {template.resources.min_ram_gb}GB RAM
                        </Badge>
                        {template.resources.min_vram_gb && (
                          <Badge variant="outline">
                            {template.resources.min_vram_gb}GB VRAM
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {template.resources.min_cpu_cores} CPU
                        </Badge>
                        {template.resources.requires_gpu && (
                          <Badge variant="default">GPU Required</Badge>
                        )}
                      </div>
                    </div>

                    {/* Tags */}
                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.tags.slice(0, 4).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {template.tags.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.tags.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Deploy button */}
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeployDialog(template);
                      }}
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy Stack
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* List View */}
          {!templatesLoading && viewMode === "list" && templates && templates.length > 0 && (
            <Card>
              <div className="divide-y">
                {templates
                  .filter((t: any) =>
                    (categoryFilter === "all" || t.category === categoryFilter) &&
                    (searchQuery === "" ||
                      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
                  )
                  .map((template: any) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-4 hover:bg-accent transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getCategoryColor(template.category)}`}>
                        {getStackIcon(template.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Server className="h-3 w-3" />
                            <span>{template.components.length} components</span>
                          </div>
                          {template.resources.requires_gpu && (
                            <Badge variant="default" className="text-xs">GPU Required</Badge>
                          )}
                          {template.tags.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => openDeployDialog(template)}
                      className="bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No Results */}
          {!templatesLoading &&
            templates &&
            templates.filter((t: any) =>
              (categoryFilter === "all" || t.category === categoryFilter) &&
              (searchQuery === "" ||
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase()))
            ).length === 0 && (
              <div className="text-center py-12">
                <Layers className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No stacks found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
        </TabsContent>

        {/* Deployed Stacks Tab */}
        <TabsContent value="deployed" className="space-y-6">
          {deployedLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading deployed stacks...
            </div>
          )}

          {deployedStacks && deployedStacks.stacks.length === 0 && (
            <div className="text-center py-12">
              <Layers className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No stacks deployed yet</p>
              <p className="text-muted-foreground mb-6">
                Deploy your first automation stack to get started
              </p>
              <Button onClick={() => setActiveTab("templates")}>
                Browse Stack Templates
              </Button>
            </div>
          )}

          {deployedStacks && deployedStacks.stacks.length > 0 && (
            <div className="space-y-4">
              {deployedStacks.stacks.map((stack: any) => (
                <Card key={stack.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle>{stack.name}</CardTitle>
                          <Badge
                            variant={
                              stack.status === "running"
                                ? "success"
                                : stack.status === "deploying"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {stack.status}
                          </Badge>
                        </div>
                        <CardDescription>{stack.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Deployment Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Target</p>
                        <div className="flex items-center gap-1 font-medium">
                          {stack.deployment_target === "docker" ? (
                            <Container className="h-4 w-4" />
                          ) : (
                            <Cloud className="h-4 w-4" />
                          )}
                          <span>{stack.deployment_target}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Components</p>
                        <p className="font-medium">
                          {stack.running_components} / {stack.total_components} running
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Host</p>
                        <p className="font-medium font-mono text-xs">
                          {stack.host_ip || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Deployed</p>
                        <p className="text-xs">
                          {new Date(stack.deployed_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Access URLs */}
                    {stack.access_urls && Object.keys(stack.access_urls).length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="text-sm font-medium mb-2">Access URLs:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(stack.access_urls).map(([name, url]: [string, any]) => (
                            <a
                              key={name}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {name}: {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t">
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Square className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deploy: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{selectedTemplate?.description}</DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Deployment Name *</Label>
                  <Input
                    id="name"
                    value={deployForm.name}
                    onChange={(e) => setDeployForm({ ...deployForm, name: e.target.value })}
                    placeholder="My LiveKit Stack"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={deployForm.description}
                    onChange={(e) => setDeployForm({ ...deployForm, description: e.target.value })}
                    placeholder="Production voice agent"
                  />
                </div>
              </div>

              {/* Deployment Target */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold">Deployment Target</h4>

                <div className="grid grid-cols-2 gap-3">
                  {selectedTemplate.deployment_targets.includes("docker") && (
                    <button
                      type="button"
                      onClick={() => setDeployForm({ ...deployForm, deployment_target: "docker" })}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        deployForm.deployment_target === "docker"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Container className="h-6 w-6 mb-2" />
                      <div className="font-medium">Docker/Portainer</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deploy to your Docker host
                      </p>
                    </button>
                  )}

                  {selectedTemplate.deployment_targets.includes("aws_spot") && (
                    <button
                      type="button"
                      onClick={() => setDeployForm({ ...deployForm, deployment_target: "aws_spot" })}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        deployForm.deployment_target === "aws_spot"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Cloud className="h-6 w-6 mb-2" />
                      <div className="font-medium">AWS Spot Instance</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deploy to AWS GPU instance
                      </p>
                    </button>
                  )}
                </div>

                {/* Docker-specific options */}
                {deployForm.deployment_target === "docker" && (
                  <div>
                    <Label>Select Docker Host</Label>
                    <Select
                      value={deployForm.docker_host_id}
                      onValueChange={(value) =>
                        setDeployForm({ ...deployForm, docker_host_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Docker host" />
                      </SelectTrigger>
                      <SelectContent>
                        {dockerHosts?.map((host: any) => (
                          <SelectItem key={host.id} value={host.id}>
                            {host.name} ({host.host_url})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* AWS-specific options */}
                {deployForm.deployment_target === "aws_spot" && (
                  <div className="space-y-3">
                    <div>
                      <Label>Instance Type</Label>
                      <Input
                        value={deployForm.aws_instance_type}
                        onChange={(e) =>
                          setDeployForm({ ...deployForm, aws_instance_type: e.target.value })
                        }
                        placeholder={selectedTemplate.resources.recommended_instance_type}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: {selectedTemplate.resources.recommended_instance_type}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Configuration Options */}
              {selectedTemplate.configurable_options.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h4 className="font-semibold">Configuration</h4>

                  {selectedTemplate.configurable_options.map((option: any) => (
                    <div key={option.id}>
                      <Label>{option.label}</Label>
                      {option.type === "select" ? (
                        <Select
                          value={deployForm.config_overrides[option.id] || option.default}
                          onValueChange={(value) =>
                            setDeployForm({
                              ...deployForm,
                              config_overrides: {
                                ...deployForm.config_overrides,
                                [option.id]: value,
                              },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {option.options.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={deployForm.config_overrides[option.id] || option.default}
                          onChange={(e) =>
                            setDeployForm({
                              ...deployForm,
                              config_overrides: {
                                ...deployForm.config_overrides,
                                [option.id]: e.target.value,
                              },
                            })
                          }
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Resource Requirements */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                <p className="font-medium mb-2 text-sm">Resource Requirements:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>RAM: {selectedTemplate.resources.min_ram_gb}GB</div>
                  {selectedTemplate.resources.min_vram_gb && (
                    <div>VRAM: {selectedTemplate.resources.min_vram_gb}GB</div>
                  )}
                  <div>CPU: {selectedTemplate.resources.min_cpu_cores} cores</div>
                  <div>Disk: {selectedTemplate.resources.min_disk_gb}GB</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeploy}
              disabled={deployMutation.isPending || !deployForm.name}
            >
              {deployMutation.isPending ? (
                "Deploying..."
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy Stack
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
