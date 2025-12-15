"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Server,
  DollarSign,
  Activity,
  Zap,
  Plus,
  TrendingUp,
  Settings,
  Container,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { aiComputeAPI } from "@/lib/ai-compute-api";
import type { InstanceStatus } from "@/types/ai-compute";

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

export default function AIComputePage() {
  // Fetch instances
  const {
    data: instancesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ai-instances"],
    queryFn: () => aiComputeAPI.listInstances(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = [
    {
      name: "Active Instances",
      value: instancesData?.active_count.toString() || "0",
      icon: Server,
      description: "Currently running",
      color: "text-blue-600",
    },
    {
      name: "Total Instances",
      value: instancesData?.total.toString() || "0",
      icon: Activity,
      description: "All instances",
      color: "text-purple-600",
    },
    {
      name: "Estimated Cost",
      value: `$${instancesData?.total_cost_estimate.toFixed(2) || "0.00"}`,
      icon: DollarSign,
      description: "Current running cost",
      color: "text-green-600",
    },
    {
      name: "GPU Hours",
      value: instancesData?.instances
        .reduce((sum, inst) => sum + (inst.uptime_hours || 0), 0)
        .toFixed(1) || "0.0",
      icon: Zap,
      description: "Total this month",
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Compute</h1>
          <p className="text-muted-foreground">
            Manage AWS Spot GPU instances for LLM testing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ai-compute/settings">
            <Button variant="outline" size="lg">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/ai-compute/launch">
            <Button size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Launch Instance
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Instances */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Instances</CardTitle>
            <Link href="/ai-compute/instances">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading instances...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading instances. Make sure the API is running.
            </div>
          )}

          {instancesData && instancesData.instances.length === 0 && (
            <div className="text-center py-8">
              <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No instances found. Launch your first GPU instance!
              </p>
              <Link href="/ai-compute/launch">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Launch Instance
                </Button>
              </Link>
            </div>
          )}

          {instancesData && instancesData.instances.length > 0 && (
            <div className="space-y-3">
              {instancesData.instances
                .filter((inst) => inst.status === "running")
                .slice(0, 5)
                .map((instance) => (
                  <Link
                    key={instance.id}
                    href={`/ai-compute/instances/${instance.instance_id}`}
                  >
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <Server className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{instance.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{instance.instance_type}</span>
                            <span>•</span>
                            <span>{instance.gpu}</span>
                            {instance.public_ip && (
                              <>
                                <span>•</span>
                                <span>{instance.public_ip}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            ${instance.estimated_cost?.toFixed(2) || "0.00"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {instance.uptime_hours?.toFixed(1)}h uptime
                          </p>
                        </div>
                        <Badge variant={statusColors[instance.status]}>
                          {instance.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* LLM Deployment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>LLM Deployment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your deployment method
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* AWS Spot Instances */}
            <div className="p-6 rounded-lg border-2 border-border hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Server className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AWS Spot Instances</h3>
                  <p className="text-sm text-muted-foreground">Cloud GPU instances</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Launch GPU instances on AWS. Auto-setup with drivers and frameworks.
                Save 60-90% with spot pricing.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/ai-compute/aws">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Launch Instance
                  </Button>
                </Link>
                <Link href="/ai-compute/aws/instances">
                  <Button size="sm" variant="outline">
                    Manage
                  </Button>
                </Link>
                <Link href="/ai-compute/aws/pricing">
                  <Button size="sm" variant="outline">
                    Pricing
                  </Button>
                </Link>
                <Link href="/ai-compute/aws/settings">
                  <Button size="sm" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>

            {/* Docker/Portainer */}
            <div className="p-6 rounded-lg border-2 border-border hover:border-primary transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-indigo-500/10">
                  <Container className="h-8 w-8 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Docker/Portainer</h3>
                  <p className="text-sm text-muted-foreground">Your own hardware</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Deploy to remote Docker hosts managed by Portainer. Use your own GPU
                servers. Free after hardware costs.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/ai-compute/docker">
                  <Button size="sm">
                    <Container className="mr-2 h-4 w-4" />
                    Deploy Container
                  </Button>
                </Link>
                <Link href="/ai-compute/docker/settings">
                  <Button size="sm" variant="outline">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unified Management */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/ai-compute/connections">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">LLM Connections</p>
                  <p className="text-sm text-muted-foreground">
                    Manage all LLM connections for LiveKit, MCP, and Automation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai-compute/settings">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-gray-500/10">
                  <Settings className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">General Settings</p>
                  <p className="text-sm text-muted-foreground">
                    Global preferences and configuration
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Legacy Quick Actions - Remove after testing */}
      <div className="hidden">
        <Link href="/ai-compute/launch">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Launch Instance</p>
                  <p className="text-sm text-muted-foreground">
                    Start a new GPU instance
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai-compute/connections">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">LLM Connections</p>
                  <p className="text-sm text-muted-foreground">
                    Manage all connections
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai-compute/pricing">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">View Pricing</p>
                  <p className="text-sm text-muted-foreground">
                    Compare instance costs
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai-compute/docker">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-indigo-500/10">
                  <Container className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">Docker Deploy</p>
                  <p className="text-sm text-muted-foreground">
                    Deploy to Docker hosts
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/ai-compute/instances">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Manage Instances</p>
                  <p className="text-sm text-muted-foreground">
                    View AWS instances
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
