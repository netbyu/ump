"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Server, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { aiComputeAPI } from "@/lib/ai-compute-api";
import type { InstanceStatus, Instance } from "@/types/ai-compute";
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

export default function InstancesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [instanceToDelete, setInstanceToDelete] = useState<string | null>(null);

  // Fetch instances
  const {
    data: instancesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["ai-instances", statusFilter],
    queryFn: () =>
      aiComputeAPI.listInstances(statusFilter === "all" ? undefined : statusFilter),
    refetchInterval: 30000,
  });

  // Terminate mutation
  const terminateMutation = useMutation({
    mutationFn: aiComputeAPI.terminateInstance,
    onSuccess: () => {
      toast.success("Instance terminated successfully");
      queryClient.invalidateQueries({ queryKey: ["ai-instances"] });
      setInstanceToDelete(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to terminate instance", {
        description: error.message,
      });
    },
  });

  const handleTerminate = (instanceId: string) => {
    terminateMutation.mutate(instanceId);
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
            <h1 className="text-3xl font-bold">Instances</h1>
            <p className="text-muted-foreground">
              Manage your GPU instances
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/ai-compute/launch">
            <Button>Launch Instance</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {instancesData?.active_count || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{instancesData?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total Instances</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              ${instancesData?.total_cost_estimate.toFixed(2) || "0.00"}
            </div>
            <p className="text-sm text-muted-foreground">Estimated Cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Instances</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Instance List */}
      <Card>
        <CardHeader>
          <CardTitle>All Instances</CardTitle>
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
              <p className="text-muted-foreground mb-4">No instances found.</p>
              <Link href="/ai-compute/launch">
                <Button>Launch Instance</Button>
              </Link>
            </div>
          )}

          {instancesData && instancesData.instances.length > 0 && (
            <div className="space-y-3">
              {instancesData.instances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Server className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-medium">{instance.name}</p>
                        <Badge variant={statusColors[instance.status]}>
                          {instance.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{instance.instance_type}</span>
                        <span>•</span>
                        <span>{instance.framework}</span>
                        {instance.gpu && (
                          <>
                            <span>•</span>
                            <span>
                              {instance.gpu} ({instance.gpu_memory})
                            </span>
                          </>
                        )}
                        {instance.public_ip && (
                          <>
                            <span>•</span>
                            <span>{instance.public_ip}</span>
                          </>
                        )}
                      </div>
                      {instance.model && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Model: {instance.model}
                        </div>
                      )}
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

                    <div className="flex items-center gap-2">
                      <Link href={`/ai-compute/instances/${instance.instance_id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      {instance.status !== "terminated" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInstanceToDelete(instance.instance_id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terminate Dialog */}
      <AlertDialog
        open={!!instanceToDelete}
        onOpenChange={() => setInstanceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Instance?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The instance will be permanently
              terminated and all data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => instanceToDelete && handleTerminate(instanceToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
