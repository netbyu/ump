"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Shield,
  Key,
  Webhook,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Zap,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useProvider,
  useTestProviderCredentials,
  useCreateConnector,
} from "@/hooks/use-connectors";
import type { ProviderField } from "@/types";

// Field type to input type mapping
function getInputType(fieldType: string): string {
  switch (fieldType?.toLowerCase()) {
    case "password":
      return "password";
    case "email":
      return "email";
    case "url":
      return "url";
    case "number":
    case "integer":
      return "number";
    default:
      return "text";
  }
}

// Auth type descriptions
const authTypeInfo: Record<string, { icon: React.ReactNode; description: string }> = {
  api_key: {
    icon: <Key className="w-5 h-5" />,
    description: "Authenticate using an API key provided by the service",
  },
  oauth2: {
    icon: <Shield className="w-5 h-5" />,
    description: "OAuth 2.0 authorization flow for secure access",
  },
  oauth2_client_credentials: {
    icon: <Shield className="w-5 h-5" />,
    description: "OAuth 2.0 client credentials flow for server-to-server auth",
  },
  basic: {
    icon: <Key className="w-5 h-5" />,
    description: "Basic HTTP authentication with username and password",
  },
  bearer: {
    icon: <Key className="w-5 h-5" />,
    description: "Bearer token authentication",
  },
  oauth1: {
    icon: <Shield className="w-5 h-5" />,
    description: "OAuth 1.0 authentication flow",
  },
  jwt: {
    icon: <Shield className="w-5 h-5" />,
    description: "JSON Web Token based authentication",
  },
  two_step: {
    icon: <Shield className="w-5 h-5" />,
    description: "Multi-step authentication process",
  },
  custom: {
    icon: <Key className="w-5 h-5" />,
    description: "Custom authentication method specific to this provider",
  },
};

