"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plug,
  Check,
  X,
  Plus,
  Search,
  Loader2,
  Phone,
  MessageSquare,
  Server,
  TestTube,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// API base URL - can be configured via environment variable
const CONNECTORS_API = process.env.NEXT_PUBLIC_CONNECTORS_API || "http://localhost:8001";

interface Connector {
  id: string;
  name: string;
  description: string;
  version: string;
  icon_url?: string;
  categories: string[];
  tags: string[];
  auth_type: string;
  supports_webhooks: boolean;
}

interface Credential {
  id: string;
  connector_id: string;
  name: string;
  auth_type: string;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

// Mock data for when API is not available
const MOCK_CONNECTORS: Connector[] = [
  {
    id: "twilio",
    name: "Twilio",
    description: "Cloud communications platform for SMS, Voice, and messaging",
    version: "1.0.0",
    icon_url: "https://www.twilio.com/favicon.ico",
    categories: ["telephony", "sms", "voice"],
    tags: ["communication", "sms", "voice", "mms"],
    auth_type: "basic",
    supports_webhooks: true,
  },
  {
    id: "asterisk_ami",
    name: "Asterisk AMI",
    description: "Connect to Asterisk PBX via AMI (Asterisk Manager Interface)",
    version: "1.0.0",
    icon_url: undefined,
    categories: ["telephony", "pbx", "voip"],
    tags: ["asterisk", "pbx", "sip", "voip"],
    auth_type: "custom",
    supports_webhooks: false,
  },
  {
    id: "httpbin",
    name: "HTTPBin",
    description: "Testing connector using httpbin.org",
    version: "1.0.0",
    icon_url: "https://httpbin.org/static/favicon.ico",
    categories: ["testing", "development"],
    tags: ["http", "testing", "debugging"],
    auth_type: "api_key",
    supports_webhooks: false,
  },
];

const MOCK_CREDENTIALS: Credential[] = [
  {
    id: "cred-1",
    connector_id: "twilio",
    name: "Production Twilio",
    auth_type: "basic",
    is_valid: true,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    last_used_at: "2024-01-20T15:30:00Z",
  },
];

// Category icon mapping
function getCategoryIcon(categories: string[]) {
  if (categories.includes("telephony") || categories.includes("voice")) {
    return <Phone className="w-5 h-5" />;
  }
  if (categories.includes("sms") || categories.includes("messaging")) {
    return <MessageSquare className="w-5 h-5" />;
  }
  if (categories.includes("testing") || categories.includes("development")) {
    return <TestTube className="w-5 h-5" />;
  }
  if (categories.includes("pbx") || categories.includes("voip")) {
    return <Server className="w-5 h-5" />;
  }
  return <Plug className="w-5 h-5" />;
}

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [connectForm, setConnectForm] = useState<Record<string, string>>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch connectors and credentials on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Try to fetch from API
        const [connectorsRes, credentialsRes] = await Promise.all([
          fetch(`${CONNECTORS_API}/api/connectors`),
          fetch(`${CONNECTORS_API}/api/credentials`),
        ]);

        if (connectorsRes.ok) {
          const connectorsData = await connectorsRes.json();
          setConnectors(connectorsData);
        } else {
          // Use mock data
          setConnectors(MOCK_CONNECTORS);
        }

