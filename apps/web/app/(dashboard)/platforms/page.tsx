"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Server,
  Search,
  RefreshCw,
  Loader2,
  Layers,
  CheckCircle,
  XCircle,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Play,
  Settings,
  Activity,
  Globe,
  Key,
  Plug,
  AlertCircle,
} from "lucide-react";
import {
  usePlatforms,
  usePlatformTypes,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
  useActivatePlatform,
  useDeactivatePlatform,
  useTestPlatformConnection,
  useSyncPlatform,
} from "@/hooks/use-platforms";
import { useCredentialGroups } from "@/hooks/use-devices";
import { Platform, PlatformCreate, PlatformUpdate, CredentialSource } from "@/types";
import { useToast } from "@/hooks/use-toast";

export default function PlatformsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const { toast } = useToast();

  // Fetch data
  const { data: platforms, isLoading, refetch } = usePlatforms({
    search: searchQuery || undefined,
    is_active: statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
  });
  const { data: platformTypes } = usePlatformTypes();
  const { data: credentialGroups } = useCredentialGroups();

  // Mutations
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();
  const activatePlatform = useActivatePlatform();
  const deactivatePlatform = useDeactivatePlatform();
  const testConnection = useTestPlatformConnection();
  const syncPlatform = useSyncPlatform();

  // Stats
  const stats = {
    total: platforms?.length || 0,
    active: platforms?.filter((p) => p.is_active).length || 0,
    verified: platforms?.filter((p) => p.is_verified).length || 0,
  };

  // Filter platforms
  const filteredPlatforms = platforms?.filter((platform) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      platform.name.toLowerCase().includes(query) ||
      platform.primary_address.toLowerCase().includes(query) ||
      platform.platform_type?.toLowerCase().includes(query) ||
      platform.vendor?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (platformId: number) => {
    if (!confirm("Are you sure you want to delete this platform?")) return;
    try {
      await deletePlatform.mutateAsync(platformId);
      toast({ title: "Platform deleted successfully" });
    } catch {
      toast({ title: "Failed to delete platform", variant: "destructive" });
    }
  };

  const handleToggleActive = async (platform: Platform) => {
    try {
      if (platform.is_active) {
        await deactivatePlatform.mutateAsync(platform.id);
        toast({ title: "Platform deactivated" });
      } else {
        await activatePlatform.mutateAsync(platform.id);
        toast({ title: "Platform activated" });
      }
    } catch {
      toast({ title: "Failed to update platform status", variant: "destructive" });
    }
  };

  const handleTestConnection = async (platformId: number) => {
    try {
      const result = await testConnection.mutateAsync(platformId);
      toast({ title: result.message });
    } catch {
      toast({ title: "Connection test failed", variant: "destructive" });
    }
  };

  const handleSync = async (platformId: number) => {
    try {
      const result = await syncPlatform.mutateAsync(platformId);
      toast({ title: result.message });
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Platforms</h1>
          <p className="text-gray-400">
            Manage external platforms and services for device data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Platform
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Platform</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Configure a new external platform for data integration
                </DialogDescription>
              </DialogHeader>
              <PlatformForm
                platformTypes={platformTypes || []}
                credentialGroups={credentialGroups || []}
                onSubmit={async (data) => {
                  try {
                    await createPlatform.mutateAsync(data);
                    toast({ title: "Platform created successfully" });
                    setIsAddDialogOpen(false);
                  } catch (error) {
                    toast({ title: "Failed to create platform", variant: "destructive" });
                  }
                }}
                isSubmitting={createPlatform.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Platforms</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Layers className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Platforms</p>
                <p className="text-2xl font-bold text-green-400">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Verified</p>
                <p className="text-2xl font-bold text-purple-400">{stats.verified}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all" className="text-gray-200">All Status</SelectItem>
            <SelectItem value="active" className="text-gray-200">Active</SelectItem>
            <SelectItem value="inactive" className="text-gray-200">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Platforms Table */}
      {!isLoading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              Platforms ({filteredPlatforms?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPlatforms && filteredPlatforms.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800">
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Address</TableHead>
                    <TableHead className="text-gray-400">Vendor</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Credentials</TableHead>
                    <TableHead className="text-gray-400">Last Sync</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlatforms.map((platform) => (
                    <TableRow key={platform.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-gray-200 font-medium">
                        <div className="flex items-center gap-2">
                          <Server className="w-4 h-4 text-gray-400" />
                          {platform.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        <Badge variant="secondary" className="bg-gray-700 text-gray-300">
                          {platform.platform_type_name || platform.platform_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 font-mono text-sm">
                        {platform.primary_address}
                        {platform.port && `:${platform.port}`}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {platform.vendor || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {platform.is_active ? (
                            <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-600/20 text-gray-400">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          {platform.is_verified ? (
                            <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        <div className="flex items-center gap-1">
                          {platform.credential_source === "group" ? (
                            <>
                              <Key className="w-3 h-3" />
                              <span className="text-xs">{platform.credential_group_name || "Shared"}</span>
                            </>
                          ) : (
                            <>
                              <Key className="w-3 h-3" />
                              <span className="text-xs">Local</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {platform.last_sync_at
                          ? new Date(platform.last_sync_at).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                            <DropdownMenuItem
                              className="text-gray-200 focus:bg-gray-700"
                              onClick={() => setEditingPlatform(platform)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-gray-200 focus:bg-gray-700"
                              onClick={() => handleTestConnection(platform.id)}
                            >
                              <Plug className="w-4 h-4 mr-2" />
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-gray-200 focus:bg-gray-700"
                              onClick={() => handleSync(platform.id)}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Sync Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem
                              className="text-gray-200 focus:bg-gray-700"
                              onClick={() => handleToggleActive(platform)}
                            >
                              {platform.is_active ? (
                                <>
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem
                              className="text-red-400 focus:bg-gray-700 focus:text-red-400"
                              onClick={() => handleDelete(platform.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Server className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No platforms found</h3>
                <p className="text-gray-500 mb-4">
                  Add external platforms like monitoring systems or management services
                </p>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Platform
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingPlatform && (
        <Dialog open={!!editingPlatform} onOpenChange={() => setEditingPlatform(null)}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Platform</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update platform configuration
              </DialogDescription>
            </DialogHeader>
            <PlatformForm
              platform={editingPlatform}
              platformTypes={platformTypes || []}
              credentialGroups={credentialGroups || []}
              onSubmit={async (data) => {
                try {
                  await updatePlatform.mutateAsync({
                    platformId: editingPlatform.id,
                    platform: data as PlatformUpdate,
                  });
                  toast({ title: "Platform updated successfully" });
                  setEditingPlatform(null);
                } catch {
                  toast({ title: "Failed to update platform", variant: "destructive" });
                }
              }}
              isSubmitting={updatePlatform.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Platform Form Component
function PlatformForm({
  platform,
  platformTypes,
  credentialGroups,
  onSubmit,
  isSubmitting,
}: {
  platform?: Platform;
  platformTypes: { id: number; name: string; display_name: string }[];
  credentialGroups: { id: number; name: string }[];
  onSubmit: (data: PlatformCreate | PlatformUpdate) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<PlatformCreate>({
    name: platform?.name || "",
    platform_type: platform?.platform_type || "monitoring",
    platform_type_id: platform?.platform_type_id,
    primary_address: platform?.primary_address || "",
    port: platform?.port,
    base_path: platform?.base_path,
    provider_id: platform?.provider_id,
    description: platform?.description || "",
    vendor: platform?.vendor || "",
    version: platform?.version || "",
    credential_source: platform?.credential_source || "local",
    credential_group_id: platform?.credential_group_id,
    verify_ssl: platform?.verify_ssl ?? true,
    timeout: platform?.timeout ?? 30,
    is_active: platform?.is_active ?? true,
  });

  const [credentials, setCredentials] = useState<{ username: string; password: string }>({
    username: "",
    password: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: PlatformCreate = {
      ...formData,
    };
    if (formData.credential_source === "local" && credentials.username) {
      data.credentials = credentials;
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Name *</Label>
          <Input
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="e.g., Production Zabbix"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Platform Type</Label>
          <Select
            value={formData.platform_type_id?.toString() || formData.platform_type || "monitoring"}
            onValueChange={(value) => {
              const typeId = parseInt(value);
              if (!isNaN(typeId)) {
                const type = platformTypes.find((t) => t.id === typeId);
                setFormData({
                  ...formData,
                  platform_type_id: typeId,
                  platform_type: type?.name || "monitoring",
                });
              } else {
                setFormData({ ...formData, platform_type: value, platform_type_id: undefined });
              }
            }}
          >
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {platformTypes.length > 0 ? (
                platformTypes.map((type) => (
                  <SelectItem
                    key={type.id}
                    value={type.id.toString()}
                    className="text-gray-200"
                  >
                    {type.display_name}
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="monitoring" className="text-gray-200">Monitoring</SelectItem>
                  <SelectItem value="management" className="text-gray-200">Management</SelectItem>
                  <SelectItem value="telecom" className="text-gray-200">Telecom</SelectItem>
                  <SelectItem value="infrastructure" className="text-gray-200">Infrastructure</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Primary Address *</Label>
          <Input
            required
            value={formData.primary_address}
            onChange={(e) => setFormData({ ...formData, primary_address: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="e.g., https://zabbix.example.com"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Port</Label>
          <Input
            type="number"
            value={formData.port || ""}
            onChange={(e) => setFormData({ ...formData, port: e.target.value ? parseInt(e.target.value) : undefined })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="e.g., 443"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Vendor</Label>
          <Input
            value={formData.vendor || ""}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="e.g., Zabbix"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Version</Label>
          <Input
            value={formData.version || ""}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="e.g., 6.0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-gray-300">Description</Label>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          placeholder="Optional description..."
          rows={2}
        />
      </div>

      {/* Credentials Section */}
      <div className="space-y-4 pt-4 border-t border-gray-700">
        <Label className="text-gray-300 font-medium">Credentials</Label>
        <div className="space-y-2">
          <Label className="text-gray-400 text-sm">Credential Source</Label>
          <Select
            value={formData.credential_source}
            onValueChange={(value) =>
              setFormData({ ...formData, credential_source: value as CredentialSource })
            }
          >
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="local" className="text-gray-200">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Local Credentials
                </div>
              </SelectItem>
              <SelectItem value="group" className="text-gray-200">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Shared Credential Group
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.credential_source === "group" ? (
          <div className="space-y-2">
            <Label className="text-gray-400 text-sm">Credential Group</Label>
            <Select
              value={formData.credential_group_id?.toString() || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, credential_group_id: parseInt(value) })
              }
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select credential group" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {credentialGroups.map((group) => (
                  <SelectItem
                    key={group.id}
                    value={group.id.toString()}
                    className="text-gray-200"
                  >
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Username</Label>
              <Input
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Username"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-400 text-sm">Password</Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Password"
              />
            </div>
          </div>
        )}
      </div>

      {/* Connection Settings */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
        <div className="space-y-2">
          <Label className="text-gray-300">Timeout (seconds)</Label>
          <Input
            type="number"
            value={formData.timeout}
            onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) || 30 })}
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div className="space-y-2 flex items-end">
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={formData.verify_ssl}
              onChange={(e) => setFormData({ ...formData, verify_ssl: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
            />
            Verify SSL Certificate
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : platform ? (
            "Update Platform"
          ) : (
            "Create Platform"
          )}
        </Button>
      </div>
    </form>
  );
}
