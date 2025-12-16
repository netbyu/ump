"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PageView } from "@/types";

// Feature definition with metadata
export interface FeatureConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: "core" | "telephony" | "automation" | "ai" | "unified-communication" | "admin";
  icon?: string;
  // Integration-based enabling
  requiresIntegration?: boolean; // If true, feature requires at least one matching integration
  requiredProviders?: string[]; // Provider IDs that can enable this feature (e.g., ["zabbix", "prometheus"])
}

// Mapping of provider categories/IDs to features they enable
export interface IntegrationFeatureMapping {
  id: string;
  name: string;
  description: string;
  providerIds: string[]; // Specific provider IDs (e.g., "zabbix", "prometheus")
  providerCategories: string[]; // Provider categories (e.g., "monitoring", "telephony")
  enablesFeatures: string[]; // Feature IDs this integration enables
  enabled: boolean; // Whether this mapping is active
}

// Default integration-to-feature mappings
const DEFAULT_INTEGRATION_MAPPINGS: IntegrationFeatureMapping[] = [
  {
    id: "monitoring-integration",
    name: "Monitoring Systems",
    description: "Zabbix, Prometheus, Grafana integrations enable monitoring features",
    providerIds: ["zabbix", "prometheus", "grafana", "nagios", "datadog", "new_relic"],
    providerCategories: ["monitoring"],
    enablesFeatures: ["monitoring"],
    enabled: true,
  },
  {
    id: "telephony-integration",
    name: "Telephony Systems",
    description: "PBX and telephony integrations enable phone features",
    providerIds: ["freepbx", "asterisk", "avaya", "cisco_cucm", "3cx", "teams_voice"],
    providerCategories: ["telephony", "pbx", "voip"],
    enablesFeatures: ["phone-systems", "call-report", "ivr", "fax-management"],
    enabled: true,
  },
  {
    id: "itsm-integration",
    name: "ITSM / Helpdesk",
    description: "GLPI, ServiceNow, Jira integrations enable ITSM features",
    providerIds: ["glpi", "servicenow", "jira_service_desk", "zendesk", "freshdesk"],
    providerCategories: ["itsm", "helpdesk", "ticketing"],
    enablesFeatures: ["itsm-requests"],
    enabled: true,
  },
  {
    id: "automation-integration",
    name: "Automation Platforms",
    description: "Temporal, n8n integrations enable automation features",
    providerIds: ["temporal", "n8n", "airflow", "prefect"],
    providerCategories: ["automation", "workflow"],
    enablesFeatures: ["automation-dashboard", "automation-builder"],
    enabled: true,
  },
  {
    id: "ai-integration",
    name: "AI / LLM Platforms",
    description: "Ollama, OpenAI integrations enable AI features",
    providerIds: ["ollama", "openai", "anthropic", "livekit", "vllm"],
    providerCategories: ["ai", "llm", "ml"],
    enablesFeatures: ["agents", "mcp", "ai-compute"],
    enabled: true,
  },
];

