"use client";

import { useState, useMemo } from "react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Server,
  Phone,
  Monitor,
  Network,
  HardDrive,
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  MapPin,
  CheckCircle,
  XCircle,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  useDevices,
  useDeviceTypes,
  useDeviceManufacturers,
  useDeviceLocations,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
  useActivateDevice,
  useDeactivateDevice,
} from "@/hooks/use-devices";
import { Device, DeviceCreate, DeviceFilters, DeviceCategory } from "@/types";

// Mock data for when API is not available
const MOCK_DEVICES: Device[] = [
  {
    id: 1,
    uuid: "d1a2b3c4-e5f6-7890-abcd-ef1234567890",
    device_name: "Primary PBX Server",
    device_type: "pbx",
    primary_address: "192.168.1.10",
    location_id: 1,
    manufacturer: "Avaya",
    model: "Aura CM 8.1",
    serial_number: "AV-2024-001",
    firmware_version: "8.1.3.2",
    mac_address: "00:1A:2B:3C:4D:5E",
    is_active: true,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    location_info: { id: 1, uuid: "loc-1", name: "Main Office", code: "HQ", is_active: true },
  },
  {
    id: 2,
    uuid: "a1b2c3d4-e5f6-7890-abcd-ef0987654321",
    device_name: "Session Manager",
    device_type: "server",
    primary_address: "192.168.1.11",
    location_id: 2,
    manufacturer: "Avaya",
    model: "Session Manager 8.1",
    serial_number: "AV-2024-002",
    firmware_version: "8.1.3.0",
    mac_address: "00:1A:2B:3C:4D:5F",
    is_active: true,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-20T15:30:00Z",
    location_info: { id: 2, uuid: "loc-2", name: "Data Center", code: "DC1", is_active: true },
  },
  {
    id: 3,
    uuid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    device_name: "Media Gateway 1",
    device_type: "gateway",
    primary_address: "192.168.1.20",
    location_id: 1,
    manufacturer: "Avaya",
    model: "G450",
    serial_number: "AV-2024-003",
    firmware_version: "38.2.0",
    mac_address: "00:1A:2B:3C:4D:60",
    is_active: true,
    created_at: "2024-01-16T09:00:00Z",
    updated_at: "2024-01-18T11:00:00Z",
    location_info: { id: 1, uuid: "loc-1", name: "Main Office", code: "HQ", is_active: true },
  },
  {
    id: 4,
    uuid: "c3d4e5f6-a7b8-9012-cdef-234567890123",
    device_name: "SIP Trunk Gateway",
    device_type: "gateway",
    primary_address: "192.168.1.21",
    location_id: 2,
    manufacturer: "Cisco",
    model: "CUBE",
    serial_number: "CS-2024-001",
    firmware_version: "17.3.4",
    mac_address: "00:1B:2C:3D:4E:61",
    is_active: true,
    created_at: "2024-01-17T14:00:00Z",
    updated_at: "2024-01-19T16:00:00Z",
    location_info: { id: 2, uuid: "loc-2", name: "Data Center", code: "DC1", is_active: true },
  },
  {
    id: 5,
    uuid: "d4e5f6a7-b8c9-0123-def0-345678901234",
    device_name: "Asterisk Dev Server",
    device_type: "pbx",
    primary_address: "192.168.1.30",
    location_id: 3,
    manufacturer: "Sangoma",
    model: "FreePBX Distro",
    serial_number: "SG-2024-001",
    firmware_version: "16.0.33",
    is_active: false,
    created_at: "2024-01-18T11:00:00Z",
    updated_at: "2024-01-20T09:00:00Z",
    location_info: { id: 3, uuid: "loc-3", name: "Branch Office", code: "BR1", is_active: true },
  },
];

const MOCK_DEVICE_TYPES = [
  { id: 1, name: "server", display_name: "Server", category: "server" as DeviceCategory, is_active: true, display_order: 1 },
  { id: 2, name: "pbx", display_name: "PBX", category: "telephony" as DeviceCategory, is_active: true, display_order: 2 },
  { id: 3, name: "gateway", display_name: "Gateway", category: "telephony" as DeviceCategory, is_active: true, display_order: 3 },
  { id: 4, name: "phone", display_name: "IP Phone", category: "endpoint" as DeviceCategory, is_active: true, display_order: 4 },
  { id: 5, name: "switch", display_name: "Network Switch", category: "network" as DeviceCategory, is_active: true, display_order: 5 },
];

