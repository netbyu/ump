"use client";

import { useInfrastructureDevices } from "@/hooks/use-infrastructure";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, Plus, Loader2 } from "lucide-react";
import type { SystemStatus } from "@/types";

const statusColors: Record<SystemStatus, "success" | "destructive" | "warning" | "secondary"> = {
  online: "success",
  offline: "destructive",
  degraded: "warning",
  maintenance: "secondary",
};

export default function InfrastructurePage() {
  const { data, isLoading, error, refetch } = useInfrastructureDevices();

  const devices = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure</h1>
          <p className="text-muted-foreground">
            Monitor servers, switches, and network devices
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Failed to load devices</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : devices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No devices found</p>
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{device.name}</CardTitle>
                  <Badge variant={statusColors[device.status]}>
                    {device.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {device.type}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP</span>
                    <span className="font-mono">{device.ipAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span>{device.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Seen</span>
                    <span>{new Date(device.lastSeen).toLocaleString()}</span>
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