// All available features mapped to sidebar items
const DEFAULT_FEATURES: Record<string, FeatureConfig> = {
  dashboard: {
    id: "dashboard",
    name: "Dashboard",
    description: "Main dashboard with system overview",
    enabled: true,
    category: "core",
  },
  "itsm-requests": {
    id: "itsm-requests",
    name: "ITSM Requests",
    description: "IT Service Management ticket system",
    enabled: true,
    category: "core",
    requiresIntegration: true,
    requiredProviders: ["glpi", "servicenow", "jira_service_desk", "zendesk", "freshdesk"],
  },
  monitoring: {
    id: "monitoring",
    name: "Monitoring",
    description: "System and service monitoring",
    enabled: true,
    category: "core",
    requiresIntegration: true,
    requiredProviders: ["zabbix", "prometheus", "grafana", "nagios", "datadog"],
  },
  nodes: {
    id: "nodes",
    name: "Nodes",
    description: "Infrastructure systems hosting multiple integrations (servers, devices, platforms)",
    enabled: true,
    category: "core",
  },
  "phone-systems": {
    id: "phone-systems",
    name: "Phone Systems",
    description: "PBX and phone system management",
    enabled: true,
    category: "unified-communication",
    requiresIntegration: true,
    requiredProviders: ["freepbx", "asterisk", "avaya", "cisco_cucm", "3cx"],
  },
  "call-report": {
    id: "call-report",
    name: "Call Report",
    description: "Call analytics and reporting",
    enabled: true,
    category: "telephony",
    requiresIntegration: true,
    requiredProviders: ["freepbx", "asterisk", "avaya", "cisco_cucm", "3cx"],
  },
  "automation-dashboard": {
    id: "automation-dashboard",
    name: "Automation Dashboard",
    description: "Workflow automation overview",
    enabled: true,
    category: "automation",
    requiresIntegration: true,
    requiredProviders: ["temporal", "n8n", "airflow"],
  },
  "automation-builder": {
    id: "automation-builder",
    name: "Automation Builder",
    description: "Create and edit automation workflows",
    enabled: true,
    category: "automation",
    requiresIntegration: true,
    requiredProviders: ["temporal", "n8n", "airflow"],
  },
  agents: {
    id: "agents",
    name: "AI Agents",
    description: "AI agent configuration and management",
    enabled: true,
    category: "ai",
    requiresIntegration: true,
    requiredProviders: ["ollama", "openai", "anthropic", "livekit"],
  },
  mcp: {
    id: "mcp",
    name: "MCP",
    description: "Model Context Protocol servers",
    enabled: true,
    category: "ai",
  },
  "ai-compute": {
    id: "ai-compute",
    name: "AI Compute",
    description: "AWS Spot GPU instances for LLM testing",
    enabled: true,
    category: "ai",
  },
  "fax-management": {
    id: "fax-management",
    name: "Fax Management",
    description: "Fax sending and receiving",
    enabled: true,
    category: "unified-communication",
    requiresIntegration: true,
    requiredProviders: ["freepbx", "hylafax", "faxage"],
  },
  ivr: {
    id: "ivr",
    name: "IVR Management",
    description: "Interactive Voice Response configuration",
    enabled: true,
    category: "unified-communication",
    requiresIntegration: true,
    requiredProviders: ["freepbx", "asterisk", "avaya", "cisco_cucm"],
  },
  "self-service": {
    id: "self-service",
    name: "User Self-Service Portal",
    description: "End-user self-service features",
    enabled: true,
    category: "core",
  },
  providers: {
    id: "providers",
    name: "Providers",
    description: "Provider catalog - templates for external services",
    enabled: true,
    category: "core",
  },
  connectors: {
    id: "connectors",
    name: "Connectors",
    description: "Configured connections to external services",
    enabled: true,
    category: "core",
  },
  stacks: {
    id: "stacks",
    name: "Stacks",
    description: "Infrastructure stack deployment",
    enabled: true,
    category: "core",
  },
  admin: {
    id: "admin",
    name: "Admin",
    description: "System administration",
    enabled: true,
    category: "admin",
  },
  settings: {
    id: "settings",
    name: "Settings",
    description: "User and system settings",
    enabled: true,
    category: "core",
  },
};

// Storage keys for localStorage
const STORAGE_KEY = "ucmp_feature_flags";
const INTEGRATION_MAPPINGS_KEY = "ucmp_integration_mappings";
const ACTIVE_PROVIDERS_KEY = "ucmp_active_providers";
const INTEGRATION_MODE_KEY = "ucmp_integration_mode";

