"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  Plus,
  Network,
  Server,
  Activity,
  AlertCircle,
  CheckCircle,
  Trash2,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  GitBranch,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function KamailioRoutingPage() {
  const queryClient = useQueryClient();
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const [addBackendOpen, setAddBackendOpen] = useState(false);

  const [newRule, setNewRule] = useState({
    name: "",
    extension_range_start: "",
    extension_range_end: "",
    destination_set: "1",
    priority: 0,
  });

  const [newBackend, setNewBackend] = useState({
    set_id: "1",
    sip_uri: "",
    name: "",
    priority: 0,
    flags: 0,
  });

  // Mock data (replace with API call)
  const routingSets = [
    {
      id: "1",
      name: "Primary PBXes",
      extension_range: "1000-1999",
      backends: [
        {
          id: "backend-1",
          name: "FreePBX Primary",
          uri: "sip:192.168.1.100:5061",
          status: "online",
          priority: 0,
          calls_active: 12,
          calls_total: 1250,
        },
        {
          id: "backend-2",
          name: "FreePBX Backup",
          uri: "sip:192.168.1.101:5062",
          status: "online",
          priority: 1,
          calls_active: 0,
          calls_total: 23,
        },
      ],
    },
    {
      id: "2",
      name: "Secondary PBXes",
      extension_range: "2000-2999",
      backends: [
        {
          id: "backend-3",
          name: "Asterisk Primary",
          uri: "sip:192.168.1.102:5063",
          status: "online",
          priority: 0,
          calls_active: 8,
          calls_total: 890,
        },
        {
          id: "backend-4",
          name: "Asterisk Backup",
          uri: "sip:192.168.1.103:5064",
          status: "degraded",
          priority: 1,
          calls_active: 0,
          calls_total: 5,
        },
      ],
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Online</Badge>;
      case "offline":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Offline</Badge>;
      case "degraded":
        return <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" />Degraded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const reloadDispatcher = () => {
    toast.success("Dispatcher reloaded", {
      description: "Routing rules updated on Kamailio",
    });
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
            <h1 className="text-3xl font-bold">Kamailio Routing Rules</h1>
            <p className="text-muted-foreground">
              Configure SIP routing, load balancing, and failover
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={reloadDispatcher} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload Dispatcher
          </Button>
          <Button onClick={() => setAddRuleOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Routing Rule
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <GitBranch className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{routingSets.length}</p>
                <p className="text-sm text-muted-foreground">Routing Sets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {routingSets.reduce((sum, set) => sum + set.backends.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Backend PBXes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {routingSets.reduce(
                    (sum, set) =>
                      sum +
                      set.backends.reduce((s, b) => s + b.calls_active, 0),
                    0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Active Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {routingSets.reduce(
                    (sum, set) =>
                      sum +
                      set.backends.reduce((s, b) => s + b.calls_total, 0),
                    0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routing Sets */}
      <div className="space-y-6">
        {routingSets.map((set) => (
          <Card key={set.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <Network className="h-5 w-5" />
                    {set.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set {set.id} • Extensions: {set.extension_range}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setNewBackend({ ...newBackend, set_id: set.id });
                    setAddBackendOpen(true);
                  }}
                  size="sm"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Backend
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Visual Routing Flow */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-1">Incoming</p>
                    <Badge variant="outline" className="font-mono">
                      {set.extension_range}
                    </Badge>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-2">Routes To:</p>
                    <div className="flex flex-wrap gap-2">
                      {set.backends.map((backend, idx) => (
                        <Badge key={backend.id} variant="default">
                          {backend.name}
                          {backend.priority === 0 ? " (Primary)" : " (Backup)"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Backend List */}
              <div className="space-y-3">
                {set.backends.map((backend) => (
                  <div
                    key={backend.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Server className="h-6 w-6 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium">{backend.name}</p>
                          {getStatusBadge(backend.status)}
                          <Badge variant="outline" className="text-xs">
                            Priority: {backend.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{backend.uri}</span>
                          <span>•</span>
                          <span>{backend.calls_active} active calls</span>
                          <span>•</span>
                          <span>{backend.calls_total} total</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Routing Rule Dialog */}
      <Dialog open={addRuleOpen} onOpenChange={setAddRuleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Routing Rule</DialogTitle>
            <DialogDescription>
              Create a new extension range routing rule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="rule_name">Rule Name *</Label>
              <Input
                id="rule_name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="Customer Service Extensions"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ext_start">Extension Range Start *</Label>
                <Input
                  id="ext_start"
                  value={newRule.extension_range_start}
                  onChange={(e) =>
                    setNewRule({ ...newRule, extension_range_start: e.target.value })
                  }
                  placeholder="1000"
                />
              </div>

              <div>
                <Label htmlFor="ext_end">Extension Range End *</Label>
                <Input
                  id="ext_end"
                  value={newRule.extension_range_end}
                  onChange={(e) =>
                    setNewRule({ ...newRule, extension_range_end: e.target.value })
                  }
                  placeholder="1999"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dest_set">Destination Set</Label>
              <Select
                value={newRule.destination_set}
                onValueChange={(value) =>
                  setNewRule({ ...newRule, destination_set: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Set 1 (Primary PBXes)</SelectItem>
                  <SelectItem value="2">Set 2 (Secondary PBXes)</SelectItem>
                  <SelectItem value="3">Set 3 (Special Purpose)</SelectItem>
                  <SelectItem value="new">Create New Set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Preview:</strong> Extensions {newRule.extension_range_start} to{" "}
                {newRule.extension_range_end} will route to Set {newRule.destination_set}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRuleOpen(false)}>
              Cancel
            </Button>
            <Button>Create Routing Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Backend Dialog */}
      <Dialog open={addBackendOpen} onOpenChange={setAddBackendOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Backend PBX</DialogTitle>
            <DialogDescription>
              Add a PBX server to the routing set
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="backend_name">Backend Name *</Label>
              <Input
                id="backend_name"
                value={newBackend.name}
                onChange={(e) => setNewBackend({ ...newBackend, name: e.target.value })}
                placeholder="FreePBX Production"
              />
            </div>

            <div>
              <Label htmlFor="sip_uri">SIP URI *</Label>
              <Input
                id="sip_uri"
                value={newBackend.sip_uri}
                onChange={(e) => setNewBackend({ ...newBackend, sip_uri: e.target.value })}
                placeholder="sip:192.168.1.100:5061"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: sip:ip:port (use ports other than 5060)
              </p>
            </div>

            <div>
              <Label htmlFor="set_id">Routing Set</Label>
              <Select
                value={newBackend.set_id}
                onValueChange={(value) => setNewBackend({ ...newBackend, set_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Set 1 (Primary)</SelectItem>
                  <SelectItem value="2">Set 2 (Secondary)</SelectItem>
                  <SelectItem value="3">Set 3 (Special)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={newBackend.priority.toString()}
                onValueChange={(value) =>
                  setNewBackend({ ...newBackend, priority: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Primary (highest)</SelectItem>
                  <SelectItem value="1">1 - Backup</SelectItem>
                  <SelectItem value="2">2 - Tertiary</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Lower priority = used first. Same priority = load balanced.
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
              <p className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">
                Routing Preview:
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">Calls to Set {newBackend.set_id}</Badge>
                <ArrowRight className="h-4 w-4" />
                <span className="font-mono text-xs">{newBackend.sip_uri || "..."}</span>
                <Badge variant="default">
                  {newBackend.priority === 0 ? "Primary" : "Backup"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBackendOpen(false)}>
              Cancel
            </Button>
            <Button>Add Backend PBX</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visual Routing Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Routing Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {routingSets.map((set, idx) => (
              <div key={set.id} className="relative">
                {/* Extension Range */}
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 min-w-[200px]">
                    <p className="text-sm font-medium mb-1">Extensions</p>
                    <p className="text-2xl font-bold font-mono">{set.extension_range}</p>
                  </div>

                  <ArrowRight className="h-8 w-8 text-muted-foreground" />

                  {/* Backends */}
                  <div className="flex-1 space-y-2">
                    {set.backends.map((backend, bidx) => (
                      <div key={backend.id} className="flex items-center gap-3">
                        <div
                          className={`flex-1 p-3 rounded-lg border ${
                            backend.priority === 0
                              ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                              : "border-gray-300 bg-gray-50 dark:bg-gray-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant={backend.priority === 0 ? "default" : "outline"}
                                className="text-xs"
                              >
                                {backend.priority === 0 ? "Primary" : `Backup ${backend.priority}`}
                              </Badge>
                              <span className="font-medium">{backend.name}</span>
                              {getStatusBadge(backend.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-mono text-xs">{backend.uri}</span>
                              <Badge variant="outline">
                                {backend.calls_active} active
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection line to next set */}
                {idx < routingSets.length - 1 && (
                  <div className="h-8 flex items-center justify-center">
                    <div className="w-0.5 h-full bg-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Routing Configuration Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Extension Range Routing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Extensions 1000-1999 → Set 1</li>
                <li>• Extensions 2000-2999 → Set 2</li>
                <li>• Use different ranges for tenants/departments</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Load Balancing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Same priority = load balanced</li>
                <li>• Priority 0 = primary (used first)</li>
                <li>• Priority 1+ = backup (failover)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Health Monitoring</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Kamailio pings backends every 30s</li>
                <li>• Offline backends automatically skipped</li>
                <li>• Auto-failover to backup servers</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Always have backup PBXes</li>
                <li>• Use ports 5061+ for backends</li>
                <li>• Monitor backend health regularly</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