const MOCK_MANUFACTURERS = [
  { id: 1, name: "avaya", display_name: "Avaya", is_active: true, display_order: 1 },
  { id: 2, name: "cisco", display_name: "Cisco", is_active: true, display_order: 2 },
  { id: 3, name: "sangoma", display_name: "Sangoma", is_active: true, display_order: 3 },
  { id: 4, name: "microsoft", display_name: "Microsoft", is_active: true, display_order: 4 },
];

const MOCK_LOCATIONS = [
  { id: 1, uuid: "loc-1", name: "Main Office", code: "HQ", is_active: true },
  { id: 2, uuid: "loc-2", name: "Data Center", code: "DC1", is_active: true },
  { id: 3, uuid: "loc-3", name: "Branch Office", code: "BR1", is_active: true },
];

// Device type icon mapping
function getDeviceIcon(deviceType: string) {
  switch (deviceType?.toLowerCase()) {
    case "server":
      return <Server className="w-5 h-5" />;
    case "pbx":
      return <Phone className="w-5 h-5" />;
    case "gateway":
      return <Network className="w-5 h-5" />;
    case "phone":
    case "endpoint":
      return <Monitor className="w-5 h-5" />;
    case "switch":
    case "router":
      return <Network className="w-5 h-5" />;
    default:
      return <HardDrive className="w-5 h-5" />;
  }
}

// Category color mapping
function getCategoryColor(category: string): string {
  switch (category?.toLowerCase()) {
    case "server":
      return "bg-blue-600";
    case "telephony":
      return "bg-green-600";
    case "endpoint":
      return "bg-purple-600";
    case "network":
      return "bg-orange-600";
    default:
      return "bg-gray-600";
  }
}

