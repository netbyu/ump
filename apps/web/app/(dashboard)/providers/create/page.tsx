"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Download,
  Save,
  Eye,
  Code,
  Settings,
  Zap,
  Clock,
  Key,
  Shield,
  ChevronDown,
  ChevronUp,
  GripVertical,
  AlertCircle,
  CheckCircle,
  FileCode,
  Loader2,
  Globe,
  Import,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types for the provider builder
interface FieldDefinition {
  name: string;
  label: string;
  type: string;
  description: string;
  required: boolean;
  secret: boolean;
  placeholder: string;
  default_value: string;
}

interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  is_idempotent: boolean;
  inputs: FieldDefinition[];
  outputs: FieldDefinition[];
}

interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  trigger_type: "webhook" | "polling" | "event";
  outputs: FieldDefinition[];
  config_fields: FieldDefinition[];
}

interface ProviderDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  icon_url: string;
  categories: string[];
  tags: string[];
  protocol: string;
  auth_type: string;
  base_url: string;
  supports_webhooks: boolean;
  auth_fields: FieldDefinition[];
  actions: ActionDefinition[];
  triggers: TriggerDefinition[];
}

const AUTH_TYPES = [
  { value: "api_key", label: "API Key", description: "Single API key authentication" },
  { value: "basic", label: "Basic Auth", description: "Username and password" },
  { value: "bearer", label: "Bearer Token", description: "Bearer token authentication" },
  { value: "oauth2", label: "OAuth 2.0", description: "OAuth 2.0 authorization code flow" },
  { value: "oauth2_client_credentials", label: "OAuth 2.0 Client Credentials", description: "Server-to-server auth" },
  { value: "custom", label: "Custom", description: "Custom authentication scheme" },
];

const PROTOCOL_TYPES = [
  { value: "rest", label: "REST API", description: "Standard REST/HTTP APIs", icon: "🌐" },
  { value: "json_rpc", label: "JSON-RPC", description: "JSON-RPC protocol (e.g., Zabbix, Ethereum)", icon: "📡" },
  { value: "graphql", label: "GraphQL", description: "GraphQL APIs", icon: "◈" },
  { value: "soap", label: "SOAP", description: "SOAP/XML web services", icon: "📋" },
  { value: "grpc", label: "gRPC", description: "gRPC protocol", icon: "⚡" },
  { value: "websocket", label: "WebSocket", description: "WebSocket-based real-time APIs", icon: "🔌" },
  { value: "native", label: "Native SDK", description: "Native Python SDK integration (requires code)", icon: "🐍" },
  { value: "ami", label: "AMI", description: "Asterisk Manager Interface", icon: "☎️" },
  { value: "custom", label: "Custom", description: "Custom protocol implementation", icon: "⚙️" },
];

