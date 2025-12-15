"use client";

import { useState } from "react";
import { usePhoneSystems } from "@/hooks/use-phone-systems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Loader2,
} from "lucide-react";
import type { SystemStatus } from "@/types";

const statusColors: Record<SystemStatus, "success" | "destructive" | "warning" | "secondary"> = {
  online: "success",
  offline: "destructive",
  degraded: "warning",
  maintenance: "secondary",
};

export default function PhoneSystemsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = usePhoneSystems();

  const phoneSystems = data?.data || [];
  const filteredSystems = phoneSystems.filter((system) =>
    system.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Systems</h1>
          <p className="text-muted-foreground">
            Manage and monitor your PBX and phone systems
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add System
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search systems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Systems</TabsTrigger>
          <TabsTrigger value="online">Online</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-destructive">Failed to load phone systems</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredSystems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No phone systems found</p>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First System
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSystems.map((system) => (
                <Card key={system.id}>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{system.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">
                        {system.type}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Status
                        </span>
                        <Badge variant={statusColors[system.status]}>
                          {system.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          IP Address
                        </span>
                        <span className="text-sm font-mono">
                          {system.ipAddress}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Extensions
                        </span>
                        <span className="text-sm">
                          {system.activeExtensions} / {system.totalExtensions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Location
                        </span>
                        <span className="text-sm">{system.location}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="online" className="mt-4">
          <p className="text-muted-foreground">
            Showing only online systems...
          </p>
        </TabsContent>

        <TabsContent value="issues" className="mt-4">
          <p className="text-muted-foreground">
            Showing systems with issues...
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
