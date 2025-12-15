"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const AWS_REGIONS = [
  { value: "ca-central-1", label: "🇨🇦 Canada (Central)" },
  { value: "ca-west-1", label: "🇨🇦 Canada (West)" },
  { value: "us-east-1", label: "🇺🇸 US East (N. Virginia)" },
  { value: "us-east-2", label: "🇺🇸 US East (Ohio)" },
  { value: "us-west-1", label: "🇺🇸 US West (N. California)" },
  { value: "us-west-2", label: "🇺🇸 US West (Oregon)" },
  { value: "eu-west-1", label: "🇪🇺 Europe (Ireland)" },
  { value: "eu-central-1", label: "🇪🇺 Europe (Frankfurt)" },
];

export default function AWSSettingsPage() {
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
  const [awsCliInstalled, setAwsCliInstalled] = useState<boolean | null>(null);
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [configurationMethod, setConfigurationMethod] = useState<string>("");

  const [awsCredentials, setAwsCredentials] = useState({
    access_key_id: "",
    secret_access_key: "",
    default_region: "ca-central-1",
  });

  const [spotPreferences, setSpotPreferences] = useState({
    default_instance_type: "g5.xlarge",
    default_max_price_multiplier: 1.5,
    auto_terminate_hours: 0,
    budget_alert_threshold: 50,
  });

  const checkAWSConfiguration = async () => {
    try {
      const response = await fetch("http://localhost:8002/api/credentials/status");
      if (response.ok) {
        const data = await response.json();
        setAwsCliInstalled(data.aws_cli_installed || false);
        setCredentialsConfigured(data.credentials_configured || false);
        setConfigurationMethod(data.configuration_method || "");
        if (data.credentials_configured) {
          setCredentialsStatus("valid");
        }
      }
    } catch (error) {
      console.error("Failed to check AWS configuration:", error);
    }
  };

  const saveCredentials = () => {
    localStorage.setItem("aws_credentials", JSON.stringify(awsCredentials));
    toast.success("AWS credentials saved locally");
    setCredentialsStatus("unknown");
  };

  const savePreferences = () => {
    localStorage.setItem("aws_spot_preferences", JSON.stringify(spotPreferences));
    toast.success("AWS Spot preferences saved");
  };

  useState(() => {
    checkAWSConfiguration();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/ai-compute">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">AWS Spot Settings</h1>
          <p className="text-muted-foreground">
            Configure AWS credentials and spot instance preferences
          </p>
        </div>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="credentials">
            <Key className="h-4 w-4 mr-2" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <DollarSign className="h-4 w-4 mr-2" />
            Spot Config
          </TabsTrigger>
          <TabsTrigger value="regions">
            <Globe className="h-4 w-4 mr-2" />
            Regions
          </TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AWS Configuration Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {awsCliInstalled === null ? (
                      <div className="h-5 w-5 rounded-full bg-gray-300 animate-pulse" />
                    ) : awsCliInstalled ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium">AWS CLI</p>
                      <p className="text-xs text-muted-foreground">
                        {awsCliInstalled === null ? "Checking..." : awsCliInstalled ? "Installed" : "Not Installed"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {credentialsConfigured === null ? (
                      <div className="h-5 w-5 rounded-full bg-gray-300 animate-pulse" />
                    ) : credentialsConfigured ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">Credentials</p>
                      <p className="text-xs text-muted-foreground">
                        {credentialsConfigured === null
                          ? "Checking..."
                          : credentialsConfigured
                          ? `Configured via ${configurationMethod}`
                          : "Not Configured"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button onClick={checkAWSConfiguration} variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AWS Credentials</CardTitle>
              <CardDescription>Configure AWS access for launching spot instances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Region</Label>
                <Select
                  value={awsCredentials.default_region}
                  onValueChange={(value) =>
                    setAwsCredentials({ ...awsCredentials, default_region: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AWS_REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Recommended: Use AWS CLI</h4>
                <code className="block p-3 bg-muted rounded-md text-sm">
                  aws configure
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables
                </p>
              </div>

              <Button onClick={saveCredentials}>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Spot Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Spot Instance Preferences</CardTitle>
              <CardDescription>Default settings for launching spot instances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Instance Type</Label>
                <Select
                  value={spotPreferences.default_instance_type}
                  onValueChange={(value) =>
                    setSpotPreferences({ ...spotPreferences, default_instance_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g4dn.xlarge">g4dn.xlarge (Budget - $0.16/hr)</SelectItem>
                    <SelectItem value="g5.xlarge">g5.xlarge (Recommended - $0.30/hr)</SelectItem>
                    <SelectItem value="g5.2xlarge">g5.2xlarge (Performance - $0.36/hr)</SelectItem>
                    <SelectItem value="g5.12xlarge">g5.12xlarge (Large Models - $1.70/hr)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Max Price Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="3.0"
                  value={spotPreferences.default_max_price_multiplier}
                  onChange={(e) =>
                    setSpotPreferences({
                      ...spotPreferences,
                      default_max_price_multiplier: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum price as multiplier of current spot price (1.5 = 150% of spot)
                </p>
              </div>

              <div>
                <Label>Auto-Terminate After (hours)</Label>
                <Input
                  type="number"
                  min="0"
                  value={spotPreferences.auto_terminate_hours}
                  onChange={(e) =>
                    setSpotPreferences({
                      ...spotPreferences,
                      auto_terminate_hours: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set to 0 to disable auto-termination
                </p>
              </div>

              <div>
                <Label>Budget Alert Threshold ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={spotPreferences.budget_alert_threshold}
                  onChange={(e) =>
                    setSpotPreferences({
                      ...spotPreferences,
                      budget_alert_threshold: parseFloat(e.target.value),
                    })
                  }
                />
              </div>

              <Button onClick={savePreferences}>
                <Save className="mr-2 h-4 w-4" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AWS Regions</CardTitle>
              <CardDescription>Available regions for spot instances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {AWS_REGIONS.map((region) => (
                  <div
                    key={region.value}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium">{region.label}</p>
                      <p className="text-sm text-muted-foreground">{region.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
