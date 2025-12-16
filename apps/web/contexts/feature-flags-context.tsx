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
}

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
  },
  monitoring: {
    id: "monitoring",
    name: "Monitoring",
    description: "System and service monitoring",
    enabled: true,
    category: "core",
  },
  systems: {
    id: "systems",
    name: "Systems",
    description: "Device systems grouped by hierarchy",
    enabled: true,
    category: "unified-communication",
  },
  "phone-systems": {
    id: "phone-systems",
    name: "Phone Systems",
    description: "PBX and phone system management",
    enabled: true,
    category: "unified-communication",
  },
  "call-report": {
    id: "call-report",
    name: "Call Report",
    description: "Call analytics and reporting",
    enabled: true,
    category: "telephony",
  },
  "automation-dashboard": {
    id: "automation-dashboard",
    name: "Automation Dashboard",
    description: "Workflow automation overview",
    enabled: true,
    category: "automation",
  },
  "automation-builder": {
    id: "automation-builder",
    name: "Automation Builder",
    description: "Create and edit automation workflows",
    enabled: true,
    category: "automation",
  },
  agents: {
    id: "agents",
    name: "AI Agents",
    description: "AI agent configuration and management",
    enabled: true,
    category: "ai",
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
  },
  ivr: {
    id: "ivr",
    name: "IVR Management",
    description: "Interactive Voice Response configuration",
    enabled: true,
    category: "unified-communication",
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
  nodes: {
    id: "nodes",
    name: "Nodes",
    description: "Infrastructure systems hosting multiple integrations (servers, devices, platforms)",
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

// Storage key for localStorage
const STORAGE_KEY = "ucmp_feature_flags";

interface FeatureFlagsContextType {
  features: Record<string, FeatureConfig>;
  isFeatureEnabled: (featureId: string) => boolean;
  toggleFeature: (featureId: string) => void;
  setFeatureEnabled: (featureId: string, enabled: boolean) => void;
  resetToDefaults: () => void;
  getFeaturesByCategory: (category: FeatureConfig["category"]) => FeatureConfig[];
  enabledCount: number;
  totalCount: number;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export function FeatureFlagsProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Record<string, FeatureConfig>>(DEFAULT_FEATURES);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, boolean>;
        // Merge stored enabled states with default features
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
    } catch (error) {
      console.error("Failed to load feature flags from localStorage:", error);
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage when features change
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

  const isFeatureEnabled = useCallback(
    (featureId: string): boolean => {
      // Dashboard, Admin, and Settings are always enabled (core features)
      if (["dashboard", "admin", "settings"].includes(featureId)) {
        return true;
      }
      return features[featureId]?.enabled ?? true;
    },
    [features]
  );

  const toggleFeature = useCallback((featureId: string) => {
    // Prevent disabling core features
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
    // Prevent disabling core features
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
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getFeaturesByCategory = useCallback(
    (category: FeatureConfig["category"]): FeatureConfig[] => {
      return Object.values(features).filter((f) => f.category === category);
    },
    [features]
  );

  const enabledCount = Object.values(features).filter((f) => f.enabled).length;
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