const FIELD_TYPES = [
  { value: "string", label: "String" },
  { value: "password", label: "Password" },
  { value: "number", label: "Number" },
  { value: "integer", label: "Integer" },
  { value: "boolean", label: "Boolean" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "text", label: "Text (multiline)" },
  { value: "select", label: "Select" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
];

const CATEGORIES = [
  "monitoring", "communication", "crm", "dev-tools", "analytics",
  "ticketing", "security", "infrastructure", "database", "cloud",
  "automation", "itsm", "telephony", "productivity", "storage",
];

// Empty field template
const emptyField = (): FieldDefinition => ({
  name: "",
  label: "",
  type: "string",
  description: "",
  required: false,
  secret: false,
  placeholder: "",
  default_value: "",
});

// Empty action template
const emptyAction = (): ActionDefinition => ({
  id: "",
  name: "",
  description: "",
  category: "",
  is_idempotent: false,
  inputs: [],
  outputs: [],
});

// Empty trigger template
const emptyTrigger = (): TriggerDefinition => ({
  id: "",
  name: "",
  description: "",
  trigger_type: "webhook",
  outputs: [],
  config_fields: [],
});

// Field editor component
function FieldEditor({
  field,
  onChange,
  onRemove,
}: {
  field: FieldDefinition;
  onChange: (field: FieldDefinition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-white">
            {field.name || "New Field"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Field Name (snake_case)</Label>
          <Input
            value={field.name}
            onChange={(e) => onChange({ ...field, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
            placeholder="api_key"
            className="bg-gray-700 border-gray-600 text-white text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Display Label</Label>
          <Input
            value={field.label}
            onChange={(e) => onChange({ ...field, label: e.target.value })}
            placeholder="API Key"
            className="bg-gray-700 border-gray-600 text-white text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Field Type</Label>
          <Select value={field.type} onValueChange={(v) => onChange({ ...field, type: v })}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-400">Placeholder</Label>
          <Input
            value={field.placeholder}
            onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
            placeholder="Enter value..."
            className="bg-gray-700 border-gray-600 text-white text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-gray-400">Description</Label>
        <Input
          value={field.description}
          onChange={(e) => onChange({ ...field, description: e.target.value })}
          placeholder="Field description"
          className="bg-gray-700 border-gray-600 text-white text-sm"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={field.required}
            onCheckedChange={(v) => onChange({ ...field, required: v })}
          />
          <Label className="text-xs text-gray-400">Required</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={field.secret}
            onCheckedChange={(v) => onChange({ ...field, secret: v })}
          />
          <Label className="text-xs text-gray-400">Secret (mask in UI)</Label>
        </div>
      </div>
    </div>
  );
}

// Action editor component
function ActionEditor({
  action,
  onChange,
  onRemove,
}: {
  action: ActionDefinition;
  onChange: (action: ActionDefinition) => void;
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const addInput = () => {
    onChange({ ...action, inputs: [...action.inputs, emptyField()] });
  };

  const addOutput = () => {
    onChange({ ...action, outputs: [...action.outputs, emptyField()] });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <div>
                <span className="font-medium text-white">
                  {action.name || "New Action"}
                </span>
                {action.id && (
                  <span className="text-xs text-gray-500 ml-2">({action.id})</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </Button>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Action ID (snake_case)</Label>
                <Input
                  value={action.id}
                  onChange={(e) => onChange({ ...action, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  placeholder="get_hosts"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Action Name</Label>
                <Input
                  value={action.name}
                  onChange={(e) => onChange({ ...action, name: e.target.value })}
                  placeholder="Get Hosts"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={action.description}
                onChange={(e) => onChange({ ...action, description: e.target.value })}
                placeholder="Retrieves a list of hosts from Zabbix"
                className="bg-gray-700 border-gray-600 text-white min-h-[60px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Category</Label>
                <Input
                  value={action.category}
                  onChange={(e) => onChange({ ...action, category: e.target.value })}
                  placeholder="hosts"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={action.is_idempotent}
                  onCheckedChange={(v) => onChange({ ...action, is_idempotent: v })}
                />
                <Label className="text-gray-300">Idempotent (safe to retry)</Label>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Input Parameters</Label>
                <Button variant="outline" size="sm" onClick={addInput}>
                  <Plus className="w-4 h-4 mr-1" /> Add Input
                </Button>
              </div>
              <div className="space-y-2">
                {action.inputs.map((input, idx) => (
                  <FieldEditor
                    key={idx}
                    field={input}
                    onChange={(f) => {
                      const newInputs = [...action.inputs];
                      newInputs[idx] = f;
                      onChange({ ...action, inputs: newInputs });
                    }}
                    onRemove={() => {
                      onChange({ ...action, inputs: action.inputs.filter((_, i) => i !== idx) });
                    }}
                  />
                ))}
                {action.inputs.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No input parameters defined</p>
                )}
              </div>
            </div>

            {/* Outputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Output Fields</Label>
                <Button variant="outline" size="sm" onClick={addOutput}>
                  <Plus className="w-4 h-4 mr-1" /> Add Output
                </Button>
              </div>
              <div className="space-y-2">
                {action.outputs.map((output, idx) => (
                  <FieldEditor
                    key={idx}
                    field={output}
                    onChange={(f) => {
                      const newOutputs = [...action.outputs];
                      newOutputs[idx] = f;
                      onChange({ ...action, outputs: newOutputs });
                    }}
                    onRemove={() => {
                      onChange({ ...action, outputs: action.outputs.filter((_, i) => i !== idx) });
                    }}
                  />
                ))}
                {action.outputs.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No output fields defined</p>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Trigger editor component
function TriggerEditor({
  trigger,
  onChange,
  onRemove,
}: {
  trigger: TriggerDefinition;
  onChange: (trigger: TriggerDefinition) => void;
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/30">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-400" />
              <div>
                <span className="font-medium text-white">
                  {trigger.name || "New Trigger"}
                </span>
                <Badge variant="outline" className="ml-2 text-xs">{trigger.trigger_type}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </Button>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Trigger ID</Label>
                <Input
                  value={trigger.id}
                  onChange={(e) => onChange({ ...trigger, id: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  placeholder="on_alert"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Trigger Name</Label>
                <Input
                  value={trigger.name}
                  onChange={(e) => onChange({ ...trigger, name: e.target.value })}
                  placeholder="On Alert"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Description</Label>
              <Textarea
                value={trigger.description}
                onChange={(e) => onChange({ ...trigger, description: e.target.value })}
                placeholder="Triggered when a new alert is created"
                className="bg-gray-700 border-gray-600 text-white min-h-[60px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Trigger Type</Label>
              <Select value={trigger.trigger_type} onValueChange={(v: "webhook" | "polling" | "event") => onChange({ ...trigger, trigger_type: v })}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webhook">Webhook (push)</SelectItem>
                  <SelectItem value="polling">Polling (pull)</SelectItem>
                  <SelectItem value="event">Event (real-time)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Generate YAML from provider definition
function generateYaml(provider: ProviderDefinition): string {
  const yaml: string[] = [];

  yaml.push(`# Provider manifest for ${provider.name}`);
  yaml.push(`# Generated by UCMP Provider Builder`);
  yaml.push(``);
  yaml.push(`id: "${provider.id}"`);
  yaml.push(`name: "${provider.name}"`);
  yaml.push(`description: "${provider.description}"`);
  yaml.push(`version: "${provider.version}"`);
  if (provider.icon_url) {
    yaml.push(`icon_url: "${provider.icon_url}"`);
  }
  yaml.push(``);
  yaml.push(`# Protocol type: rest, json_rpc, graphql, soap, native, ami, custom`);
  yaml.push(`protocol: ${provider.protocol}`);
  yaml.push(``);
  yaml.push(`categories:`);
  provider.categories.forEach((cat) => yaml.push(`  - ${cat}`));
  yaml.push(``);
  if (provider.tags.length > 0) {
    yaml.push(`tags:`);
    provider.tags.forEach((tag) => yaml.push(`  - ${tag}`));
    yaml.push(``);
  }
  yaml.push(`auth:`);
  yaml.push(`  type: ${provider.auth_type}`);
  if (provider.auth_fields.length > 0) {
    yaml.push(`  fields:`);
    provider.auth_fields.forEach((field) => {
      yaml.push(`    - name: ${field.name}`);
      yaml.push(`      label: "${field.label}"`);
      yaml.push(`      type: ${field.type}`);
      if (field.description) yaml.push(`      description: "${field.description}"`);
      yaml.push(`      required: ${field.required}`);
      if (field.secret) yaml.push(`      secret: true`);
      if (field.placeholder) yaml.push(`      placeholder: "${field.placeholder}"`);
    });
  }
  yaml.push(``);
  if (provider.base_url) {
    yaml.push(`base_url: "${provider.base_url}"`);
    yaml.push(``);
  }
  yaml.push(`supports_webhooks: ${provider.supports_webhooks}`);
  yaml.push(``);

  if (provider.actions.length > 0) {
    yaml.push(`actions:`);
    provider.actions.forEach((action) => {
      yaml.push(`  - id: ${action.id}`);
      yaml.push(`    name: "${action.name}"`);
      yaml.push(`    description: "${action.description}"`);
      if (action.category) yaml.push(`    category: ${action.category}`);
      yaml.push(`    is_idempotent: ${action.is_idempotent}`);
      if (action.inputs.length > 0) {
        yaml.push(`    inputs:`);
        action.inputs.forEach((input) => {
          yaml.push(`      - name: ${input.name}`);
          yaml.push(`        label: "${input.label}"`);
          yaml.push(`        type: ${input.type}`);
          if (input.description) yaml.push(`        description: "${input.description}"`);
          yaml.push(`        required: ${input.required}`);
        });
      }
      if (action.outputs.length > 0) {
        yaml.push(`    outputs:`);
        action.outputs.forEach((output) => {
          yaml.push(`      - name: ${output.name}`);
          yaml.push(`        label: "${output.label}"`);
          yaml.push(`        type: ${output.type}`);
        });
      }
    });
    yaml.push(``);
  }

  if (provider.triggers.length > 0) {
    yaml.push(`triggers:`);
    provider.triggers.forEach((trigger) => {
      yaml.push(`  - id: ${trigger.id}`);
      yaml.push(`    name: "${trigger.name}"`);
      yaml.push(`    description: "${trigger.description}"`);
      yaml.push(`    trigger_type: ${trigger.trigger_type}`);
    });
  }

  return yaml.join("\n");
}

// OpenAPI/Swagger parser helper types
interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  host?: string; // Swagger 2.0
  basePath?: string; // Swagger 2.0
  paths?: Record<string, Record<string, OpenAPIOperation>>;
  securityDefinitions?: Record<string, OpenAPISecurityScheme>; // Swagger 2.0
  components?: {
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    schemas?: Record<string, unknown>;
  };
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: {
    content?: Record<string, { schema?: OpenAPISchema }>;
    required?: boolean;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: OpenAPISchema }> }>;
}

interface OpenAPIParameter {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  schema?: OpenAPISchema;
  type?: string; // Swagger 2.0
}

interface OpenAPISchema {
  type?: string;
  format?: string;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  $ref?: string;
}

interface OpenAPISecurityScheme {
  type: string;
  scheme?: string;
  name?: string;
  in?: string;
  flows?: Record<string, unknown>;
}

// Convert OpenAPI type to our field type
function mapOpenAPIType(schema?: OpenAPISchema | string): string {
  if (!schema) return "string";
  const type = typeof schema === "string" ? schema : schema.type;
  switch (type) {
    case "integer":
    case "int":
    case "int32":
    case "int64":
      return "integer";
    case "number":
    case "float":
    case "double":
      return "number";
    case "boolean":
    case "bool":
      return "boolean";
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return "string";
  }
}

// Convert HTTP method to action ID prefix
function methodToPrefix(method: string): string {
  switch (method.toLowerCase()) {
    case "get": return "get";
    case "post": return "create";
    case "put": return "update";
    case "patch": return "patch";
    case "delete": return "delete";
    default: return method.toLowerCase();
  }
}

// Convert path to action ID (e.g., /api/hosts/{id} -> hosts_by_id)
function pathToActionId(path: string, method: string): string {
  const cleanPath = path
    .replace(/^\/api\/v\d+\/?/i, "") // Remove /api/v1/ prefix
    .replace(/^\/api\/?/i, "") // Remove /api/ prefix
    .replace(/\{([^}]+)\}/g, "by_$1") // {id} -> by_id
    .replace(/[\/\-\.]/g, "_") // Replace / - . with _
    .replace(/^_+|_+$/g, "") // Trim underscores
    .toLowerCase();

  return `${methodToPrefix(method)}_${cleanPath}`;
}

// Convert path to action name (e.g., /api/hosts/{id} -> Get Host by ID)
function pathToActionName(path: string, method: string, summary?: string): string {
  if (summary) return summary;

  const prefix = method.toLowerCase() === "get" ? "Get" :
                 method.toLowerCase() === "post" ? "Create" :
                 method.toLowerCase() === "put" ? "Update" :
                 method.toLowerCase() === "patch" ? "Patch" :
                 method.toLowerCase() === "delete" ? "Delete" : method;

  const cleanPath = path
    .replace(/^\/api\/v\d+\/?/i, "")
    .replace(/^\/api\/?/i, "")
    .replace(/\{([^}]+)\}/g, "by $1")
    .replace(/[\/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${prefix} ${cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1)}`;
}

// Parse OpenAPI spec and extract actions
function parseOpenAPISpec(spec: OpenAPISpec): {
  name: string;
  description: string;
  version: string;
  baseUrl: string;
  authType: string;
  authFields: FieldDefinition[];
  actions: ActionDefinition[];
} {
  const result = {
    name: spec.info?.title || "API Provider",
    description: spec.info?.description || "",
    version: spec.info?.version || "1.0.0",
    baseUrl: "",
    authType: "api_key",
    authFields: [] as FieldDefinition[],
    actions: [] as ActionDefinition[],
  };

  // Extract base URL
  if (spec.servers && spec.servers.length > 0) {
    result.baseUrl = spec.servers[0].url;
  } else if (spec.host) {
    result.baseUrl = `https://${spec.host}${spec.basePath || ""}`;
  }

  // Extract security schemes
  const securitySchemes = spec.components?.securitySchemes || spec.securityDefinitions || {};
  for (const [name, scheme] of Object.entries(securitySchemes)) {
    if (scheme.type === "apiKey") {
      result.authType = "api_key";
      result.authFields.push({
        name: scheme.name || "api_key",
        label: `API Key${scheme.in ? ` (${scheme.in})` : ""}`,
        type: "password",
        description: `API key for authentication${scheme.in ? ` - sent in ${scheme.in}` : ""}`,
        required: true,
        secret: true,
        placeholder: "",
        default_value: "",
      });
    } else if (scheme.type === "http" && scheme.scheme === "bearer") {
      result.authType = "bearer";
      result.authFields.push({
        name: "access_token",
        label: "Access Token",
        type: "password",
        description: "Bearer token for authentication",
        required: true,
        secret: true,
        placeholder: "",
        default_value: "",
      });
    } else if (scheme.type === "http" && scheme.scheme === "basic") {
      result.authType = "basic";
      result.authFields.push(
        {
          name: "username",
          label: "Username",
          type: "string",
          description: "Username for basic authentication",
          required: true,
          secret: false,
          placeholder: "",
          default_value: "",
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          description: "Password for basic authentication",
          required: true,
          secret: true,
          placeholder: "",
          default_value: "",
        }
      );
    } else if (scheme.type === "oauth2") {
      result.authType = "oauth2";
      result.authFields.push(
        {
          name: "client_id",
          label: "Client ID",
          type: "string",
          description: "OAuth2 client ID",
          required: true,
          secret: false,
          placeholder: "",
          default_value: "",
        },
        {
          name: "client_secret",
          label: "Client Secret",
          type: "password",
          description: "OAuth2 client secret",
          required: true,
          secret: true,
          placeholder: "",
          default_value: "",
        }
      );
    }
  }

  // If no auth found, add a default API key field
  if (result.authFields.length === 0) {
    result.authFields.push({
      name: "api_key",
      label: "API Key",
      type: "password",
      description: "API key for authentication",
      required: true,
      secret: true,
      placeholder: "",
      default_value: "",
    });
  }

  // Extract actions from paths
  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (!["get", "post", "put", "patch", "delete"].includes(method.toLowerCase())) continue;

        const actionId = operation.operationId || pathToActionId(path, method);
        const actionName = pathToActionName(path, method, operation.summary);
        const category = operation.tags?.[0] || "";

        const inputs: FieldDefinition[] = [];
        const outputs: FieldDefinition[] = [];

        // Add path parameters
        if (operation.parameters) {
          for (const param of operation.parameters) {
            inputs.push({
              name: param.name,
              label: param.name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
              type: mapOpenAPIType(param.schema || param.type),
              description: param.description || "",
              required: param.required || param.in === "path",
              secret: false,
              placeholder: "",
              default_value: "",
            });
          }
        }

        // Add request body fields for POST/PUT/PATCH
        if (operation.requestBody?.content) {
          const content = operation.requestBody.content["application/json"];
          if (content?.schema?.properties) {
            for (const [propName, propSchema] of Object.entries(content.schema.properties)) {
              const schema = propSchema as OpenAPISchema;
              inputs.push({
                name: propName,
                label: propName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                type: mapOpenAPIType(schema),
                description: "",
                required: operation.requestBody.required || false,
                secret: false,
                placeholder: "",
                default_value: "",
              });
            }
          }
        }

        // Add generic output for response
        outputs.push({
          name: "response",
          label: "Response",
          type: "object",
          description: "API response data",
          required: true,
          secret: false,
          placeholder: "",
          default_value: "",
        });

        result.actions.push({
          id: actionId.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          name: actionName,
          description: operation.description || operation.summary || `${method.toUpperCase()} ${path}`,
          category,
          is_idempotent: ["get", "put", "delete"].includes(method.toLowerCase()),
          inputs,
          outputs,
        });
      }
    }
  }

  return result;
}

// Zabbix template
const zabbixTemplate: ProviderDefinition = {
  id: "zabbix",
  name: "Zabbix",
  description: "Enterprise-class open source distributed monitoring solution",
  version: "1.0.0",
  icon_url: "https://assets.zabbix.com/img/favicon.ico",
  categories: ["monitoring", "infrastructure"],
  tags: ["monitoring", "alerting", "metrics", "hosts"],
  protocol: "json_rpc",
  auth_type: "custom",
  base_url: "",
  supports_webhooks: true,
  auth_fields: [
    {
      name: "url",
      label: "Zabbix API URL",
      type: "url",
      description: "URL to your Zabbix server API endpoint",
      required: true,
      secret: false,
      placeholder: "https://zabbix.example.com/api_jsonrpc.php",
      default_value: "",
    },
    {
      name: "auth_method",
      label: "Authentication Method",
      type: "select",
      description: "Choose API Token (Zabbix 5.4+) or Username/Password",
      required: true,
      secret: false,
      placeholder: "",
      default_value: "token",
    },
    {
      name: "api_token",
      label: "API Token",
      type: "password",
      description: "Zabbix API token (required if using token auth)",
      required: false,
      secret: true,
      placeholder: "",
      default_value: "",
    },
    {
      name: "username",
      label: "Username",
      type: "string",
      description: "Zabbix username (required if using password auth)",
      required: false,
      secret: false,
      placeholder: "",
      default_value: "",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      description: "Zabbix password (required if using password auth)",
      required: false,
      secret: true,
      placeholder: "",
      default_value: "",
    },
  ],
  actions: [
    {
      id: "get_hosts",
      name: "Get Hosts",
      description: "Retrieve a list of hosts from Zabbix",
      category: "hosts",
      is_idempotent: true,
      inputs: [
        { name: "group_ids", label: "Host Group IDs", type: "array", description: "Filter by host group IDs", required: false, secret: false, placeholder: "", default_value: "" },
        { name: "host_ids", label: "Host IDs", type: "array", description: "Filter by specific host IDs", required: false, secret: false, placeholder: "", default_value: "" },
        { name: "search", label: "Search", type: "string", description: "Search hosts by name pattern", required: false, secret: false, placeholder: "", default_value: "" },
      ],
      outputs: [
        { name: "hosts", label: "Hosts", type: "array", description: "List of hosts", required: true, secret: false, placeholder: "", default_value: "" },
      ],
    },
    {
      id: "get_problems",
      name: "Get Problems",
      description: "Retrieve current problems/alerts from Zabbix",
      category: "problems",
      is_idempotent: true,
      inputs: [
        { name: "severity", label: "Minimum Severity", type: "integer", description: "Minimum severity level (0-5)", required: false, secret: false, placeholder: "", default_value: "" },
        { name: "host_ids", label: "Host IDs", type: "array", description: "Filter by specific host IDs", required: false, secret: false, placeholder: "", default_value: "" },
        { name: "acknowledged", label: "Acknowledged", type: "boolean", description: "Filter by acknowledgement status", required: false, secret: false, placeholder: "", default_value: "" },
      ],
      outputs: [
        { name: "problems", label: "Problems", type: "array", description: "List of problems", required: true, secret: false, placeholder: "", default_value: "" },
      ],
    },
    {
      id: "acknowledge_event",
      name: "Acknowledge Event",
      description: "Acknowledge an event/problem in Zabbix",
      category: "events",
      is_idempotent: false,
      inputs: [
        { name: "event_ids", label: "Event IDs", type: "array", description: "IDs of events to acknowledge", required: true, secret: false, placeholder: "", default_value: "" },
        { name: "message", label: "Message", type: "text", description: "Acknowledgement message", required: false, secret: false, placeholder: "", default_value: "" },
        { name: "close", label: "Close Problem", type: "boolean", description: "Close the problem", required: false, secret: false, placeholder: "", default_value: "" },
      ],
      outputs: [
        { name: "event_ids", label: "Acknowledged Event IDs", type: "array", description: "IDs of acknowledged events", required: true, secret: false, placeholder: "", default_value: "" },
      ],
    },
    {
      id: "get_host_groups",
      name: "Get Host Groups",
      description: "Retrieve host groups from Zabbix",
      category: "groups",
      is_idempotent: true,
      inputs: [
        { name: "search", label: "Search", type: "string", description: "Search groups by name", required: false, secret: false, placeholder: "", default_value: "" },
      ],
      outputs: [
        { name: "groups", label: "Host Groups", type: "array", description: "List of host groups", required: true, secret: false, placeholder: "", default_value: "" },
      ],
    },
    {
      id: "create_host",
      name: "Create Host",
      description: "Create a new host in Zabbix",
      category: "hosts",
      is_idempotent: false,
      inputs: [
        { name: "host", label: "Technical Name", type: "string", description: "Technical name of the host", required: true, secret: false, placeholder: "", default_value: "" },
        { name: "name", label: "Display Name", type: "string", description: "Visible name of the host", required: false, secret: false, placeholder: "", default_value: "" },
        { name: "groups", label: "Group IDs", type: "array", description: "Host group IDs", required: true, secret: false, placeholder: "", default_value: "" },
        { name: "interfaces", label: "Interfaces", type: "object", description: "Host interfaces configuration", required: true, secret: false, placeholder: "", default_value: "" },
        { name: "templates", label: "Template IDs", type: "array", description: "Template IDs to link", required: false, secret: false, placeholder: "", default_value: "" },
      ],
      outputs: [
        { name: "host_id", label: "Host ID", type: "string", description: "ID of the created host", required: true, secret: false, placeholder: "", default_value: "" },
      ],
    },
  ],
  triggers: [
    {
      id: "on_problem",
      name: "On Problem",
      description: "Triggered when a new problem occurs in Zabbix",
      trigger_type: "webhook",
      outputs: [],
      config_fields: [],
    },
    {
      id: "on_recovery",
      name: "On Recovery",
      description: "Triggered when a problem is resolved",
      trigger_type: "webhook",
      outputs: [],
      config_fields: [],
    },
  ],
};

export default function CreateProviderPage() {
  const [provider, setProvider] = useState<ProviderDefinition>({
    id: "",
    name: "",
    description: "",
    version: "1.0.0",
    icon_url: "",
    categories: [],
    tags: [],
    protocol: "rest",
    auth_type: "api_key",
    base_url: "",
    supports_webhooks: false,
    auth_fields: [],
    actions: [],
    triggers: [],
  });

  const [activeTab, setActiveTab] = useState("basic");
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Swagger/OpenAPI import state
  const [swaggerUrl, setSwaggerUrl] = useState("");
  const [swaggerLoading, setSwaggerLoading] = useState(false);
  const [swaggerError, setSwaggerError] = useState<string | null>(null);
  const [swaggerSuccess, setSwaggerSuccess] = useState<string | null>(null);
  const [showSwaggerImport, setShowSwaggerImport] = useState(false);

  // Swagger auth config
  const [swaggerAuthType, setSwaggerAuthType] = useState<"none" | "basic" | "bearer" | "api_key" | "custom_header">("none");
  const [swaggerAuthUsername, setSwaggerAuthUsername] = useState("");
  const [swaggerAuthPassword, setSwaggerAuthPassword] = useState("");
  const [swaggerAuthToken, setSwaggerAuthToken] = useState("");
  const [swaggerApiKeyHeader, setSwaggerApiKeyHeader] = useState("X-API-Key");
  const [swaggerApiKeyValue, setSwaggerApiKeyValue] = useState("");
  const [swaggerCustomHeaderName, setSwaggerCustomHeaderName] = useState("");
  const [swaggerCustomHeaderValue, setSwaggerCustomHeaderValue] = useState("");

  // Load Zabbix template
  const loadTemplate = (template: ProviderDefinition) => {
    setProvider(template);
  };

  // Import from Swagger/OpenAPI URL
  const importFromSwagger = async () => {
    if (!swaggerUrl.trim()) {
      setSwaggerError("Please enter a Swagger/OpenAPI URL");
      return;
    }

    setSwaggerLoading(true);
    setSwaggerError(null);
    setSwaggerSuccess(null);

    try {
      // Build request headers based on auth type
      const headers: Record<string, string> = {};

      switch (swaggerAuthType) {
        case "basic":
          if (swaggerAuthUsername || swaggerAuthPassword) {
            const credentials = btoa(`${swaggerAuthUsername}:${swaggerAuthPassword}`);
            headers["Authorization"] = `Basic ${credentials}`;
          }
          break;
        case "bearer":
          if (swaggerAuthToken) {
            headers["Authorization"] = `Bearer ${swaggerAuthToken}`;
          }
          break;
        case "api_key":
          if (swaggerApiKeyHeader && swaggerApiKeyValue) {
            headers[swaggerApiKeyHeader] = swaggerApiKeyValue;
          }
          break;
        case "custom_header":
          if (swaggerCustomHeaderName && swaggerCustomHeaderValue) {
            headers[swaggerCustomHeaderName] = swaggerCustomHeaderValue;
          }
          break;
      }

      // Fetch the OpenAPI spec
      const response = await fetch(swaggerUrl, {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      let spec: OpenAPISpec;

      if (contentType.includes("yaml") || swaggerUrl.endsWith(".yaml") || swaggerUrl.endsWith(".yml")) {
        // For YAML, we need to parse it - for now just try JSON
        const text = await response.text();
        // Simple YAML to JSON for basic cases (proper parsing would need a library)
        try {
          spec = JSON.parse(text);
        } catch {
          throw new Error("YAML parsing not fully supported. Please use a JSON OpenAPI spec or convert to JSON first.");
        }
      } else {
        spec = await response.json();
      }

      // Validate it's an OpenAPI spec
      if (!spec.openapi && !spec.swagger) {
        throw new Error("Invalid OpenAPI/Swagger spec: missing 'openapi' or 'swagger' version field");
      }

      // Parse the spec
      const parsed = parseOpenAPISpec(spec);

      // Generate provider ID from name
      const providerId = parsed.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      // Update provider with parsed data
      setProvider((prev) => ({
        ...prev,
        id: providerId,
        name: parsed.name,
        description: parsed.description.slice(0, 500), // Limit description length
        version: parsed.version,
        protocol: "rest", // OpenAPI specs are typically REST APIs
        base_url: parsed.baseUrl,
        auth_type: parsed.authType,
        auth_fields: parsed.authFields,
        actions: parsed.actions,
        categories: prev.categories.length > 0 ? prev.categories : ["api"],
      }));

      setSwaggerSuccess(`Imported ${parsed.actions.length} actions from ${parsed.name}`);
      setShowSwaggerImport(false);
      setActiveTab("actions"); // Switch to actions tab to show imported actions
    } catch (err) {
      setSwaggerError(err instanceof Error ? err.message : "Failed to import OpenAPI spec");
    } finally {
      setSwaggerLoading(false);
    }
  };

  // Add category
  const addCategory = () => {
    if (newCategory && !provider.categories.includes(newCategory)) {
      setProvider({ ...provider, categories: [...provider.categories, newCategory] });
      setNewCategory("");
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag && !provider.tags.includes(newTag)) {
      setProvider({ ...provider, tags: [...provider.tags, newTag] });
      setNewTag("");
    }
  };

  // Add auth field
  const addAuthField = () => {
    setProvider({ ...provider, auth_fields: [...provider.auth_fields, emptyField()] });
  };

  // Add action
  const addAction = () => {
    setProvider({ ...provider, actions: [...provider.actions, emptyAction()] });
  };

  // Add trigger
  const addTrigger = () => {
    setProvider({ ...provider, triggers: [...provider.triggers, emptyTrigger()] });
  };

  // Copy YAML to clipboard
  const copyYaml = async () => {
    const yaml = generateYaml(provider);
    await navigator.clipboard.writeText(yaml);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Download YAML file
  const downloadYaml = () => {
    const yaml = generateYaml(provider);
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${provider.id || "provider"}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save provider (call API)
  const saveProvider = async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch("http://localhost:8003/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifest_yaml: generateYaml(provider),
        }),
      });
      if (!response.ok) throw new Error("Failed to save provider");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const yaml = generateYaml(provider);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/providers"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Provider</h1>
            <p className="text-gray-400 text-sm">Define a new integration provider manifest</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSwaggerImport(!showSwaggerImport)}
            className={showSwaggerImport ? "bg-blue-600/20 border-blue-500" : ""}
          >
            <Globe className="w-4 h-4 mr-2" />
            Import from Swagger
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadTemplate(zabbixTemplate)}
          >
            <FileCode className="w-4 h-4 mr-2" />
            Load Zabbix Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? <Settings className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showPreview ? "Edit" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" onClick={copyYaml}>
            {copySuccess ? <CheckCircle className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
            {copySuccess ? "Copied!" : "Copy YAML"}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadYaml}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={saveProvider}
            disabled={!provider.id || !provider.name || saveStatus === "saving"}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveStatus === "saving" ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : saveStatus === "success" ? (
              <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saveStatus === "saving" ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save Provider"}
          </Button>
        </div>
      </div>

      {/* Swagger Import Panel */}
      {showSwaggerImport && (
        <Card className="bg-gray-800 border-gray-700 border-blue-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Import from OpenAPI / Swagger
            </CardTitle>
            <CardDescription className="text-gray-400">
              Enter a URL to an OpenAPI 3.x or Swagger 2.0 specification (JSON format) to auto-generate actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL Input */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">Swagger/OpenAPI URL</Label>
              <div className="flex gap-3">
                <Input
                  value={swaggerUrl}
                  onChange={(e) => setSwaggerUrl(e.target.value)}
                  placeholder="https://api.example.com/openapi.json or /docs/swagger.json"
                  className="bg-gray-700 border-gray-600 text-white flex-1"
                  onKeyDown={(e) => e.key === "Enter" && importFromSwagger()}
                />
                <Button
                  onClick={importFromSwagger}
                  disabled={swaggerLoading || !swaggerUrl.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {swaggerLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Import className="w-4 h-4 mr-2" />
                  )}
                  {swaggerLoading ? "Importing..." : "Import"}
                </Button>
              </div>
            </div>

            {/* Authentication Section */}
            <div className="space-y-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-400" />
                <Label className="text-gray-300 text-sm font-medium">Authentication (optional)</Label>
              </div>

              <div className="space-y-2">
                <Select
                  value={swaggerAuthType}
                  onValueChange={(v: "none" | "basic" | "bearer" | "api_key" | "custom_header") => setSwaggerAuthType(v)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select auth method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Authentication</SelectItem>
                    <SelectItem value="basic">Basic Auth (username/password)</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="api_key">API Key Header</SelectItem>
                    <SelectItem value="custom_header">Custom Header</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Auth Fields */}
              {swaggerAuthType === "basic" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Username</Label>
                    <Input
                      value={swaggerAuthUsername}
                      onChange={(e) => setSwaggerAuthUsername(e.target.value)}
                      placeholder="username"
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Password</Label>
                    <Input
                      type="password"
                      value={swaggerAuthPassword}
                      onChange={(e) => setSwaggerAuthPassword(e.target.value)}
                      placeholder="password"
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Bearer Token Field */}
              {swaggerAuthType === "bearer" && (
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Bearer Token</Label>
                  <Input
                    type="password"
                    value={swaggerAuthToken}
                    onChange={(e) => setSwaggerAuthToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIs..."
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                  />
                </div>
              )}

              {/* API Key Fields */}
              {swaggerAuthType === "api_key" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Header Name</Label>
                    <Input
                      value={swaggerApiKeyHeader}
                      onChange={(e) => setSwaggerApiKeyHeader(e.target.value)}
                      placeholder="X-API-Key"
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">API Key</Label>
                    <Input
                      type="password"
                      value={swaggerApiKeyValue}
                      onChange={(e) => setSwaggerApiKeyValue(e.target.value)}
                      placeholder="your-api-key"
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Custom Header Fields */}
              {swaggerAuthType === "custom_header" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Header Name</Label>
                    <Input
                      value={swaggerCustomHeaderName}
                      onChange={(e) => setSwaggerCustomHeaderName(e.target.value)}
                      placeholder="X-Custom-Auth"
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Header Value</Label>
                    <Input
                      type="password"
                      value={swaggerCustomHeaderValue}
                      onChange={(e) => setSwaggerCustomHeaderValue(e.target.value)}
                      placeholder="header-value"
                      className="bg-gray-700 border-gray-600 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {swaggerAuthType !== "none" && (
                <p className="text-xs text-gray-500">
                  Credentials are only used for fetching the spec and are not stored.
                </p>
              )}
            </div>

            {swaggerError && (
              <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-300">{swaggerError}</div>
              </div>
            )}

            {swaggerSuccess && (
              <div className="flex items-start gap-2 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-300">{swaggerSuccess}</div>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-400">Example URLs:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSwaggerUrl("https://petstore3.swagger.io/api/v3/openapi.json")}
                  className="text-left hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Petstore API (demo)
                </button>
                <button
                  type="button"
                  onClick={() => setSwaggerUrl("https://api.github.com/openapi.json")}
                  className="text-left hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  GitHub API
                </button>
              </div>
              <p className="mt-2 text-gray-500">
                The importer will extract: API info, authentication schemes, and all endpoints as actions.
                You can edit the imported data after import.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Mode */}
      {showPreview ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Code className="w-5 h-5" />
              YAML Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 font-mono">
              {yaml}
            </pre>
          </CardContent>
        </Card>
      ) : (
        /* Editor Mode */
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-800 border-gray-700">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="actions">Actions ({provider.actions.length})</TabsTrigger>
                <TabsTrigger value="triggers">Triggers ({provider.triggers.length})</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Provider Details</CardTitle>
                    <CardDescription className="text-gray-400">
                      Basic information about the provider
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Provider ID *</Label>
                        <Input
                          value={provider.id}
                          onChange={(e) => setProvider({ ...provider, id: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                          placeholder="zabbix"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                        <p className="text-xs text-gray-500">Unique identifier (lowercase, hyphens)</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Provider Name *</Label>
                        <Input
                          value={provider.name}
                          onChange={(e) => setProvider({ ...provider, name: e.target.value })}
                          placeholder="Zabbix"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Description *</Label>
                      <Textarea
                        value={provider.description}
                        onChange={(e) => setProvider({ ...provider, description: e.target.value })}
                        placeholder="Enterprise-class open source distributed monitoring solution"
                        className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Version</Label>
                        <Input
                          value={provider.version}
                          onChange={(e) => setProvider({ ...provider, version: e.target.value })}
                          placeholder="1.0.0"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-300">Icon URL</Label>
                        <Input
                          value={provider.icon_url}
                          onChange={(e) => setProvider({ ...provider, icon_url: e.target.value })}
                          placeholder="https://example.com/icon.png"
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Protocol Type</Label>
                      <Select
                        value={provider.protocol}
                        onValueChange={(v) => setProvider({ ...provider, protocol: v })}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROTOCOL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.icon}</span>
                                <span>{type.label}</span>
                                <span className="text-xs text-gray-500">- {type.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        How this provider communicates with the external service.
                        {provider.protocol === "native" && (
                          <span className="text-yellow-400 ml-1">
                            Native SDK requires Python code implementation.
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Base URL</Label>
                      <Input
                        value={provider.base_url}
                        onChange={(e) => setProvider({ ...provider, base_url: e.target.value })}
                        placeholder="https://api.example.com"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                      <p className="text-xs text-gray-500">Default API base URL (can be overridden per connector)</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={provider.supports_webhooks}
                        onCheckedChange={(v) => setProvider({ ...provider, supports_webhooks: v })}
                      />
                      <Label className="text-gray-300">Supports Webhooks</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Categories & Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Categories</Label>
                      <div className="flex gap-2">
                        <Select value={newCategory} onValueChange={setNewCategory}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white flex-1">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={addCategory}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {provider.categories.map((cat) => (
                          <Badge key={cat} className="bg-blue-600">
                            {cat}
                            <button
                              onClick={() => setProvider({ ...provider, categories: provider.categories.filter((c) => c !== cat) })}
                              className="ml-2 hover:text-red-300"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Tags</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add tag..."
                          className="bg-gray-700 border-gray-600 text-white"
                          onKeyDown={(e) => e.key === "Enter" && addTag()}
                        />
                        <Button variant="outline" onClick={addTag}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {provider.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                            <button
                              onClick={() => setProvider({ ...provider, tags: provider.tags.filter((t) => t !== tag) })}
                              className="ml-2 hover:text-red-300"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Authentication Tab */}
              <TabsContent value="auth" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Authentication Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Authentication Type</Label>
                      <Select
                        value={provider.auth_type}
                        onValueChange={(v) => setProvider({ ...provider, auth_type: v })}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTH_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <span>{type.label}</span>
                                <span className="text-xs text-gray-500 ml-2">- {type.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-300">Authentication Fields</Label>
                        <Button variant="outline" size="sm" onClick={addAuthField}>
                          <Plus className="w-4 h-4 mr-1" /> Add Field
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {provider.auth_fields.map((field, idx) => (
                          <FieldEditor
                            key={idx}
                            field={field}
                            onChange={(f) => {
                              const newFields = [...provider.auth_fields];
                              newFields[idx] = f;
                              setProvider({ ...provider, auth_fields: newFields });
                            }}
                            onRemove={() => {
                              setProvider({ ...provider, auth_fields: provider.auth_fields.filter((_, i) => i !== idx) });
                            }}
                          />
                        ))}
                        {provider.auth_fields.length === 0 && (
                          <p className="text-sm text-gray-500 italic text-center py-4">
                            No authentication fields defined. Click "Add Field" to add credentials.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Actions Tab */}
              <TabsContent value="actions" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Actions</h3>
                  <Button variant="outline" onClick={addAction}>
                    <Plus className="w-4 h-4 mr-2" /> Add Action
                  </Button>
                </div>
                <div className="space-y-4">
                  {provider.actions.map((action, idx) => (
                    <ActionEditor
                      key={idx}
                      action={action}
                      onChange={(a) => {
                        const newActions = [...provider.actions];
                        newActions[idx] = a;
                        setProvider({ ...provider, actions: newActions });
                      }}
                      onRemove={() => {
                        setProvider({ ...provider, actions: provider.actions.filter((_, i) => i !== idx) });
                      }}
                    />
                  ))}
                  {provider.actions.length === 0 && (
                    <Card className="bg-gray-800 border-gray-700 border-dashed">
                      <CardContent className="py-8 text-center">
                        <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No actions defined</p>
                        <p className="text-sm text-gray-500">Actions are operations that can be performed on the external service</p>
                        <Button variant="outline" className="mt-4" onClick={addAction}>
                          <Plus className="w-4 h-4 mr-2" /> Add First Action
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Triggers Tab */}
              <TabsContent value="triggers" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Triggers</h3>
                  <Button variant="outline" onClick={addTrigger}>
                    <Plus className="w-4 h-4 mr-2" /> Add Trigger
                  </Button>
                </div>
                <div className="space-y-4">
                  {provider.triggers.map((trigger, idx) => (
                    <TriggerEditor
                      key={idx}
                      trigger={trigger}
                      onChange={(t) => {
                        const newTriggers = [...provider.triggers];
                        newTriggers[idx] = t;
                        setProvider({ ...provider, triggers: newTriggers });
                      }}
                      onRemove={() => {
                        setProvider({ ...provider, triggers: provider.triggers.filter((_, i) => i !== idx) });
                      }}
                    />
                  ))}
                  {provider.triggers.length === 0 && (
                    <Card className="bg-gray-800 border-gray-700 border-dashed">
                      <CardContent className="py-8 text-center">
                        <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No triggers defined</p>
                        <p className="text-sm text-gray-500">Triggers initiate workflows based on events from the external service</p>
                        <Button variant="outline" className="mt-4" onClick={addTrigger}>
                          <Plus className="w-4 h-4 mr-2" /> Add First Trigger
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Live Preview */}
          <div className="space-y-4">
            <Card className="bg-gray-800 border-gray-700 sticky top-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Live YAML Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 rounded-lg p-3 overflow-x-auto text-xs text-gray-300 font-mono max-h-[600px] overflow-y-auto">
                  {yaml}
                </pre>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {provider.id ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={provider.id ? "text-green-400" : "text-yellow-400"}>
                    Provider ID {provider.id ? "set" : "required"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {provider.name ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={provider.name ? "text-green-400" : "text-yellow-400"}>
                    Provider name {provider.name ? "set" : "required"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {provider.categories.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={provider.categories.length > 0 ? "text-green-400" : "text-yellow-400"}>
                    {provider.categories.length} categories
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {provider.auth_fields.length > 0 ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                  )}
                  <span className={provider.auth_fields.length > 0 ? "text-green-400" : "text-gray-500"}>
                    {provider.auth_fields.length} auth fields
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400">
                    {provider.actions.length} actions
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-400">
                    {provider.triggers.length} triggers
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