// Dynamic credential field component
function CredentialField({
  field,
  value,
  onChange,
  showPassword,
  onTogglePassword,
}: {
  field: ProviderField;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  const isSecret = field.type === "password" || field.name.toLowerCase().includes("secret") || field.name.toLowerCase().includes("key");
  const inputType = isSecret && !showPassword ? "password" : getInputType(field.type);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-gray-300">
          {field.label || field.name}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </Label>
        {isSecret && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onTogglePassword}
            className="h-6 px-2 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {field.type === "text" || field.description?.toLowerCase().includes("multiline") ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || field.description || `Enter ${field.label || field.name}`}
          className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
          required={field.required}
        />
      ) : field.options && field.options.length > 0 ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder={`Select ${field.label || field.name}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || field.description || `Enter ${field.label || field.name}`}
          className="bg-gray-700 border-gray-600 text-white"
          required={field.required}
        />
      )}

      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}

export default function AddProviderPage() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.id as string;

  // State
  const [connectorName, setConnectorName] = useState("");
  const [connectorDescription, setConnectorDescription] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // Queries & mutations
  const { data: provider, isLoading, error } = useProvider(providerId);
  const testCredentialsMutation = useTestProviderCredentials();
  const createConnectorMutation = useCreateConnector();

  // Initialize connector name when provider loads
  useEffect(() => {
    if (provider && !connectorName) {
      setConnectorName(`${provider.name} Connection`);
    }
  }, [provider, connectorName]);

  // Get auth fields from provider schema
  const authFields: ProviderField[] = provider?.auth_schema?.fields || [];

  // Handle credential change
  const handleCredentialChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
    setTestStatus("idle"); // Reset test status on change
  };

  // Toggle password visibility
  const togglePasswordVisibility = (fieldName: string) => {
    setShowPasswords((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  // Test credentials
  const handleTestCredentials = async () => {
    setTestStatus("testing");
    try {
      const result = await testCredentialsMutation.mutateAsync({
        providerId,
        credentials,
      });
      setTestStatus(result.success ? "success" : "error");
      setTestMessage(result.message || (result.success ? "Connection successful!" : "Connection failed"));
    } catch (err) {
      setTestStatus("error");
      setTestMessage("Failed to test connection");
    }
  };

  // Create connector
  const handleCreateConnector = async () => {
    if (!connectorName.trim()) return;

    try {
      await createConnectorMutation.mutateAsync({
        name: connectorName.trim(),
        provider_id: providerId,
        description: connectorDescription.trim() || undefined,
        credentials,
      });
      router.push("/connectors");
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Check if form is valid
  const requiredFieldsFilled = authFields
    .filter((f) => f.required)
    .every((f) => credentials[f.name]?.trim());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="space-y-6">
        <Link
          href="/providers"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Providers
        </Link>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Provider Not Found</h2>
              <p className="text-gray-400">The provider you're looking for doesn't exist or couldn't be loaded.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const authInfo = authTypeInfo[provider.auth_type] || authTypeInfo.custom;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/providers"
        className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Providers
      </Link>

      {/* Provider Header */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {provider.icon_url ? (
              <img
                src={provider.icon_url}
                alt={provider.name}
                className="w-16 h-16 rounded-xl"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-700 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-400">
                  {provider.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{provider.name}</h1>
                <Badge variant="outline" className="text-xs">v{provider.version}</Badge>
              </div>
              <p className="text-gray-400 mb-3">{provider.description}</p>

              <div className="flex flex-wrap gap-2">
                {provider.categories?.map((cat) => (
                  <Badge key={cat} className="bg-gray-700 text-gray-300">
                    {cat}
                  </Badge>
                ))}
                {provider.supports_webhooks && (
                  <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30">
                    <Webhook className="w-3 h-3 mr-1" />
                    Webhooks
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connector Details */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Connector Details</CardTitle>
              <CardDescription className="text-gray-400">
                Give your connector a name to identify it later
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-300">
                  Connector Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={connectorName}
                  onChange={(e) => setConnectorName(e.target.value)}
                  placeholder="e.g., Production Slack"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={connectorDescription}
                  onChange={(e) => setConnectorDescription(e.target.value)}
                  placeholder="Optional description for this connector..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400">
                  {authInfo.icon}
                </div>
                <div>
                  <CardTitle className="text-white">Authentication</CardTitle>
                  <CardDescription className="text-gray-400">
                    {authInfo.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {authFields.length > 0 ? (
                authFields.map((field) => (
                  <CredentialField
                    key={field.name}
                    field={field}
                    value={credentials[field.name] || ""}
                    onChange={(value) => handleCredentialChange(field.name, value)}
                    showPassword={showPasswords[field.name] || false}
                    onTogglePassword={() => togglePasswordVisibility(field.name)}
                  />
                ))
              ) : (
                // Fallback for providers without auth schema
                <>
                  {provider.auth_type === "api_key" && (
                    <CredentialField
                      field={{ name: "api_key", label: "API Key", type: "password", required: true }}
                      value={credentials.api_key || ""}
                      onChange={(value) => handleCredentialChange("api_key", value)}
                      showPassword={showPasswords.api_key || false}
                      onTogglePassword={() => togglePasswordVisibility("api_key")}
                    />
                  )}
                  {provider.auth_type === "basic" && (
                    <>
                      <CredentialField
                        field={{ name: "username", label: "Username", type: "string", required: true }}
                        value={credentials.username || ""}
                        onChange={(value) => handleCredentialChange("username", value)}
                        showPassword={false}
                        onTogglePassword={() => {}}
                      />
                      <CredentialField
                        field={{ name: "password", label: "Password", type: "password", required: true }}
                        value={credentials.password || ""}
                        onChange={(value) => handleCredentialChange("password", value)}
                        showPassword={showPasswords.password || false}
                        onTogglePassword={() => togglePasswordVisibility("password")}
                      />
                    </>
                  )}
                  {(provider.auth_type === "oauth2" || provider.auth_type === "oauth2_client_credentials") && (
                    <>
                      <CredentialField
                        field={{ name: "client_id", label: "Client ID", type: "string", required: true }}
                        value={credentials.client_id || ""}
                        onChange={(value) => handleCredentialChange("client_id", value)}
                        showPassword={false}
                        onTogglePassword={() => {}}
                      />
                      <CredentialField
                        field={{ name: "client_secret", label: "Client Secret", type: "password", required: true }}
                        value={credentials.client_secret || ""}
                        onChange={(value) => handleCredentialChange("client_secret", value)}
                        showPassword={showPasswords.client_secret || false}
                        onTogglePassword={() => togglePasswordVisibility("client_secret")}
                      />
                    </>
                  )}
                  {provider.auth_type === "bearer" && (
                    <CredentialField
                      field={{ name: "token", label: "Bearer Token", type: "password", required: true }}
                      value={credentials.token || ""}
                      onChange={(value) => handleCredentialChange("token", value)}
                      showPassword={showPasswords.token || false}
                      onTogglePassword={() => togglePasswordVisibility("token")}
                    />
                  )}
                </>
              )}

              {/* Test Connection Result */}
              {testStatus !== "idle" && (
                <div
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    testStatus === "testing"
                      ? "bg-blue-900/20 border border-blue-700/30"
                      : testStatus === "success"
                      ? "bg-green-900/20 border border-green-700/30"
                      : "bg-red-900/20 border border-red-700/30"
                  }`}
                >
                  {testStatus === "testing" && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                  )}
                  {testStatus === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  )}
                  {testStatus === "error" && (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        testStatus === "testing"
                          ? "text-blue-400"
                          : testStatus === "success"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {testStatus === "testing"
                        ? "Testing connection..."
                        : testStatus === "success"
                        ? "Connection successful!"
                        : "Connection failed"}
                    </p>
                    {testMessage && testStatus !== "testing" && (
                      <p className="text-sm text-gray-400 mt-1">{testMessage}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTestCredentials}
              disabled={testStatus === "testing"}
              className="flex-1"
            >
              {testStatus === "testing" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={handleCreateConnector}
              disabled={!connectorName.trim() || createConnectorMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {createConnectorMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Create Connector
            </Button>
          </div>

          {createConnectorMutation.isError && (
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-700/30">
              <p className="text-red-400">
                Failed to create connector. Please check your credentials and try again.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Provider Info */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Provider Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Auth Type</span>
                <Badge variant="outline">{provider.auth_type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Version</span>
                <span className="text-white">{provider.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Webhooks</span>
                <span className={provider.supports_webhooks ? "text-green-400" : "text-gray-500"}>
                  {provider.supports_webhooks ? "Supported" : "Not supported"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Available Actions */}
          {provider.actions && provider.actions.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Available Actions ({provider.actions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {provider.actions.slice(0, 5).map((action, idx) => (
                    <AccordionItem key={action.id} value={`action-${idx}`} className="border-gray-700">
                      <AccordionTrigger className="text-sm text-gray-300 hover:text-white py-2">
                        {action.name}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-gray-400">
                        {action.description || "No description"}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {provider.actions.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    +{provider.actions.length - 5} more actions
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Available Triggers */}
          {provider.triggers && provider.triggers.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Available Triggers ({provider.triggers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {provider.triggers.slice(0, 5).map((trigger, idx) => (
                    <AccordionItem key={trigger.id} value={`trigger-${idx}`} className="border-gray-700">
                      <AccordionTrigger className="text-sm text-gray-300 hover:text-white py-2">
                        {trigger.name}
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-gray-400">
                        {trigger.description || "No description"}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {trigger.trigger_type}
                        </Badge>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {provider.triggers.length > 5 && (
                  <p className="text-xs text-gray-500 mt-2">
                    +{provider.triggers.length - 5} more triggers
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
