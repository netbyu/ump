"use client";

import { useWorkflows } from "@/hooks/use-workflows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Workflow, Plus, Play, Pause, Loader2 } from "lucide-react";
import type { WorkflowStatus } from "@/types";

const statusColors: Record<WorkflowStatus, "success" | "destructive" | "warning" | "secondary"> = {
  active: "success",
  paused: "secondary",
  failed: "destructive",
  completed: "success",
};

export default function AutomationPage() {
  const { data, isLoading, error, refetch } = useWorkflows();

  const workflows = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation</h1>
          <p className="text-muted-foreground">
            Manage Temporal workflows and automation tasks
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load workflows</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No workflows found</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {workflow.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColors[workflow.status]}>
                      {workflow.status}
                    </Badge>
                    {workflow.status === "active" ? (
                      <Button variant="outline" size="icon">
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="outline" size="icon">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Schedule</span>
                    <p className="font-medium">{workflow.schedule || "Manual"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Run</span>
                    <p className="font-medium">
                      {workflow.lastRun
                        ? new Date(workflow.lastRun).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Next Run</span>
                    <p className="font-medium">
                      {workflow.nextRun
                        ? new Date(workflow.nextRun).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
