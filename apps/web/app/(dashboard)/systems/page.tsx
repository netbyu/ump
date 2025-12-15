"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Server,
  Phone,
  Network,
  HardDrive,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Loader2,
  Layers,
  CheckCircle,
  XCircle,
  Building2,
  Factory,
  SortAsc,
  MapPin,
} from "lucide-react";
import {
  useDevices,
  useDeviceGroups,
} from "@/hooks/use-devices";
import { Device, DeviceGroup } from "@/types";

// Grouping/sorting options
type GroupByOption = "manufacturer" | "device_type" | "location" | "name" | "status";

const GROUP_BY_OPTIONS: { value: GroupByOption; label: string; icon: React.ReactNode }[] = [
  { value: "manufacturer", label: "By Manufacturer", icon: <Factory className="w-4 h-4" /> },
  { value: "device_type", label: "By Device Type", icon: <Layers className="w-4 h-4" /> },
  { value: "location", label: "By Location", icon: <MapPin className="w-4 h-4" /> },
  { value: "name", label: "By Name (A-Z)", icon: <SortAsc className="w-4 h-4" /> },
  { value: "status", label: "By Status", icon: <CheckCircle className="w-4 h-4" /> },
];

// Device type icon mapping
function getDeviceIcon(deviceType: string) {
  switch (deviceType?.toLowerCase()) {
    case "server":
      return <Server className="w-4 h-4" />;
    case "pbx":
      return <Phone className="w-4 h-4" />;
    case "gateway":
      return <Network className="w-4 h-4" />;
    case "phone":
    case "endpoint":
      return <Phone className="w-4 h-4" />;
    default:
      return <HardDrive className="w-4 h-4" />;
  }
}

// Get icon for group based on groupBy type
function getGroupIcon(groupBy: GroupByOption) {
  switch (groupBy) {
    case "manufacturer":
      return <Factory className="w-5 h-5 flex-shrink-0 text-blue-400" />;
    case "device_type":
      return <Layers className="w-5 h-5 flex-shrink-0 text-purple-400" />;
    case "location":
      return <MapPin className="w-5 h-5 flex-shrink-0 text-green-400" />;
    case "status":
      return <CheckCircle className="w-5 h-5 flex-shrink-0 text-yellow-400" />;
    default:
      return <Building2 className="w-5 h-5 flex-shrink-0 text-gray-400" />;
  }
}

// Group node structure
interface GroupNode {
  id: string;
  name: string;
  devices: Device[];
  deviceCount: number;
  activeCount: number;
}

