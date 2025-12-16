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
  Phone,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  RefreshCw,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_PHONE_PROVISIONING_API_URL || "http://localhost:8005/api";

export default function PhoneAssignmentsPage() {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    mac_address: "",
    phone_model_id: "yealink-t46s",
    extension: "",
    extension_name: "",
    sip_password: "",
    pbx_server_ip: "",
    pbx_domain: "",
    static_ip: "",
    gateway: "",
    physical_location: "",
    notes: "",
    custom_config: {},
  });

  // Fetch assignments
  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ["phone-assignments"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/provisioning/assignments`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch phone models
  const { data: models } = useQuery({
    queryKey: ["phone-models"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/provisioning/models`);
      if (!response.ok) throw new Error("Failed to fetch models");
      return response.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof newAssignment) => {
      const response = await fetch(`${API_BASE_URL}/provisioning/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create assignment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Phone assignment created and config generated!");
      queryClient.invalidateQueries({ queryKey: ["phone-assignments"] });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to create assignment", { description: error.message });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (mac: string) => {
      const response = await fetch(`${API_BASE_URL}/provisioning/assignments/${mac}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete assignment");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Phone assignment deleted");
      queryClient.invalidateQueries({ queryKey: ["phone-assignments"] });
    },
  });

  // Regenerate config mutation
  const regenerateMutation = useMutation({
    mutationFn: async (mac: string) => {
      const response = await fetch(`${API_BASE_URL}/provisioning/regenerate/${mac}`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to regenerate config");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Config regenerated");
      queryClient.invalidateQueries({ queryKey: ["phone-assignments"] });
    },
  });

  const resetForm = () => {
    setNewAssignment({
      mac_address: "",
      phone_model_id: "yealink-t46s",
      extension: "",
      extension_name: "",
      sip_password: "",
      pbx_server_ip: "",
      pbx_domain: "",
      static_ip: "",
      gateway: "",
      physical_location: "",
      notes: "",
      custom_config: {},
    });
  };

  const copyConfigUrl = (mac: string, vendor: string) => {
    const baseUrl = API_BASE_URL.replace('/api', '');
    const formattedMac = mac.replace(/:/g, '').toLowerCase();
    let filename = `${formattedMac}.cfg`;

    if (vendor === 'yealink') filename = `y${formattedMac}.cfg`;
    else if (vendor === 'grandstream') filename = `cfg${formattedMac}.xml`;
    else if (vendor === 'cisco') filename = `SEP${formattedMac.toUpperCase()}.cnf.xml`;

    const url = `${baseUrl}/configs/${filename}`;
    navigator.clipboard.writeText(url);
    toast.success("Config URL copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Provisioned</Badge>;
      case "pending":
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/phone-provisioning">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Phone Assignments</h1>
            <p className="text-muted-foreground">
              MAC address to extension mappings
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Assignment
          </Button>
        </div>
      </div>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>Phone Assignments ({assignments?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          )}

          {!isLoading && assignments?.items?.length === 0 && (
            <div className="text-center py-12">
              <Phone className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No phone assignments</p>
              <p className="text-muted-foreground mb-6">
                Add your first phone assignment to start auto-provisioning
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Phone Assignment
              </Button>
            </div>
          )}

          {assignments?.items && assignments.items.length > 0 && (
            <div className="space-y-3">
              {assignments.items.map((assignment: any) => (
                <div
                  key={assignment.mac_address}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Phone className="h-8 w-8 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-medium">Ext {assignment.extension}</p>
                        {getStatusBadge(assignment.provisioning_status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assignment.extension_name && (
                          <span>{assignment.extension_name} • </span>
                        )}
                        <span className="font-mono">{assignment.mac_address}</span>
                        {assignment.pbx_server_ip && (
                          <span> → {assignment.pbx_server_ip}</span>
                        )}
                      </div>
                      {assignment.physical_location && (
                        <div className="text-xs text-muted-foreground mt-1">
                          📍 {assignment.physical_location}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyConfigUrl(assignment.mac_address, assignment.vendor)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateMutation.mutate(assignment.mac_address)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(assignment.mac_address)}
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

      {/* Add Assignment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Phone Assignment</DialogTitle>
            <DialogDescription>
              Assign a phone to an extension for auto-provisioning
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="mac">MAC Address *</Label>
              <Input
                id="mac"
                value={newAssignment.mac_address}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, mac_address: e.target.value })
                }
                placeholder="AA:BB:CC:DD:EE:FF"
                pattern="^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$"
              />
            </div>

            <div>
              <Label htmlFor="model">Phone Model *</Label>
              <Select
                value={newAssignment.phone_model_id}
                onValueChange={(value) =>
                  setNewAssignment({ ...newAssignment, phone_model_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models?.items?.map((model: any) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="extension">Extension *</Label>
              <Input
                id="extension"
                value={newAssignment.extension}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, extension: e.target.value })
                }
                placeholder="1001"
              />
            </div>

            <div>
              <Label htmlFor="name">Extension Name</Label>
              <Input
                id="name"
                value={newAssignment.extension_name}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, extension_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="password">SIP Password *</Label>
              <Input
                id="password"
                type="password"
                value={newAssignment.sip_password}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, sip_password: e.target.value })
                }
                placeholder="Secure password"
              />
            </div>

            <div>
              <Label htmlFor="pbx">PBX Server IP *</Label>
              <Input
                id="pbx"
                value={newAssignment.pbx_server_ip}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, pbx_server_ip: e.target.value })
                }
                placeholder="192.168.1.100"
              />
            </div>

            <div>
              <Label htmlFor="static_ip">Static IP (optional)</Label>
              <Input
                id="static_ip"
                value={newAssignment.static_ip}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, static_ip: e.target.value })
                }
                placeholder="192.168.1.201"
              />
            </div>

            <div>
              <Label htmlFor="location">Physical Location</Label>
              <Input
                id="location"
                value={newAssignment.physical_location}
                onChange={(e) =>
                  setNewAssignment({ ...newAssignment, physical_location: e.target.value })
                }
                placeholder="Building A, Floor 2, Desk 23"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(newAssignment)}
              disabled={
                !newAssignment.mac_address ||
                !newAssignment.extension ||
                !newAssignment.sip_password ||
                !newAssignment.pbx_server_ip
              }
            >
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