export default function DevicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [formData, setFormData] = useState<DeviceCreate>({
    device_name: "",
    device_type: "server",
    primary_address: "",
    location_id: undefined,
    manufacturer: "",
    model: "",
    serial_number: "",
    firmware_version: "",
    mac_address: "",
    description: "",
    is_active: true,
    has_vip: false,
    vip_address: "",
  });

  // Build filters
  const filters: DeviceFilters = useMemo(() => ({
    device_type: selectedType !== "all" ? selectedType : undefined,
    is_active: selectedStatus === "active" ? true : selectedStatus === "inactive" ? false : undefined,
    search: searchQuery || undefined,
  }), [selectedType, selectedStatus, searchQuery]);

  // Fetch data
  const { data: devicesData, isLoading, error, refetch } = useDevices(filters);
  const { data: deviceTypesData } = useDeviceTypes();
  const { data: manufacturersData } = useDeviceManufacturers();
  const { data: locationsData } = useDeviceLocations();

  // Use mock data if API fails
  const devices = devicesData || MOCK_DEVICES;
  const deviceTypes = deviceTypesData || MOCK_DEVICE_TYPES;
  const manufacturers = manufacturersData || MOCK_MANUFACTURERS;
  const locations = locationsData || MOCK_LOCATIONS;

  // Mutations
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const deleteMutation = useDeleteDevice();
  const activateMutation = useActivateDevice();
  const deactivateMutation = useDeactivateDevice();

  // Filter devices locally for additional filtering
  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          device.device_name.toLowerCase().includes(query) ||
          device.primary_address.toLowerCase().includes(query) ||
          device.manufacturer?.toLowerCase().includes(query) ||
          device.model?.toLowerCase().includes(query) ||
          device.serial_number?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (selectedType !== "all" && device.device_type !== selectedType) {
        return false;
      }
      if (selectedStatus === "active" && !device.is_active) return false;
      if (selectedStatus === "inactive" && device.is_active) return false;
      return true;
    });
  }, [devices, searchQuery, selectedType, selectedStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: devices.length,
    active: devices.filter((d) => d.is_active).length,
    inactive: devices.filter((d) => !d.is_active).length,
    byType: deviceTypes.reduce((acc, type) => {
      acc[type.name] = devices.filter((d) => d.device_type === type.name).length;
      return acc;
    }, {} as Record<string, number>),
  }), [devices, deviceTypes]);

  // Handlers
  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Failed to create device:", err);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDevice) return;
    try {
      await updateMutation.mutateAsync({
        deviceId: selectedDevice.id,
        device: formData,
      });
      setIsEditDialogOpen(false);
      setSelectedDevice(null);
      resetForm();
    } catch (err) {
      console.error("Failed to update device:", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return;
    try {
      await deleteMutation.mutateAsync(selectedDevice.id);
      setIsDeleteDialogOpen(false);
      setSelectedDevice(null);
    } catch (err) {
      console.error("Failed to delete device:", err);
    }
  };

  const handleToggleStatus = async (device: Device) => {
    try {
      if (device.is_active) {
        await deactivateMutation.mutateAsync(device.id);
      } else {
        await activateMutation.mutateAsync(device.id);
      }
    } catch (err) {
      console.error("Failed to toggle device status:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      device_name: "",
      device_type: "server",
      primary_address: "",
      location_id: undefined,
      manufacturer: "",
      model: "",
      serial_number: "",
      firmware_version: "",
      mac_address: "",
      description: "",
      is_active: true,
      has_vip: false,
      vip_address: "",
    });
  };

  const openEditDialog = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      device_name: device.device_name,
      device_type: device.device_type,
      primary_address: device.primary_address,
      location_id: device.location_id,
      manufacturer: device.manufacturer || "",
      model: device.model || "",
      serial_number: device.serial_number || "",
      firmware_version: device.firmware_version || "",
      mac_address: device.mac_address || "",
      description: device.description || "",
      is_active: device.is_active,
      has_vip: device.has_vip || false,
      vip_address: device.vip_address || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (device: Device) => {
    setSelectedDevice(device);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Device Management</h1>
          <p className="text-gray-400">
            Manage servers, PBX systems, gateways, and network devices
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
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Devices</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active</p>
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
                <p className="text-sm text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-gray-400">{stats.inactive}</p>
              </div>
              <XCircle className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">PBX Systems</p>
                <p className="text-2xl font-bold text-purple-400">{stats.byType["pbx"] || 0}</p>
              </div>
              <Phone className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Device Type" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Types</SelectItem>
            {deviceTypes.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[150px] bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 border border-gray-700 rounded-md p-1">
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 w-8 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 w-8 p-0"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Table View */}
      {!isLoading && viewMode === "table" && (
        <Card className="bg-gray-800 border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800">
                <TableHead className="text-gray-400">Device</TableHead>
                <TableHead className="text-gray-400">Manufacturer</TableHead>
                <TableHead className="text-gray-400">Model</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400">Address</TableHead>
                <TableHead className="text-gray-400">Location</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device) => (
                <TableRow key={device.id} className="border-gray-700 hover:bg-gray-750">
                  <TableCell className="text-white font-medium">
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(device.device_type)}
                      {device.device_name}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{device.manufacturer || "-"}</TableCell>
                  <TableCell className="text-gray-300">{device.model || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${getCategoryColor(device.device_type)} text-white`}
                    >
                      {device.device_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 font-mono text-sm">
                    {device.primary_address}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {(device.location_name || device.location_info) ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span>{device.location_name || device.location_info?.name}</span>
                        {device.location_info?.code && (
                          <span className="text-xs text-gray-500">({device.location_info.code})</span>
                        )}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {device.is_active ? (
                      <Badge className="bg-green-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem
                          onClick={() => openEditDialog(device)}
                          className="text-gray-300"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(device)}
                          className="text-gray-300"
                        >
                          {device.is_active ? (
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
                        <DropdownMenuSeparator className="bg-gray-700" />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(device)}
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
              {filteredDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                    No devices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device) => (
            <Card key={device.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  {getDeviceIcon(device.device_type)}
                  {device.device_name}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                    <DropdownMenuItem onClick={() => openEditDialog(device)} className="text-gray-300">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(device)} className="text-gray-300">
                      {device.is_active ? (
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
                    <DropdownMenuSeparator className="bg-gray-700" />
                    <DropdownMenuItem onClick={() => openDeleteDialog(device)} className="text-red-400">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={`${getCategoryColor(device.device_type)} text-white`}
                    >
                      {device.device_type}
                    </Badge>
                    {device.is_active ? (
                      <Badge className="bg-green-600 text-white">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 space-y-1 mt-3">
                    <p className="font-mono text-gray-300">{device.primary_address}</p>
                    {device.mac_address && (
                      <p className="font-mono text-xs text-gray-500">MAC: {device.mac_address}</p>
                    )}
                    {(device.location_name || device.location_info) && (
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {device.location_name || device.location_info?.name}
                        {device.location_info?.code && (
                          <span className="text-xs">({device.location_info.code})</span>
                        )}
                      </p>
                    )}
                    {device.manufacturer && (
                      <p>
                        {device.manufacturer}
                        {device.model && ` - ${device.model}`}
                      </p>
                    )}
                    {device.serial_number && (
                      <p className="text-xs">S/N: {device.serial_number}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredDevices.length === 0 && (
            <div className="col-span-full text-center py-12">
              <HardDrive className="w-12 h-12 mx-auto text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-400">No devices found</h3>
              <p className="text-gray-500">Try adjusting your filters or add a new device</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
            setSelectedDevice(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? "Edit Device" : "Add New Device"}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {isEditDialogOpen
                ? "Update the device information below."
                : "Enter the device details to add it to the system."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Device Name *</Label>
                <Input
                  value={formData.device_name}
                  onChange={(e) =>
                    setFormData({ ...formData, device_name: e.target.value })
                  }
                  placeholder="e.g., Primary PBX Server"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Device Type *</Label>
                <Select
                  value={formData.device_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, device_type: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {deviceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Primary Address (IP/Hostname) *</Label>
                <Input
                  value={formData.primary_address}
                  onChange={(e) =>
                    setFormData({ ...formData, primary_address: e.target.value })
                  }
                  placeholder="e.g., 192.168.1.10 or pbx.example.com"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">MAC Address</Label>
                <Input
                  value={formData.mac_address || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, mac_address: e.target.value })
                  }
                  placeholder="e.g., 00:1A:2B:3C:4D:5E"
                  className="bg-gray-700 border-gray-600 text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_vip"
                  checked={formData.has_vip || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      has_vip: checked as boolean,
                      vip_address: checked ? formData.vip_address : ""
                    })
                  }
                />
                <Label htmlFor="has_vip" className="text-gray-300 cursor-pointer">
                  Has Virtual IP (VIP)
                </Label>
              </div>
              {formData.has_vip && (
                <div className="space-y-2 ml-6">
                  <Label className="text-gray-300">VIP Address</Label>
                  <Input
                    value={formData.vip_address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, vip_address: e.target.value })
                    }
                    placeholder="e.g., 192.168.1.100"
                    className="bg-gray-700 border-gray-600 text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Location</Label>
                <Select
                  value={formData.location_id?.toString() || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, location_id: value === "none" ? undefined : parseInt(value) })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700 max-h-60 overflow-y-auto">
                    <SelectItem value="none">No location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name} {loc.code && `(${loc.code})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Manufacturer</Label>
                <Select
                  value={formData.manufacturer || ""}
                  onValueChange={(value) =>
                    setFormData({ ...formData, manufacturer: value })
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {manufacturers.map((mfr) => (
                      <SelectItem key={mfr.id} value={mfr.display_name}>
                        {mfr.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Model</Label>
                <Input
                  value={formData.model || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, model: e.target.value })
                  }
                  placeholder="e.g., Aura CM 8.1"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Serial Number</Label>
                <Input
                  value={formData.serial_number || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, serial_number: e.target.value })
                  }
                  placeholder="e.g., AV-2024-001"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Firmware Version</Label>
                <Input
                  value={formData.firmware_version || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, firmware_version: e.target.value })
                  }
                  placeholder="e.g., 8.1.3.2"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Input
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleUpdate : handleCreate}
              disabled={
                !formData.device_name ||
                !formData.primary_address ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isEditDialogOpen ? "Save Changes" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription className="text-gray-400">
              Are you sure you want to delete "{selectedDevice?.device_name}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-gray-600 text-gray-300"
            >
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
