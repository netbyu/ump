"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Save,
  Cloud,
  Container,
  CheckCircle,
  XCircle,
  Settings,
  Server,
  Key,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DeploymentMethod {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  configured: boolean;
  configUrl: string;
  requirements: string[];
  cost: string;
}

export default function DeploymentMethodsPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<DeploymentMethod[]>([
    {
      id: "aws_spot",
      name: "AWS Spot Instances",
      description: "Deploy LLMs to AWS GPU instances in the cloud",
      icon: <Cloud className="h-8 w-8 text-blue-600" />,
      enabled: false,
      configured: false,
      configUrl: "/ai-compute/aws/settings",
      requirements: ["AWS credentials", "Valid payment method"],
      cost: "~$0.30-$5.00/hour",
    },
    {
      id: "docker",
      name: "Docker/Portainer",
      description: "Deploy to your own Docker hosts managed by Portainer",
      icon: <Container className="h-8 w-8 text-indigo-600" />,
      enabled: false,
      configured: false,
      configUrl: "/ai-compute/docker/settings",
      requirements: ["Portainer instance", "Docker hosts configured"],
      cost: "Free (your hardware)",
    },
  ]);

  // Load saved configuration from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("deployment_methods_config");
    if (saved) {
      const config = JSON.parse(saved);
      setMethods(prevMethods =>
        prevMethods.map(method => ({
          ...method,
          enabled: config[method.id]?.enabled || false,
          configured: config[method.id]?.configured || false,
        }))
      );
    }

    // Check actual configuration status
    checkConfigurationStatus();
  }, []);

  const checkConfigurationStatus = async () => {
    // Check AWS configuration
    try {
      const awsCheck = await fetch("http://localhost:8002/api/credentials/status");
      if (awsCheck.ok) {
        const awsData = await awsCheck.json();
        updateMethodConfig("aws_spot", {
          configured: awsData.credentials_configured || false,
        });
      }
    } catch (e) {
      console.log("AWS check failed:", e);
    }

    // Check Portainer configuration
    try {
      const portainerCheck = await fetch("http://localhost:8002/api/docker/endpoints");
      if (portainerCheck.ok) {
        const portainerData = await portainerCheck.json();
        updateMethodConfig("docker", {
          configured: portainerData.length > 0,
        });
      }
    } catch (e) {
      console.log("Portainer check failed:", e);
    }
  };

  const updateMethodConfig = (methodId: string, updates: Partial<DeploymentMethod>) => {
    setMethods(prev =>
      prev.map(m => (m.id === methodId ? { ...m, ...updates } : m))
    );
  };

  const toggleMethod = (methodId: string, enabled: boolean) => {
    setMethods(prev =>
      prev.map(m => (m.id === methodId ? { ...m, enabled } : m))
    );
  };

  const saveConfiguration = () => {
    const config = methods.reduce((acc, method) => {
      acc[method.id] = {
        enabled: method.enabled,
        configured: method.configured,
      };
      return acc;
    }, {} as Record<string, any>);

    localStorage.setItem("deployment_methods_config", JSON.stringify(config));
    toast.success("Deployment methods configuration saved");

    // Redirect back to AI Compute dashboard
    setTimeout(() => {
      router.push("/ai-compute");
    }, 1000);
  };

  const enabledCount = methods.filter(m => m.enabled).length;
  const configuredCount = methods.filter(m => m.configured).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ai-compute">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Configure Deployment Methods</h1>
          <p className="text-muted-foreground">
            Enable and configure how you want to deploy LLMs
          </p>
        </div>
        <Button onClick={saveConfiguration}>
          <Save className="mr-2 h-4 w-4" />
          Save Configuration
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{enabledCount}</p>
            <p className="text-sm text-muted-foreground">Methods Enabled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{configuredCount}</p>
            <p className="text-sm text-muted-foreground">Methods Configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{methods.length}</p>
            <p className="text-sm text-muted-foreground">Total Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Methods */}
      <div className="space-y-4">
        {methods.map((method) => (
          <Card key={method.id} className={method.enabled ? "border-primary" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-3 rounded-lg ${method.enabled ? "bg-blue-500/10" : "bg-gray-500/10"}`}>
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle>{method.name}</CardTitle>
                      {method.configured ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <XCircle className="h-3 w-3 mr-1" />
                          Not Configured
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{method.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link href={method.configUrl}>
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                  </Link>
                  <Switch
                    checked={method.enabled}
                    onCheckedChange={(checked) => toggleMethod(method.id, checked)}
                    disabled={!method.configured}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Requirements */}
              <div>
                <p className="text-sm font-medium mb-2">Requirements:</p>
                <ul className="space-y-1">
                  {method.requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="text-xs">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cost */}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-sm text-muted-foreground">Estimated Cost</span>
                <span className="text-sm font-medium">{method.cost}</span>
              </div>

              {/* Status Message */}
              {!method.configured && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 text-sm">
                  <p className="text-yellow-800 dark:text-yellow-400">
                    ⚠️ This method needs to be configured before it can be enabled.
                    Click "Configure" to set up {method.name}.
                  </p>
                </div>
              )}

              {method.configured && !method.enabled && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 text-sm">
                  <p className="text-blue-800 dark:text-blue-400">
                    ✓ Configuration complete. Toggle the switch above to enable this deployment method.
                  </p>
                </div>
              )}

              {method.configured && method.enabled && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 text-sm">
                  <p className="text-green-800 dark:text-green-400">
                    ✓ Active and ready to use for LLM deployments!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfiguration} size="lg">
          <Save className="mr-2 h-4 w-4" />
          Save & Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
