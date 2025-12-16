"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Play,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Code,
  Copy,
  ArrowLeft,
  Zap,
  Cable,
  Search,
  RefreshCw,
  Terminal,
  FileJson,
} from "lucide-react";
import Link from "next/link";
import { useDevices, useDeviceIntegrations } from "@/hooks/use-devices";
import { useProvider, useProviders } from "@/hooks/use-connectors";
import { toast } from "sonner";

const CONNECTORS_API = process.env.NEXT_PUBLIC_CONNECTORS_API_URL || "http://localhost:8003";

interface ActionResult {
  success: boolean;
  data?: any;
  error_message?: string;
  execution_time_ms?: number;
}

interface ActionField {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
  enum?: string[];
}

interface ProviderAction {
  id: string;
  name: string;
  description?: string;
  category?: string;
  inputs: ActionField[];
  outputs: ActionField[];
  is_idempotent?: boolean;
}

// Component for rendering a single action
function ActionCard({
  action,
  providerId,
  integrationId,
  deviceId,
}: {
  action: ProviderAction;
  providerId: string;
  integrationId: number;
  deviceId: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<ActionResult | null>(null);

  const executeAction = async () => {
    setIsExecuting(true);
    setResult(null);

    try {
      // Execute via the device integration endpoint
      const response = await fetch(
        `${CONNECTORS_API}/api/device-integrations/${integrationId}/actions/${action.id}/execute`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputs }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          error_message: data.detail || "Execution failed",
        });
      } else {
        setResult(data);
        if (data.success) {
          toast.success("Action executed successfully");
        }
      }
    } catch (error) {
      setResult({
        success: false,
        error_message: (error as Error).message,
      });
      toast.error("Failed to execute action");
    } finally {
      setIsExecuting(false);
    }
  };

  const copyResult = () => {
    if (result?.data) {
      navigator.clipboard.writeText(JSON.stringify(result.data, null, 2));
      toast.success("Copied to clipboard");
    }
  };

  const renderInputField = (field: ActionField) => {
    const value = inputs[field.name] ?? field.default ?? "";

    if (field.enum && field.enum.length > 0) {
      return (
        <Select
          value={value?.toString() || ""}
          onValueChange={(v) => setInputs({ ...inputs, [field.name]: v })}
        >
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder={`Select ${field.name}`} />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {field.enum.map((opt) => (
              <SelectItem key={opt} value={opt} className="text-white">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "boolean") {
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={field.name}
            checked={value === true || value === "true"}
            onCheckedChange={(checked) =>
              setInputs({ ...inputs, [field.name]: checked })
            }
          />
          <Label htmlFor={field.name} className="text-gray-300 text-sm">
            {field.name}
          </Label>
        </div>
      );
    }

    if (field.type === "integer" || field.type === "number") {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) =>
            setInputs({
              ...inputs,
              [field.name]: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder={field.description || field.name}
          className="bg-gray-700 border-gray-600 text-white font-mono"
        />
      );
    }

    if (field.type === "object" || field.type === "array") {
      return (
        <Textarea
          value={typeof value === "object" ? JSON.stringify(value, null, 2) : value}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setInputs({ ...inputs, [field.name]: parsed });
            } catch {
              setInputs({ ...inputs, [field.name]: e.target.value });
            }
          }}
          placeholder={`JSON ${field.type}`}
          className="bg-gray-700 border-gray-600 text-white font-mono text-sm min-h-[80px]"
        />
      );
    }

    // Default: string input
    return (
      <Input
        value={value}
        onChange={(e) => setInputs({ ...inputs, [field.name]: e.target.value })}
        placeholder={field.description || field.name}
        className="bg-gray-700 border-gray-600 text-white"
      />
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gray-800 border-gray-700">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-750 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{action.name}</span>
                    {action.category && (
                      <Badge variant="outline" className="text-xs">
                        {action.category}
                      </Badge>
                    )}
                    {action.is_idempotent && (
                      <Badge className="bg-green-600/20 text-green-400 text-xs">
                        Idempotent
                      </Badge>
                    )}
                  </div>
                  {action.description && (
                    <p className="text-gray-400 text-sm mt-0.5">{action.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                {action.id}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t border-gray-700 pt-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Input Parameters */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Input Parameters
                </h4>
                {action.inputs.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No parameters required</p>
                ) : (
                  <div className="space-y-3">
                    {action.inputs.map((field) => (
                      <div key={field.name} className="space-y-1">
                        <Label className="text-gray-400 text-sm flex items-center gap-1">
                          {field.name}
                          {field.required && <span className="text-red-400">*</span>}
                          <span className="text-gray-600 ml-1">({field.type})</span>
                        </Label>
                        {renderInputField(field)}
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={executeAction}
                  disabled={isExecuting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute
                    </>
                  )}
                </Button>
              </div>

              {/* Response */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  Response
                  {result && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={copyResult}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                </h4>

                {!result ? (
                  <div className="bg-gray-900 rounded-lg p-4 text-gray-500 text-sm italic min-h-[200px] flex items-center justify-center">
                    Execute action to see response
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Status Banner */}
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                        result.success
                          ? "bg-green-600/20 text-green-400"
                          : "bg-red-600/20 text-red-400"
                      }`}
                    >
                      {result.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">
                        {result.success ? "Success" : "Failed"}
                      </span>
                      {result.execution_time_ms && (
                        <span className="text-xs ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.execution_time_ms}ms
                        </span>
                      )}
                    </div>

                    {/* Response Data */}
                    <div className="bg-gray-900 rounded-lg p-4 max-h-[300px] overflow-auto">
                      {result.error_message ? (
                        <pre className="text-red-400 text-sm whitespace-pre-wrap">
                          {result.error_message}
                        </pre>
                      ) : (
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Output Schema */}
                {action.outputs.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-xs text-gray-500 mb-2">Expected Output Fields:</h5>
                    <div className="flex flex-wrap gap-1">
                      {action.outputs.map((out) => (
                        <Badge
                          key={out.name}
                          variant="outline"
                          className="text-xs text-gray-400"
                        >
                          {out.name}: {out.type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Component for a node's integration with its actions
function IntegrationExplorer({
  integration,
  deviceId,
}: {
  integration: any;
  deviceId: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: providerDetail, isLoading } = useProvider(integration.provider_id);
  const [actionFilter, setActionFilter] = useState("");

  const filteredActions = useMemo(() => {
    if (!providerDetail?.actions) return [];
    if (!actionFilter) return providerDetail.actions;
    return providerDetail.actions.filter(
      (a: ProviderAction) =>
        a.name.toLowerCase().includes(actionFilter.toLowerCase()) ||
        a.id.toLowerCase().includes(actionFilter.toLowerCase()) ||
        a.description?.toLowerCase().includes(actionFilter.toLowerCase())
    );
  }, [providerDetail?.actions, actionFilter]);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="bg-gray-850 border-gray-700">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <Cable className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-white font-medium">
                    {integration.provider_name || integration.provider_id}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {integration.host_override || "Using device address"}
                    {integration.port && `:${integration.port}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {integration.is_verified ? (
                  <Badge className="bg-green-600 text-white">Verified</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
                    Unverified
                  </Badge>
                )}
                {providerDetail?.actions && (
                  <Badge variant="outline" className="text-gray-400">
                    {providerDetail.actions.length} actions
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="border-t border-gray-700 pt-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : !providerDetail?.actions || providerDetail.actions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No actions available for this provider</p>
              </div>
            ) : (
              <>
                {/* Action Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search actions..."
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                {/* Actions List */}
                <div className="space-y-2">
                  {filteredActions.map((action: ProviderAction) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      providerId={integration.provider_id}
                      integrationId={integration.id}
                      deviceId={deviceId}
                    />
                  ))}
                  {filteredActions.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No actions match your search
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function NodeExplorerPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: devices, isLoading: devicesLoading, refetch } = useDevices();
  const { data: integrations, isLoading: integrationsLoading } = useDeviceIntegrations(
    selectedDeviceId || 0
  );

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    if (!searchQuery) return devices;
    return devices.filter(
      (d) =>
        d.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.primary_address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

  const selectedDevice = devices?.find((d) => d.id === selectedDeviceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/devices">
            <Button variant="ghost" size="sm" className="text-gray-400">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Nodes
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Node Explorer</h1>
            <p className="text-gray-400">
              Test integrations and execute actions - like Swagger for your nodes
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-gray-700 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Node Selector */}
        <div className="col-span-4 space-y-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Select Node</CardTitle>
              <CardDescription className="text-gray-400">
                Choose a node to explore its integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {devicesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No nodes found</p>
                ) : (
                  filteredDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDeviceId(device.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedDeviceId === device.id
                          ? "bg-blue-600 text-white"
                          : "bg-gray-750 hover:bg-gray-700 text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Server className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{device.device_name}</p>
                          <p
                            className={`text-sm truncate ${
                              selectedDeviceId === device.id
                                ? "text-blue-200"
                                : "text-gray-500"
                            }`}
                          >
                            {device.primary_address}
                          </p>
                        </div>
                        {device.is_active ? (
                          <Badge className="bg-green-600/20 text-green-400 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Explorer */}
        <div className="col-span-8 space-y-4">
          {!selectedDeviceId ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-16 text-center">
                <Server className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">
                  Select a Node
                </h3>
                <p className="text-gray-500">
                  Choose a node from the list to explore its integrations and test actions
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selected Node Info */}
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-blue-600/20">
                        <Server className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedDevice?.device_name}
                        </h2>
                        <p className="text-gray-400">
                          {selectedDevice?.primary_address}
                          {selectedDevice?.device_type && (
                            <span className="ml-2">• {selectedDevice.device_type}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-gray-400">
                        {integrations?.length || 0} integrations
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Integrations */}
              {integrationsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : !integrations || integrations.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-16 text-center">
                    <Cable className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No Integrations
                    </h3>
                    <p className="text-gray-500 mb-4">
                      This node doesn't have any integrations configured yet
                    </p>
                    <Link href="/devices">
                      <Button variant="outline" className="border-gray-600">
                        Configure Integrations
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {integrations.map((integration: any) => (
                    <IntegrationExplorer
                      key={integration.id}
                      integration={integration}
                      deviceId={selectedDeviceId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
