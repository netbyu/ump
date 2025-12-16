"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Users,
  Key,
  Activity,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  LayoutDashboard,
  Phone,
  Workflow,
  Bot,
  Lock,
  Check,
  X,
  Cable,
  Plug,
  Info,
  Zap,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFeatureFlags, FeatureConfig, IntegrationFeatureMapping } from "@/contexts/feature-flags-context";

// Category display info
const categoryInfo: Record<
  FeatureConfig["category"],
  { label: string; icon: React.ReactNode; color: string }
> = {
  core: { label: "Core", icon: <LayoutDashboard className="w-4 h-4" />, color: "bg-blue-600" },
  telephony: { label: "Telephony", icon: <Phone className="w-4 h-4" />, color: "bg-green-600" },
  automation: { label: "Automation", icon: <Workflow className="w-4 h-4" />, color: "bg-purple-600" },
  ai: { label: "AI", icon: <Bot className="w-4 h-4" />, color: "bg-orange-600" },
  "unified-communication": { label: "Unified Communication", icon: <Phone className="w-4 h-4" />, color: "bg-cyan-600" },
  admin: { label: "Admin", icon: <Shield className="w-4 h-4" />, color: "bg-red-600" },
};

// Core features that cannot be disabled
const LOCKED_FEATURES = ["dashboard", "admin", "settings"];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const {
    features,
    isFeatureEnabled,
    toggleFeature,
    setFeatureEnabled,
    resetToDefaults,
    getFeaturesByCategory,
    enabledCount,
    totalCount,
    // Integration-based features
    integrationMappings,
    setIntegrationMappings,
    activeProviderIds,
    setActiveProviderIds,
    addActiveProvider,
    removeActiveProvider,
    integrationModeEnabled,
    setIntegrationModeEnabled,
    getIntegrationEnabledFeatures,
  } = useFeatureFlags();

  // Active providers are managed via the Integration Mode UI (manual add/remove)
  // In the future, this could be populated automatically by scanning device integrations
  const integrationEnabledFeatures = getIntegrationEnabledFeatures();

  // Group features by category
  const featuresByCategory = {
    core: getFeaturesByCategory("core"),
    telephony: getFeaturesByCategory("telephony"),
    automation: getFeaturesByCategory("automation"),
    ai: getFeaturesByCategory("ai"),
    "unified-communication": getFeaturesByCategory("unified-communication"),
    admin: getFeaturesByCategory("admin"),
  };

  const handleEnableAll = () => {
    Object.keys(features).forEach((id) => {
      setFeatureEnabled(id, true);
    });
  };

  const handleDisableNonCore = () => {
    Object.entries(features).forEach(([id, config]) => {
      if (!LOCKED_FEATURES.includes(id)) {
        setFeatureEnabled(id, false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400">System administration and feature management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gray-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="features" className="data-[state=active]:bg-gray-700">
            Feature Management
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-gray-700">
            Integration Mode
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-gray-700">
            Users
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-gray-700">
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                <Users className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">156</div>
                <p className="text-xs text-gray-500">+12 this month</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">42</div>
                <p className="text-xs text-gray-500">Currently online</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Features Enabled</CardTitle>
                <ToggleRight className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {enabledCount}/{totalCount}
                </div>
                <p className="text-xs text-gray-500">Active features</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">API Keys</CardTitle>
                <Key className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">8</div>
                <p className="text-xs text-gray-500">Active keys</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-700"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Manage Roles
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-700"
                  onClick={() => setActiveTab("features")}
                >
                  <ToggleRight className="w-4 h-4 mr-2" />
                  Manage Features
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-green-400" />
                    <div>
                      <p className="text-sm text-gray-300">User john.doe created</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-blue-400" />
                    <div>
                      <p className="text-sm text-gray-300">Feature "IVR" disabled</p>
                      <p className="text-xs text-gray-500">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 mt-2 rounded-full bg-yellow-400" />
                    <div>
                      <p className="text-sm text-gray-300">API key regenerated</p>
                      <p className="text-xs text-gray-500">Yesterday</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feature Management Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Sidebar Menu Features</CardTitle>
                  <CardDescription className="text-gray-400">
                    Enable or disable menu items in the sidebar navigation. Disabled features will
                    be hidden from all users.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnableAll}
                    className="border-gray-700 text-gray-300"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Enable All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisableNonCore}
                    className="border-gray-700 text-gray-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Disable Non-Core
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset Defaults
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-800 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Reset to Defaults?</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                          This will reset all feature toggles to their default state (all enabled).
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-700 text-gray-300 border-gray-600">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={resetToDefaults}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(Object.keys(featuresByCategory) as FeatureConfig["category"][]).map((category) => {
                  const info = categoryInfo[category];
                  const categoryFeatures = featuresByCategory[category];
                  if (categoryFeatures.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${info.color} text-white`}>
                          {info.icon}
                          <span className="ml-1">{info.label}</span>
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {categoryFeatures.filter((f) => f.enabled).length}/
                          {categoryFeatures.length} enabled
                        </span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-700 hover:bg-transparent">
                            <TableHead className="text-gray-400">Feature</TableHead>
                            <TableHead className="text-gray-400">Description</TableHead>
                            <TableHead className="text-gray-400 w-[100px] text-center">
                              Status
                            </TableHead>
                            <TableHead className="text-gray-400 w-[100px] text-center">
                              Toggle
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryFeatures.map((feature) => {
                            const isLocked = LOCKED_FEATURES.includes(feature.id);
                            return (
                              <TableRow key={feature.id} className="border-gray-700">
                                <TableCell className="text-white font-medium">
                                  <div className="flex items-center gap-2">
                                    {feature.name}
                                    {isLocked && (
                                      <span title="Core feature">
                                        <Lock className="w-3 h-3 text-gray-500" />
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-400 text-sm">
                                  {feature.description}
                                </TableCell>
                                <TableCell className="text-center">
                                  {feature.enabled ? (
                                    <Badge className="bg-green-600 text-white">Enabled</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-gray-600 text-gray-300">
                                      Disabled
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <Switch
                                    checked={feature.enabled}
                                    onCheckedChange={() => toggleFeature(feature.id)}
                                    disabled={isLocked}
                                    className="data-[state=checked]:bg-green-600"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Feature Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Enabled Features</p>
                    <p className="text-2xl font-bold text-green-400">{enabledCount}</p>
                  </div>
                  <ToggleRight className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Disabled Features</p>
                    <p className="text-2xl font-bold text-gray-400">{totalCount - enabledCount}</p>
                  </div>
                  <ToggleLeft className="w-8 h-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Core Features</p>
                    <p className="text-2xl font-bold text-blue-400">{LOCKED_FEATURES.length}</p>
                  </div>
                  <Lock className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integration Mode Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* Integration Mode Toggle */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Cable className="w-5 h-5" />
                    Dynamic Sidebar Mode
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    When enabled, sidebar menu items will automatically show/hide based on your
                    configured integrations. For example, "Monitoring" menu only appears if you
                    have Zabbix or Prometheus integrated.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {integrationModeEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <Switch
                    checked={integrationModeEnabled}
                    onCheckedChange={setIntegrationModeEnabled}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>
            </CardHeader>
            {integrationModeEnabled && (
              <CardContent className="border-t border-gray-700 pt-4">
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-blue-300 font-medium">How it works:</p>
                      <ul className="text-blue-200/80 mt-2 space-y-1 list-disc list-inside">
                        <li>Features with <Badge className="bg-purple-600/30 text-purple-300 mx-1 text-xs">Requires Integration</Badge> will only show when a matching provider is configured</li>
                        <li>Add a Zabbix integration to your nodes → Monitoring menu appears</li>
                        <li>Add a FreePBX integration → Phone Systems, Call Reports, IVR menus appear</li>
                        <li>Core features (Dashboard, Admin, Settings) are always visible</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Active Integrations Detected */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plug className="w-5 h-5" />
                Detected Integrations
              </CardTitle>
              <CardDescription className="text-gray-400">
                Provider integrations found in your configured nodes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeProviderIds.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Cable className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No integrations detected</p>
                  <p className="text-sm mt-1">Configure integrations on your nodes to enable features</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeProviderIds.map((providerId) => (
                    <Badge
                      key={providerId}
                      className="bg-green-600/20 text-green-400 text-sm px-3 py-1"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {providerId}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Manually add provider for testing */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <Label className="text-gray-400 text-sm">Manually add provider (for testing):</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="manual-provider"
                    placeholder="e.g., zabbix, freepbx, temporal"
                    className="bg-gray-700 border-gray-600 text-white flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          addActiveProvider(input.value.trim().toLowerCase());
                          input.value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-600"
                    onClick={() => {
                      const input = document.getElementById("manual-provider") as HTMLInputElement;
                      if (input?.value.trim()) {
                        addActiveProvider(input.value.trim().toLowerCase());
                        input.value = "";
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Integration-Feature Mappings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Integration → Feature Mappings
              </CardTitle>
              <CardDescription className="text-gray-400">
                Configure which integrations enable which sidebar features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400">Integration Type</TableHead>
                    <TableHead className="text-gray-400">Matching Providers</TableHead>
                    <TableHead className="text-gray-400">Enables Features</TableHead>
                    <TableHead className="text-gray-400 w-[100px] text-center">Active</TableHead>
                    <TableHead className="text-gray-400 w-[80px] text-center">Enable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrationMappings.map((mapping) => {
                    // Check if this mapping has any active providers
                    const hasActiveProvider = activeProviderIds.some(
                      (pid) =>
                        mapping.providerIds.includes(pid) ||
                        mapping.providerCategories.some((cat) => pid.includes(cat))
                    );

                    return (
                      <TableRow key={mapping.id} className="border-gray-700">
                        <TableCell className="text-white font-medium">
                          <div>
                            {mapping.name}
                            <p className="text-xs text-gray-500 mt-0.5">{mapping.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {mapping.providerIds.slice(0, 4).map((pid) => (
                              <Badge
                                key={pid}
                                variant="outline"
                                className={`text-xs ${
                                  activeProviderIds.includes(pid)
                                    ? "border-green-600 text-green-400"
                                    : "border-gray-600 text-gray-500"
                                }`}
                              >
                                {pid}
                              </Badge>
                            ))}
                            {mapping.providerIds.length > 4 && (
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-500">
                                +{mapping.providerIds.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {mapping.enablesFeatures.map((featureId) => {
                              const feature = features[featureId];
                              return (
                                <Badge
                                  key={featureId}
                                  className={`text-xs ${
                                    hasActiveProvider && mapping.enabled
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-700 text-gray-400"
                                  }`}
                                >
                                  {feature?.name || featureId}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {hasActiveProvider ? (
                            <Badge className="bg-green-600 text-white">
                              <Check className="w-3 h-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-700 text-gray-400">
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={mapping.enabled}
                            onCheckedChange={(checked) => {
                              const updated = integrationMappings.map((m) =>
                                m.id === mapping.id ? { ...m, enabled: checked } : m
                              );
                              setIntegrationMappings(updated);
                            }}
                            className="data-[state=checked]:bg-green-600"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Features Status */}
          {integrationModeEnabled && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Features Status (Integration Mode)</CardTitle>
                <CardDescription className="text-gray-400">
                  Current visibility of features based on your integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Object.values(features).map((feature) => {
                    const isEnabled = isFeatureEnabled(feature.id);
                    const requiresIntegration = feature.requiresIntegration;
                    const isLocked = LOCKED_FEATURES.includes(feature.id);

                    return (
                      <div
                        key={feature.id}
                        className={`p-3 rounded-lg border ${
                          isEnabled
                            ? "bg-green-900/20 border-green-800"
                            : "bg-gray-900 border-gray-700"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={isEnabled ? "text-green-300" : "text-gray-500"}>
                            {feature.name}
                          </span>
                          <div className="flex items-center gap-1">
                            {requiresIntegration && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge className="bg-purple-600/30 text-purple-300 text-xs">
                                      <Plug className="w-3 h-3" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Requires integration</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {isLocked && (
                              <Badge className="bg-blue-600/30 text-blue-300 text-xs">
                                <Lock className="w-3 h-3" />
                              </Badge>
                            )}
                            {isEnabled ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <X className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">User Management</CardTitle>
              <CardDescription className="text-gray-400">
                Manage users, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Users className="w-4 h-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                Manage Roles & Permissions
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                <Key className="w-4 h-4 mr-2" />
                Manage API Keys
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Audit Log</CardTitle>
              <CardDescription className="text-gray-400">
                Recent system changes and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">User</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-gray-700">
                    <TableCell className="text-gray-400">2 hours ago</TableCell>
                    <TableCell className="text-white">admin@example.com</TableCell>
                    <TableCell className="text-gray-300">User Created</TableCell>
                    <TableCell className="text-gray-400">Created user john.doe</TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700">
                    <TableCell className="text-gray-400">4 hours ago</TableCell>
                    <TableCell className="text-white">admin@example.com</TableCell>
                    <TableCell className="text-gray-300">Feature Disabled</TableCell>
                    <TableCell className="text-gray-400">Disabled "IVR Management"</TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700">
                    <TableCell className="text-gray-400">Yesterday</TableCell>
                    <TableCell className="text-white">admin@example.com</TableCell>
                    <TableCell className="text-gray-300">API Key Regenerated</TableCell>
                    <TableCell className="text-gray-400">Regenerated key for service-x</TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700">
                    <TableCell className="text-gray-400">2 days ago</TableCell>
                    <TableCell className="text-white">admin@example.com</TableCell>
                    <TableCell className="text-gray-300">Role Updated</TableCell>
                    <TableCell className="text-gray-400">Updated "Operator" permissions</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
