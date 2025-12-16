"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Server,
  Network,
  HardDrive,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ProvisioningSettingsPage() {
  const [serverSettings, setServerSettings] = useState({
    http_port: 8005,
    http_enabled: true,
    tftp_port: 69,
    tftp_enabled: false,
    config_dir: "/var/lib/phone-configs",
    firmware_dir: "/var/lib/phone-firmware",
  });

  const [networkSettings, setNetworkSettings] = useState({
    server_ip: "192.168.1.10",
    dhcp_option_66: "192.168.1.10",
    dhcp_option_150: "192.168.1.10",
  });

  const [provisioningSettings, setProvisioningSettings] = useState({
    auto_regenerate: true,
    cache_configs: true,
    log_requests: true,
    notify_on_provision: false,
  });

  const saveSettings = (category: string) => {
    toast.success(`${category} settings saved`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/phone-provisioning">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Provisioning Settings</h1>
          <p className="text-muted-foreground">
            Configure phone provisioning server and protocols
          </p>
        </div>
      </div>

      <Tabs defaultValue="server" className="space-y-6">
        <TabsList>
          <TabsTrigger value="server">
            <Server className="mr-2 h-4 w-4" />
            Server
          </TabsTrigger>
          <TabsTrigger value="network">
            <Network className="mr-2 h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="storage">
            <HardDrive className="mr-2 h-4 w-4" />
            Storage
          </TabsTrigger>
        </TabsList>

        {/* Server Settings */}
        <TabsContent value="server" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">HTTP Server</p>
                      <p className="text-sm text-muted-foreground">
                        Running on port {serverSettings.http_port}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {serverSettings.tftp_enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">TFTP Server</p>
                      <p className="text-sm text-muted-foreground">
                        {serverSettings.tftp_enabled ? `Port ${serverSettings.tftp_port}` : "Disabled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>HTTP Server</CardTitle>
              <CardDescription>Modern phones support HTTP provisioning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>HTTP Port</Label>
                <Input
                  type="number"
                  value={serverSettings.http_port}
                  onChange={(e) =>
                    setServerSettings({ ...serverSettings, http_port: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable HTTP Server</Label>
                <input
                  type="checkbox"
                  checked={serverSettings.http_enabled}
                  onChange={(e) =>
                    setServerSettings({ ...serverSettings, http_enabled: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>

              <Button onClick={() => saveSettings("Server")}>
                <Save className="mr-2 h-4 w-4" />
                Save Server Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TFTP Server</CardTitle>
              <CardDescription>Legacy protocol for older phones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>TFTP Port</Label>
                <Input
                  type="number"
                  value={serverSettings.tftp_port}
                  onChange={(e) =>
                    setServerSettings({ ...serverSettings, tftp_port: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable TFTP Server</Label>
                <input
                  type="checkbox"
                  checked={serverSettings.tftp_enabled}
                  onChange={(e) =>
                    setServerSettings({ ...serverSettings, tftp_enabled: e.target.checked })
                  }
                  className="h-4 w-4"
                />
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 text-sm">
                <p className="text-yellow-800 dark:text-yellow-400">
                  ⚠️ TFTP requires root privileges (port 69). Consider using HTTP instead.
                </p>
              </div>

              <Button onClick={() => saveSettings("TFTP")}>
                <Save className="mr-2 h-4 w-4" />
                Save TFTP Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Network Settings */}
        <TabsContent value="network" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
              <CardDescription>
                Configure how phones discover the provisioning server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Provisioning Server IP</Label>
                <Input
                  value={networkSettings.server_ip}
                  onChange={(e) =>
                    setNetworkSettings({ ...networkSettings, server_ip: e.target.value })
                  }
                  placeholder="192.168.1.10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  IP address where phones can reach this server
                </p>
              </div>

              <div>
                <Label>DHCP Option 66 (TFTP Server)</Label>
                <Input
                  value={networkSettings.dhcp_option_66}
                  onChange={(e) =>
                    setNetworkSettings({ ...networkSettings, dhcp_option_66: e.target.value })
                  }
                  placeholder="192.168.1.10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Configure in your DHCP server
                </p>
              </div>

              <div>
                <Label>DHCP Option 150 (Cisco)</Label>
                <Input
                  value={networkSettings.dhcp_option_150}
                  onChange={(e) =>
                    setNetworkSettings({ ...networkSettings, dhcp_option_150: e.target.value })
                  }
                  placeholder="192.168.1.10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For Cisco phones
                </p>
              </div>

              <Button onClick={() => saveSettings("Network")}>
                <Save className="mr-2 h-4 w-4" />
                Save Network Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>DHCP Configuration Example</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">For ISC DHCP Server:</p>
                  <code className="block p-3 bg-muted rounded text-xs font-mono">
                    option tftp-server-name "{networkSettings.dhcp_option_66}";<br />
                    option option-150 code 150 = ip-address;<br />
                    option option-150 {networkSettings.dhcp_option_150};
                  </code>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">For Vendor-Specific:</p>
                  <code className="block p-3 bg-muted rounded text-xs font-mono">
                    # Yealink<br />
                    option vendor-class-identifier "yealink";<br />
                    option tftp-server-name "http://{networkSettings.server_ip}:8005/configs";<br />
                    <br />
                    # Polycom<br />
                    option bootfile-name "http://{networkSettings.server_ip}:8005/configs/000000000000.cfg";
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Settings */}
        <TabsContent value="storage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Storage Paths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Config Files Directory</Label>
                <Input
                  value={serverSettings.config_dir}
                  onChange={(e) =>
                    setServerSettings({ ...serverSettings, config_dir: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Where generated config files are stored
                </p>
              </div>

              <div>
                <Label>Firmware Files Directory</Label>
                <Input
                  value={serverSettings.firmware_dir}
                  onChange={(e) =>
                    setServerSettings({ ...serverSettings, firmware_dir: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Where phone firmware files are stored
                </p>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto-Regenerate Configs</Label>
                  <input
                    type="checkbox"
                    checked={provisioningSettings.auto_regenerate}
                    onChange={(e) =>
                      setProvisioningSettings({
                        ...provisioningSettings,
                        auto_regenerate: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Cache Generated Configs</Label>
                  <input
                    type="checkbox"
                    checked={provisioningSettings.cache_configs}
                    onChange={(e) =>
                      setProvisioningSettings({
                        ...provisioningSettings,
                        cache_configs: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Log Provisioning Requests</Label>
                  <input
                    type="checkbox"
                    checked={provisioningSettings.log_requests}
                    onChange={(e) =>
                      setProvisioningSettings({
                        ...provisioningSettings,
                        log_requests: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <Button onClick={() => saveSettings("Storage")}>
                <Save className="mr-2 h-4 w-4" />
                Save Storage Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
