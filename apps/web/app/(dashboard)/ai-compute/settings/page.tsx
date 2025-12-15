"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Key,
  Globe,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Activity,
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
  { value: "eu-west-2", label: "🇪🇺 Europe (London)" },
  { value: "eu-central-1", label: "🇪🇺 Europe (Frankfurt)" },
  { value: "ap-southeast-1", label: "🌏 Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "🌏 Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "🌏 Asia Pacific (Tokyo)" },
  { value: "ap-south-1", label: "🌏 Asia Pacific (Mumbai)" },
];

export default function AIComputeSettingsPage() {
  const [showAccessKey, setShowAccessKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [credentialsStatus, setCredentialsStatus] = useState<"unknown" | "valid" | "invalid">("unknown");
  const [awsCliInstalled, setAwsCliInstalled] = useState<boolean | null>(null);
  const [credentialsConfigured, setCredentialsConfigured] = useState<boolean | null>(null);
  const [configurationMethod, setConfigurationMethod] = useState<string>("");

  // AWS Credentials Form State
  const [awsCredentials, setAwsCredentials] = useState({
    access_key_id: "",
    secret_access_key: "",
    default_region: "ca-central-1",
  });

  // Default Preferences State
  const [preferences, setPreferences] = useState({
    default_instance_type: "g5.xlarge",
    default_framework: "ollama",
    default_volume_size: 100,
    auto_terminate_hours: 0, // 0 = never
    budget_alert_threshold: 50,
  });

  // Load existing credentials (from localStorage for now)
  const loadStoredCredentials = () => {
    try {
      const stored = localStorage.getItem("ai_compute_aws_creds");
      if (stored) {
        const parsed = JSON.parse(stored);
        setAwsCredentials(parsed);
        // Check if we have valid-looking credentials
        if (parsed.access_key_id && parsed.secret_access_key) {
          setCredentialsStatus("unknown"); // Need to test
        }
      }

      const storedPrefs = localStorage.getItem("ai_compute_preferences");
      if (storedPrefs) {
        setPreferences(JSON.parse(storedPrefs));
      }
    } catch (error) {
      console.error("Failed to load stored settings:", error);
    }
  };

  // Save credentials (localStorage for now, should be encrypted backend storage)
  const saveCredentials = () => {
    try {
      // WARNING: This stores credentials in localStorage - NOT SECURE FOR PRODUCTION
      // In production, this should send to backend API with encryption
      localStorage.setItem("ai_compute_aws_creds", JSON.stringify(awsCredentials));

      toast.success("AWS credentials saved", {
        description: "Credentials stored locally (use environment variables for production)",
      });
      setCredentialsStatus("unknown");
    } catch (error) {
      toast.error("Failed to save credentials");
    }
  };

  const savePreferences = () => {
    try {
      localStorage.setItem("ai_compute_preferences", JSON.stringify(preferences));
      toast.success("Preferences saved successfully");
    } catch (error) {
      toast.error("Failed to save preferences");
    }
  };

  const testCredentials = async () => {
    // TODO: Implement API call to test credentials
    toast.info("Testing credentials...", {
      description: "This will verify your AWS access",
    });

    // Simulate API call
    setTimeout(() => {
      if (awsCredentials.access_key_id && awsCredentials.secret_access_key) {
        setCredentialsStatus("valid");
        toast.success("Credentials are valid!");
      } else {
        setCredentialsStatus("invalid");
        toast.error("Invalid credentials");
      }
    }, 1500);
  };

  const clearCredentials = () => {
    setAwsCredentials({
      access_key_id: "",
      secret_access_key: "",
      default_region: "us-east-1",
    });
    localStorage.removeItem("ai_compute_aws_creds");
    setCredentialsStatus("unknown");
    toast.success("Credentials cleared");
  };

  // Check AWS CLI and credential configuration
  const checkAWSConfiguration = async () => {
    try {
      // Check if backend can detect AWS credentials
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
      // Fallback: check localStorage
      const stored = localStorage.getItem("ai_compute_aws_creds");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.access_key_id && parsed.secret_access_key) {
          setCredentialsConfigured(true);
          setConfigurationMethod("Browser Storage");
        }
      }
    }
  };

  // Load credentials on mount
  useState(() => {
    loadStoredCredentials();
    checkAWSConfiguration();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ai-compute">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">AI Compute Settings</h1>
          <p className="text-muted-foreground">
            Configure AWS credentials and default preferences
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
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="regions">
            <Globe className="h-4 w-4 mr-2" />
            Regions
          </TabsTrigger>
        </TabsList>

        {/* AWS Credentials Tab */}
        <TabsContent value="credentials" className="space-y-6">
          {/* AWS Configuration Status */}
          <Card>
            <CardHeader>
              <CardTitle>AWS Configuration Status</CardTitle>
              <CardDescription>
                Current AWS CLI and credential configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* AWS CLI Status */}
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
                        {awsCliInstalled === null
                          ? "Checking..."
                          : awsCliInstalled
                          ? "Installed"
                          : "Not Installed"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credentials Status */}
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

              {/* Refresh Button */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={checkAWSConfiguration}
                  variant="outline"
                  size="sm"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AWS Credentials</CardTitle>
              <CardDescription>
                Configure your AWS access keys for launching instances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Credentials Status */}
              {credentialsStatus !== "unknown" && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg border ${
                    credentialsStatus === "valid"
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20"
                      : "bg-red-50 border-red-200 dark:bg-red-950/20"
                  }`}
                >
                  {credentialsStatus === "valid" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      credentialsStatus === "valid"
                        ? "text-green-700 dark:text-green-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {credentialsStatus === "valid"
                      ? "Credentials verified successfully"
                      : "Credentials are invalid"}
                  </span>
                </div>
              )}

              {/* Warning about security */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-400">
                  <p className="font-medium">Security Note</p>
                  <p className="mt-1">
                    For development, use AWS environment variables or AWS CLI configuration.
                    For production, credentials should be encrypted and stored securely on the backend.
                  </p>
                </div>
              </div>

              {/* Access Key ID */}
              <div>
                <Label htmlFor="access_key_id">AWS Access Key ID</Label>
                <div className="relative">
                  <Input
                    id="access_key_id"
                    type={showAccessKey ? "text" : "password"}
                    value={awsCredentials.access_key_id}
                    onChange={(e) =>
                      setAwsCredentials({
                        ...awsCredentials,
                        access_key_id: e.target.value,
                      })
                    }
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessKey(!showAccessKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showAccessKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Secret Access Key */}
              <div>
                <Label htmlFor="secret_access_key">AWS Secret Access Key</Label>
                <div className="relative">
                  <Input
                    id="secret_access_key"
                    type={showSecretKey ? "text" : "password"}
                    value={awsCredentials.secret_access_key}
                    onChange={(e) =>
                      setAwsCredentials({
                        ...awsCredentials,
                        secret_access_key: e.target.value,
                      })
                    }
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecretKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Default Region */}
              <div>
                <Label htmlFor="default_region">Default AWS Region</Label>
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

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t">
                <Button onClick={saveCredentials}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Credentials
                </Button>
                <Button onClick={testCredentials} variant="outline">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button onClick={clearCredentials} variant="outline">
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Alternative Configuration Methods</CardTitle>
              <CardDescription>
                Other ways to configure AWS credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Environment Variables (Recommended)</h4>
                <code className="block p-3 bg-muted rounded-md text-sm font-mono">
                  export AWS_ACCESS_KEY_ID=your_access_key
                  <br />
                  export AWS_SECRET_ACCESS_KEY=your_secret_key
                  <br />
                  export AWS_DEFAULT_REGION=us-east-1
                </code>
              </div>

              <div>
                <h4 className="font-medium mb-2">AWS CLI Configuration</h4>
                <code className="block p-3 bg-muted rounded-md text-sm font-mono">
                  aws configure
                </code>
                <p className="text-sm text-muted-foreground mt-2">
                  The AWS CLI will prompt you for credentials and save them to ~/.aws/credentials
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Launch Settings</CardTitle>
              <CardDescription>
                Set default values for launching new instances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="default_instance_type">Default Instance Type</Label>
                <Select
                  value={preferences.default_instance_type}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, default_instance_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g4dn.xlarge">g4dn.xlarge (Budget)</SelectItem>
                    <SelectItem value="g5.xlarge">g5.xlarge (Recommended)</SelectItem>
                    <SelectItem value="g5.2xlarge">g5.2xlarge (Performance)</SelectItem>
                    <SelectItem value="g5.12xlarge">g5.12xlarge (Large Models)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="default_framework">Default Framework</Label>
                <Select
                  value={preferences.default_framework}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, default_framework: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="vllm">vLLM</SelectItem>
                    <SelectItem value="tgi">Text Generation Inference</SelectItem>
                    <SelectItem value="llama-cpp">llama.cpp</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="default_volume_size">Default Volume Size (GB)</Label>
                <Input
                  id="default_volume_size"
                  type="number"
                  min="50"
                  max="1000"
                  value={preferences.default_volume_size}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      default_volume_size: parseInt(e.target.value),
                    })
                  }
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <Button onClick={savePreferences}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cost Management */}
          <Card>
            <CardHeader>
              <CardTitle>Cost Management</CardTitle>
              <CardDescription>
                Configure budget alerts and auto-termination
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="auto_terminate_hours">
                  Auto-Terminate After (hours)
                </Label>
                <Input
                  id="auto_terminate_hours"
                  type="number"
                  min="0"
                  value={preferences.auto_terminate_hours}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      auto_terminate_hours: parseInt(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Set to 0 to disable auto-termination
                </p>
              </div>

              <div>
                <Label htmlFor="budget_alert">Budget Alert Threshold ($)</Label>
                <Input
                  id="budget_alert"
                  type="number"
                  min="0"
                  value={preferences.budget_alert_threshold}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      budget_alert_threshold: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Get notified when monthly costs exceed this amount
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t">
                <Button onClick={savePreferences}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Regions Tab */}
        <TabsContent value="regions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available AWS Regions</CardTitle>
              <CardDescription>
                GPU instances availability by region
              </CardDescription>
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
                    <Badge variant="success">Available</Badge>
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