// Build grouped tree from devices based on groupBy option
function buildGroupedTree(devices: Device[], groupBy: GroupByOption): GroupNode[] {
  if (groupBy === "name") {
    // No grouping, just return a single flat list sorted by name
    const sortedDevices = [...devices].sort((a, b) =>
      a.device_name.localeCompare(b.device_name)
    );
    return [{
      id: "all-devices",
      name: "All Devices",
      devices: sortedDevices,
      deviceCount: sortedDevices.length,
      activeCount: sortedDevices.filter(d => d.is_active).length,
    }];
  }

  const groupMap = new Map<string, Device[]>();

  // Group devices based on the selected option
  devices.forEach((device) => {
    let groupKey: string;

    switch (groupBy) {
      case "manufacturer":
        groupKey = device.manufacturer_name || device.manufacturer || "Unknown";
        break;
      case "device_type":
        groupKey = device.device_type_name || device.device_type || "Unknown";
        break;
      case "location":
        groupKey = device.location_name || "No Location";
        break;
      case "status":
        groupKey = device.is_active ? "Active" : "Inactive";
        break;
      default:
        groupKey = "Unknown";
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(device);
  });

  // Convert to array of GroupNodes
  const nodes: GroupNode[] = [];
  groupMap.forEach((deviceList, name) => {
    nodes.push({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      devices: deviceList.sort((a, b) => a.device_name.localeCompare(b.device_name)),
      deviceCount: deviceList.length,
      activeCount: deviceList.filter((d) => d.is_active).length,
    });
  });

  // Sort groups
  nodes.sort((a, b) => {
    // Put "Unknown", "No Location", "Inactive" at the end
    const endNames = ["Unknown", "No Location", "Inactive"];
    if (endNames.includes(a.name) && !endNames.includes(b.name)) return 1;
    if (!endNames.includes(a.name) && endNames.includes(b.name)) return -1;

    // For status grouping, put Active before Inactive
    if (groupBy === "status") {
      if (a.name === "Active") return -1;
      if (b.name === "Active") return 1;
    }

    return a.name.localeCompare(b.name);
  });

  return nodes;
}

// Group tree node component
function GroupTreeNode({
  group,
  groupBy,
  searchQuery,
  expandedGroups,
  toggleGroup,
}: {
  group: GroupNode;
  groupBy: GroupByOption;
  searchQuery: string;
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
}) {
  const isExpanded = expandedGroups.has(group.id);
  const isFlatList = groupBy === "name";

  // Filter devices by search
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return group.devices;
    const query = searchQuery.toLowerCase();
    return group.devices.filter(
      (d) =>
        d.device_name.toLowerCase().includes(query) ||
        d.primary_address.toLowerCase().includes(query) ||
        d.device_type?.toLowerCase().includes(query) ||
        d.model?.toLowerCase().includes(query) ||
        d.manufacturer?.toLowerCase().includes(query)
    );
  }, [group.devices, searchQuery]);

  // Don't render if no devices match search
  if (searchQuery && filteredDevices.length === 0) return null;

  // For flat list (sorted by name), show devices directly without collapsible
  if (isFlatList) {
    return (
      <div className="space-y-1">
        {filteredDevices.map((device) => (
          <DeviceRow key={device.id} device={device} groupBy={groupBy} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center gap-2 px-3 py-3 rounded-lg transition-colors hover:bg-gray-700/50 text-left bg-gray-800/80"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            {getGroupIcon(groupBy)}
            <span className="text-white font-medium flex-1">{group.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-600/20 text-green-400 text-xs">
                {group.activeCount} active
              </Badge>
              <Badge variant="secondary" className="bg-gray-700 text-gray-300 text-xs">
                {group.deviceCount} total
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-1 mt-1 ml-6 border-l border-gray-700 pl-4">
            {filteredDevices.map((device) => (
              <DeviceRow key={device.id} device={device} groupBy={groupBy} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Device row component
function DeviceRow({ device, groupBy }: { device: Device; groupBy: GroupByOption }) {
  // Show different secondary info based on what we're NOT grouping by
  const getSecondaryInfo = () => {
    const infoParts: string[] = [];

    if (groupBy !== "manufacturer" && (device.manufacturer_name || device.manufacturer)) {
      infoParts.push(device.manufacturer_name || device.manufacturer || "");
    }
    if (groupBy !== "device_type") {
      infoParts.push(device.device_type_name || device.device_type);
    }
    if (groupBy !== "location" && device.location_name) {
      infoParts.push(device.location_name);
    }

    return infoParts.filter(Boolean).join(" • ");
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/30 transition-colors">
      <div className="text-gray-400">{getDeviceIcon(device.device_type)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200 font-medium truncate">
            {device.device_name}
          </span>
          {groupBy === "name" && (
            <Badge
              variant="secondary"
              className="bg-gray-700 text-gray-400 text-xs"
            >
              {device.device_type}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="font-mono">{device.primary_address}</span>
          {device.model && <span>Model: {device.model}</span>}
          {getSecondaryInfo() && <span>{getSecondaryInfo()}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {device.is_active ? (
          <CheckCircle className="w-4 h-4 text-green-500" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-500" />
        )}
      </div>
    </div>
  );
}

export default function SystemsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByOption>("manufacturer");

  // Fetch data
  const { data: devices, isLoading: devicesLoading, refetch: refetchDevices } = useDevices();
  const { data: groups, isLoading: groupsLoading, refetch: refetchGroups } = useDeviceGroups();

  const isLoading = devicesLoading || groupsLoading;

  // Build grouped tree based on selected option
  const groupedTree = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    return buildGroupedTree(devices, groupBy);
  }, [devices, groupBy]);

  // Stats
  const stats = useMemo(() => {
    const deviceList = devices || [];
    const manufacturerCount = new Set(deviceList.map((d) => d.manufacturer_name || d.manufacturer || "Unknown")).size;
    const typeCount = new Set(deviceList.map((d) => d.device_type_name || d.device_type || "Unknown")).size;
    return {
      totalDevices: deviceList.length,
      activeDevices: deviceList.filter((d) => d.is_active).length,
      groupCount: groupBy === "manufacturer" ? manufacturerCount :
                  groupBy === "device_type" ? typeCount :
                  groupBy === "location" ? new Set(deviceList.map(d => d.location_name || "No Location")).size :
                  groupBy === "status" ? 2 : 1,
    };
  }, [devices, groupBy]);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Expand all groups
  const expandAll = () => {
    setExpandedGroups(new Set(groupedTree.map((g) => g.id)));
  };

  // Collapse all groups
  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleRefresh = () => {
    refetchDevices();
    refetchGroups();
  };

  // Get stats label based on groupBy
  const getStatsLabel = () => {
    switch (groupBy) {
      case "manufacturer": return "Manufacturers";
      case "device_type": return "Device Types";
      case "location": return "Locations";
      case "status": return "Status Groups";
      default: return "Groups";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Systems</h1>
          <p className="text-gray-400">
            View and organize devices by different criteria
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            disabled={groupBy === "name"}
            className="border-gray-700 text-gray-300"
          >
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            disabled={groupBy === "name"}
            className="border-gray-700 text-gray-300"
          >
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Devices</p>
                <p className="text-2xl font-bold text-white">{stats.totalDevices}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Devices</p>
                <p className="text-2xl font-bold text-green-400">{stats.activeDevices}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{getStatsLabel()}</p>
                <p className="text-2xl font-bold text-purple-400">{stats.groupCount}</p>
              </div>
              {getGroupIcon(groupBy)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Group By */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search devices by name, address, type, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Group by:</span>
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
            <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {GROUP_BY_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-gray-200 focus:bg-gray-700 focus:text-white"
                >
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Grouped Tree View */}
      {!isLoading && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              {groupBy === "name" ? "All Devices (Sorted by Name)" : `Systems ${GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedTree.length > 0 ? (
              <div className="space-y-2">
                {groupedTree.map((group) => (
                  <GroupTreeNode
                    key={group.id}
                    group={group}
                    groupBy={groupBy}
                    searchQuery={searchQuery}
                    expandedGroups={expandedGroups}
                    toggleGroup={toggleGroup}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Layers className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400">No devices found</h3>
                <p className="text-gray-500">
                  Devices will appear here once added to the system
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
