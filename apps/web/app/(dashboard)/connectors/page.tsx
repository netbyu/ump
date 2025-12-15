"use client";

import { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TestTube,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useConnectors,
  useProviders,
  useCreateConnector,
  useUpdateConnector,
  useDeleteConnector,
  useTestConnector,
} from "@/hooks/use-connectors";
import type { Connector, ConnectorCreate, Provider } from "@/types";
import { useRouter } from "next/navigation";

function getStatusIcon(isActive: boolean, isVerified: boolean) {
  if (!isActive) return <PowerOff className="w-4 h-4 text-gray-500" />;
  if (isVerified) return <CheckCircle className="w-4 h-4 text-green-500" />;
  return <AlertCircle className="w-4 h-4 text-yellow-500" />;
}

function getStatusText(isActive: boolean, isVerified: boolean): string {
  if (!isActive) return "Inactive";
  if (isVerified) return "Verified";
  return "Unverified";
}

function getStatusBadgeClass(isActive: boolean, isVerified: boolean): string {
  if (!isActive) return "bg-gray-600";
  if (isVerified) return "bg-green-600";
  return "bg-yellow-600";
}

export default function ConnectorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [formData, setFormData] = useState<ConnectorCreate>({
    name: "",
    provider_id: "",
    description: "",
    credentials: {},
  });
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  // Queries
  const { data: connectorsData, isLoading, refetch } = useConnectors();
  const { data: providers = [] } = useProviders();
  const connectors = connectorsData?.items || [];

  // Mutations
  const createMutation = useCreateConnector();
  const updateMutation = useUpdateConnector();
  const deleteMutation = useDeleteConnector();
  const testMutation = useTestConnector();

  // Get unique providers from connectors for filter
  const usedProviders = useMemo(() => {
    const providerIds = new Set(connectors.map((c) => c.provider_id));
    return providers.filter((p) => providerIds.has(p.id));
  }, [connectors, providers]);

  // Filtered connectors
  const filteredConnectors = useMemo(() => {
    return connectors.filter((connector) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !connector.name.toLowerCase().includes(query) &&
          !connector.description?.toLowerCase().includes(query) &&
          !connector.provider_name?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (selectedProvider !== "all" && connector.provider_id !== selectedProvider) {
        return false;
      }
      if (selectedStatus !== "all") {
        if (selectedStatus === "active" && !connector.is_active) return false;
        if (selectedStatus === "verified" && !connector.is_verified) return false;
        if (selectedStatus === "unverified" && (connector.is_verified || !connector.is_active)) return false;
        if (selectedStatus === "inactive" && connector.is_active) return false;
      }
      return true;
    });
  }, [connectors, searchQuery, selectedProvider, selectedStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: connectors.length,
    active: connectors.filter((c) => c.is_active).length,
    verified: connectors.filter((c) => c.is_verified).length,
    unverified: connectors.filter((c) => c.is_active && !c.is_verified).length,
  }), [connectors]);

  // Handlers
  const resetForm = () => {
    setFormData({ name: "", provider_id: "", description: "", credentials: {} });
    setCredentials({});
  };

  const openEditDialog = (connector: Connector) => {
    setSelectedConnector(connector);
    setFormData({
      name: connector.name,
      provider_id: connector.provider_id,
      description: connector.description || "",
      credentials: {},
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (connector: Connector) => {
    setSelectedConnector(connector);
    setIsDeleteDialogOpen(true);
  };

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        ...formData,
        credentials,
      });
      setIsCreateDialogOpen(false);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const handleUpdate = async () => {
    if (!selectedConnector) return;
    try {
      await updateMutation.mutateAsync({
        connectorId: selectedConnector.id,
        connector: {
          name: formData.name,
          description: formData.description,
          ...(Object.keys(credentials).length > 0 && { credentials }),
        },
      });
      setIsEditDialogOpen(false);
      setSelectedConnector(null);
      resetForm();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!selectedConnector) return;
    try {
      await deleteMutation.mutateAsync(selectedConnector.id);
      setIsDeleteDialogOpen(false);
      setSelectedConnector(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleTest = async (connectorId: string) => {
    try {
      await testMutation.mutateAsync(connectorId);
    } catch {
      // Error handled by mutation
    }
  };

  const handleToggleActive = async (connector: Connector) => {
    try {
      await updateMutation.mutateAsync({
        connectorId: connector.id,
        connector: { is_active: !connector.is_active },
      });
    } catch {
      // Error handled by mutation
    }
  };

  // Get selected provider for form
  const selectedProviderForForm = providers.find((p) => p.id === formData.provider_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Connectors</h1>
          <p className="text-gray-400 mt-1">
            Manage your configured provider connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => router.push("/providers")}
            variant="outline"
            size="sm"
          >
            Browse Providers
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Connector
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total Connectors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Power className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
                <p className="text-sm text-gray-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.verified}</p>
                <p className="text-sm text-gray-400">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-600/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.unverified}</p>
                <p className="text-sm text-gray-400">Need Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search connectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {usedProviders.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border border-gray-700 rounded-md p-1">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Table View */}
      {!isLoading && viewMode === "table" && (
        <Card className="bg-gray-800 border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800">
                <TableHead className="text-gray-400">Connector</TableHead>
                <TableHead className="text-gray-400">Provider</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Last Verified</TableHead>
                <TableHead className="text-gray-400 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnectors.map((connector) => (
                <TableRow key={connector.id} className="border-gray-700 hover:bg-gray-750">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {connector.provider_icon_url ? (
                        <img
                          src={connector.provider_icon_url}
                          alt=""
                          className="w-8 h-8 rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-400">
                            {connector.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{connector.name}</p>
                        <p className="text-sm text-gray-400 line-clamp-1">
                          {connector.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {connector.provider_name || connector.provider_id}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeClass(connector.is_active, connector.is_verified)}>
                      {getStatusIcon(connector.is_active, connector.is_verified)}
                      <span className="ml-1">
                        {getStatusText(connector.is_active, connector.is_verified)}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {connector.last_verified_at
                      ? new Date(connector.last_verified_at).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTest(connector.id)}>
                          <TestTube className="w-4 h-4 mr-2" />
                          Test Connection
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(connector)}>
                          {connector.is_active ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(connector)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(connector)}
                          className="text-red-400"
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
        </Card>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredConnectors.map((connector) => (
            <Card key={connector.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  {connector.provider_icon_url ? (
                    <img
                      src={connector.provider_icon_url}
                      alt=""
                      className="w-10 h-10 rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center">
                      <span className="font-bold text-gray-400">
                        {connector.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-white text-base">{connector.name}</CardTitle>
                    <p className="text-sm text-gray-500">
                      {connector.provider_name || connector.provider_id}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleTest(connector.id)}>
                      <TestTube className="w-4 h-4 mr-2" />
                      Test
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(connector)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(connector)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400 line-clamp-2">
                  {connector.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className={getStatusBadgeClass(connector.is_active, connector.is_verified)}>
                    {getStatusIcon(connector.is_active, connector.is_verified)}
                    <span className="ml-1">
                      {getStatusText(connector.is_active, connector.is_verified)}
                    </span>
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {connector.last_verified_at
                      ? `Verified ${new Date(connector.last_verified_at).toLocaleDateString()}`
                      : "Not verified"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredConnectors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No connectors found</p>
          <Button onClick={() => router.push("/providers")} className="bg-blue-600">
            Browse Providers
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedConnector(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Connector" : "Create New Connector"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isEditDialogOpen
                ? "Update the connector configuration"
                : "Create a new connector from a provider"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production Slack"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>

            {!isEditDialogOpen && (
              <div className="space-y-2">
                <Label className="text-gray-300">Provider *</Label>
                <Select
                  value={formData.provider_id}
                  onValueChange={(value) => setFormData({ ...formData, provider_id: value })}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.slice(0, 50).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>

            {/* Credential fields */}
            {(selectedProviderForForm || isEditDialogOpen) && (
              <div className="space-y-2">
                <Label className="text-gray-300">
                  {isEditDialogOpen ? "Update Credentials (optional)" : "Credentials"}
                </Label>
                <Input
                  type="password"
                  value={credentials.api_key || ""}
                  onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })}
                  placeholder="API Key or Token"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={
                !formData.name ||
                (!isEditDialogOpen && !formData.provider_id) ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditDialogOpen ? "Save Changes" : "Create Connector"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Connector</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete &quot;{selectedConnector?.name}&quot;? This
              action cannot be undone and will remove all associated integrations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