interface FeatureFlagsContextType {
  features: Record<string, FeatureConfig>;
  isFeatureEnabled: (featureId: string) => boolean;
  toggleFeature: (featureId: string) => void;
  setFeatureEnabled: (featureId: string, enabled: boolean) => void;
  resetToDefaults: () => void;
  getFeaturesByCategory: (category: FeatureConfig["category"]) => FeatureConfig[];
  enabledCount: number;
  totalCount: number;
  // Integration-based features
  integrationMappings: IntegrationFeatureMapping[];
  setIntegrationMappings: (mappings: IntegrationFeatureMapping[]) => void;
  activeProviderIds: string[];
  setActiveProviderIds: (ids: string[]) => void;
  addActiveProvider: (providerId: string) => void;
  removeActiveProvider: (providerId: string) => void;
  integrationModeEnabled: boolean;
  setIntegrationModeEnabled: (enabled: boolean) => void;
  getIntegrationEnabledFeatures: () => string[];
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Record<string, FeatureConfig>>(DEFAULT_FEATURES);
  const [integrationMappings, setIntegrationMappingsState] = useState<IntegrationFeatureMapping[]>(DEFAULT_INTEGRATION_MAPPINGS);
  const [activeProviderIds, setActiveProviderIdsState] = useState<string[]>([]);
  const [integrationModeEnabled, setIntegrationModeEnabledState] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      // Load feature flags
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        setFeatures((prev) => {
          const updated = { ...prev };
          Object.keys(parsed).forEach((key) => {
            if (updated[key]) {
              updated[key] = { ...updated[key], enabled: parsed[key] };
            }
          });
          return updated;
        });
      }

      // Load integration mappings
      const storedMappings = localStorage.getItem(INTEGRATION_MAPPINGS_KEY);
      if (storedMappings) {
        setIntegrationMappingsState(JSON.parse(storedMappings));
      }

      // Load active providers
      const storedProviders = localStorage.getItem(ACTIVE_PROVIDERS_KEY);
      if (storedProviders) {
        setActiveProviderIdsState(JSON.parse(storedProviders));
      }

      // Load integration mode setting
      const storedMode = localStorage.getItem(INTEGRATION_MODE_KEY);
      if (storedMode) {
        setIntegrationModeEnabledState(JSON.parse(storedMode));
      }
    } catch (error) {
      console.error("Failed to load feature flags from localStorage:", error);
    }
    setIsInitialized(true);
  }, []);

  // Save feature flags to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      const enabledStates: Record<string, boolean> = {};
      Object.entries(features).forEach(([key, config]) => {
        enabledStates[key] = config.enabled;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledStates));
    } catch (error) {
      console.error("Failed to save feature flags to localStorage:", error);
    }
  }, [features, isInitialized]);

  // Save integration mappings to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(INTEGRATION_MAPPINGS_KEY, JSON.stringify(integrationMappings));
    } catch (error) {
      console.error("Failed to save integration mappings:", error);
    }
  }, [integrationMappings, isInitialized]);

  // Save active providers to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(ACTIVE_PROVIDERS_KEY, JSON.stringify(activeProviderIds));
    } catch (error) {
      console.error("Failed to save active providers:", error);
    }
  }, [activeProviderIds, isInitialized]);

  // Save integration mode to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(INTEGRATION_MODE_KEY, JSON.stringify(integrationModeEnabled));
    } catch (error) {
      console.error("Failed to save integration mode:", error);
    }
  }, [integrationModeEnabled, isInitialized]);

  // Get features enabled by active integrations
  const getIntegrationEnabledFeatures = useCallback((): string[] => {
    if (!integrationModeEnabled) return [];

    const enabledFeatures = new Set<string>();

    integrationMappings
      .filter((m) => m.enabled)
      .forEach((mapping) => {
        // Check if any active provider matches this mapping
        const hasMatchingProvider = activeProviderIds.some(
          (pid) =>
            mapping.providerIds.includes(pid) ||
            mapping.providerCategories.some((cat) => pid.includes(cat))
        );

        if (hasMatchingProvider) {
          mapping.enablesFeatures.forEach((f) => enabledFeatures.add(f));
        }
      });

    return Array.from(enabledFeatures);
  }, [integrationModeEnabled, integrationMappings, activeProviderIds]);

  const isFeatureEnabled = useCallback(
    (featureId: string): boolean => {
      // Core features are always enabled
      if (["dashboard", "admin", "settings"].includes(featureId)) {
        return true;
      }

      const feature = features[featureId];
      if (!feature) return true;

      // If feature is manually disabled, return false
      if (!feature.enabled) return false;

      // If integration mode is enabled and feature requires integration
      if (integrationModeEnabled && feature.requiresIntegration) {
        const integrationEnabledFeatures = getIntegrationEnabledFeatures();
        return integrationEnabledFeatures.includes(featureId);
      }

      return feature.enabled;
    },
    [features, integrationModeEnabled, getIntegrationEnabledFeatures]
  );

  const toggleFeature = useCallback((featureId: string) => {
    if (["dashboard", "admin", "settings"].includes(featureId)) {
      return;
    }
    setFeatures((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        enabled: !prev[featureId]?.enabled,
      },
    }));
  }, []);

  const setFeatureEnabled = useCallback((featureId: string, enabled: boolean) => {
    if (["dashboard", "admin", "settings"].includes(featureId) && !enabled) {
      return;
    }
    setFeatures((prev) => ({
      ...prev,
      [featureId]: {
        ...prev[featureId],
        enabled,
      },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setFeatures(DEFAULT_FEATURES);
    setIntegrationMappingsState(DEFAULT_INTEGRATION_MAPPINGS);
    setActiveProviderIdsState([]);
    setIntegrationModeEnabledState(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INTEGRATION_MAPPINGS_KEY);
    localStorage.removeItem(ACTIVE_PROVIDERS_KEY);
    localStorage.removeItem(INTEGRATION_MODE_KEY);
  }, []);

  const getFeaturesByCategory = useCallback(
    (category: FeatureConfig["category"]): FeatureConfig[] => {
      return Object.values(features).filter((f) => f.category === category);
    },
    [features]
  );

  const setIntegrationMappings = useCallback((mappings: IntegrationFeatureMapping[]) => {
    setIntegrationMappingsState(mappings);
  }, []);

  const setActiveProviderIds = useCallback((ids: string[]) => {
    setActiveProviderIdsState(ids);
  }, []);

  const addActiveProvider = useCallback((providerId: string) => {
    setActiveProviderIdsState((prev) => {
      if (prev.includes(providerId)) return prev;
      return [...prev, providerId];
    });
  }, []);

  const removeActiveProvider = useCallback((providerId: string) => {
    setActiveProviderIdsState((prev) => prev.filter((id) => id !== providerId));
  }, []);

  const setIntegrationModeEnabled = useCallback((enabled: boolean) => {
    setIntegrationModeEnabledState(enabled);
  }, []);

  const enabledCount = Object.values(features).filter((f) => isFeatureEnabled(f.id)).length;
  const totalCount = Object.keys(features).length;

  return (
    <FeatureFlagsContext.Provider
      value={{
        features,
        isFeatureEnabled,
        toggleFeature,
        setFeatureEnabled,
        resetToDefaults,
        getFeaturesByCategory,
        enabledCount,
        totalCount,
        integrationMappings,
        setIntegrationMappings,
        activeProviderIds,
        setActiveProviderIds,
        addActiveProvider,
        removeActiveProvider,
        integrationModeEnabled,
        setIntegrationModeEnabled,
        getIntegrationEnabledFeatures,
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagsProvider");
  }
  return context;
}
