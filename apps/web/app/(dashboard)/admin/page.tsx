"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Settings,
  Lock,
  Check,
  X,
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
import { useFeatureFlags, FeatureConfig } from "@/contexts/feature-flags-context";

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
  } = useFeatureFlags();

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