        if (credentialsRes.ok) {
          const credentialsData = await credentialsRes.json();
          setCredentials(credentialsData);
        } else {
          setCredentials(MOCK_CREDENTIALS);
        }
      } catch (error) {
        console.log("API not available, using mock data");
        setConnectors(MOCK_CONNECTORS);
        setCredentials(MOCK_CREDENTIALS);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Filter connectors by search query
  const filteredConnectors = connectors.filter(
    (connector) =>
      connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  // Check if a connector is connected
  function isConnected(connectorId: string): boolean {
    return credentials.some(
      (cred) => cred.connector_id === connectorId && cred.is_valid
    );
  }

  // Get credential for a connector
  function getCredential(connectorId: string): Credential | undefined {
    return credentials.find((cred) => cred.connector_id === connectorId);
  }

  // Handle opening connect dialog
  function handleConnect(connector: Connector) {
    setSelectedConnector(connector);
    setConnectForm({});
    setConnectionStatus(null);
    setIsConnectDialogOpen(true);
  }

  // Test connection
  async function handleTestConnection() {
    if (!selectedConnector) return;

    setIsConnecting(true);
    setConnectionStatus(null);

    try {
      const response = await fetch(
        `${CONNECTORS_API}/api/connectors/${selectedConnector.id}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credentials: connectForm }),
        }
      );

      const result = await response.json();
      setConnectionStatus({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: "Failed to connect to API",
      });
    } finally {
      setIsConnecting(false);
    }
  }

  // Save credentials
  async function handleSaveCredentials() {
    if (!selectedConnector) return;

    setIsConnecting(true);

    try {
      const response = await fetch(`${CONNECTORS_API}/api/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connector_id: selectedConnector.id,
          name: `${selectedConnector.name} Connection`,
          credentials: connectForm,
        }),
      });

      if (response.ok) {
        const newCred = await response.json();
        setCredentials([...credentials, newCred]);
        setIsConnectDialogOpen(false);
      } else {
        const error = await response.json();
        setConnectionStatus({
          success: false,
          message: error.detail || "Failed to save credentials",
        });
      }
    } catch (error) {
      // Mock save for demo
      const mockCred: Credential = {
        id: `cred-${Date.now()}`,
        connector_id: selectedConnector.id,
        name: `${selectedConnector.name} Connection`,
        auth_type: selectedConnector.auth_type,
        is_valid: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCredentials([...credentials, mockCred]);
      setIsConnectDialogOpen(false);
    } finally {
      setIsConnecting(false);
    }
  }

  // Get auth fields based on auth type
  function getAuthFields(connector: Connector): { name: string; label: string; type: string }[] {
    switch (connector.auth_type) {
      case "basic":
        return [
          { name: "account_sid", label: "Account SID", type: "text" },
          { name: "auth_token", label: "Auth Token", type: "password" },
        ];
      case "api_key":
        return [{ name: "api_key", label: "API Key", type: "password" }];
      case "custom":
        if (connector.id === "asterisk_ami") {
          return [
            { name: "host", label: "Asterisk Host", type: "text" },
            { name: "port", label: "AMI Port", type: "text" },
            { name: "username", label: "AMI Username", type: "text" },
            { name: "secret", label: "AMI Secret", type: "password" },
          ];
        }
        return [{ name: "token", label: "Token", type: "password" }];
      default:
        return [{ name: "api_key", label: "API Key", type: "password" }];
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400">
            Connect with external services and automation platforms
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64 bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Available Connectors</p>
                <p className="text-2xl font-bold text-white">{connectors.length}</p>
              </div>
              <Plug className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Connections</p>
                <p className="text-2xl font-bold text-white">
                  {credentials.filter((c) => c.is_valid).length}
                </p>
              </div>
              <Check className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Categories</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(connectors.flatMap((c) => c.categories)).size}
                </p>
              </div>
              <Server className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connectors Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredConnectors.map((connector) => {
          const connected = isConnected(connector.id);
          const credential = getCredential(connector.id);

          return (
            <Card key={connector.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  {connector.icon_url ? (
                    <img
                      src={connector.icon_url}
                      alt={connector.name}
                      className="w-5 h-5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    getCategoryIcon(connector.categories)
                  )}
                  {connector.name}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {connected ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-green-400">Connected</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-400">Not Connected</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-3">{connector.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {connector.categories.slice(0, 3).map((cat) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="bg-gray-700 text-gray-300 text-xs"
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  {connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-700 text-gray-300"
                        onClick={() => handleConnect(connector)}
                      >
                        Configure
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleConnect(connector)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Connect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredConnectors.length === 0 && (
        <div className="text-center py-12">
          <Plug className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No connectors found</h3>
          <p className="text-gray-500">Try adjusting your search query</p>
        </div>
      )}

      {/* Connect Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedConnector &&
                (selectedConnector.icon_url ? (
                  <img
                    src={selectedConnector.icon_url}
                    alt={selectedConnector.name}
                    className="w-6 h-6"
                  />
                ) : (
                  getCategoryIcon(selectedConnector.categories)
                ))}
              Connect to {selectedConnector?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter your credentials to connect to {selectedConnector?.name}.
              Your credentials are encrypted before storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedConnector &&
              getAuthFields(selectedConnector).map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="text-gray-300">
                    {field.label}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    value={connectForm[field.name] || ""}
                    onChange={(e) =>
                      setConnectForm({
                        ...connectForm,
                        [field.name]: e.target.value,
                      })
                    }
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              ))}

            {connectionStatus && (
              <div
                className={`p-3 rounded-md ${
                  connectionStatus.success
                    ? "bg-green-900/30 border border-green-700"
                    : "bg-red-900/30 border border-red-700"
                }`}
              >
                <p
                  className={
                    connectionStatus.success ? "text-green-400" : "text-red-400"
                  }
                >
                  {connectionStatus.message}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isConnecting}
              className="border-gray-600 text-gray-300"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={handleSaveCredentials}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save & Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
