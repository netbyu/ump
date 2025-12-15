"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/api";
import type { User, AuthState, ApiResponse, UserPermissions } from "@/types";

interface AuthContextType extends AuthState {
  permissions: UserPermissions | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "uc_platform_token";

// Mock user for testing when backend is unavailable
const MOCK_USER: User = {
  id: "1",
  email: "admin@ucplatform.com",
  name: "Admin User",
  role: "admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Set to true to bypass backend authentication for UI testing
const BYPASS_AUTH = true;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    // Bypass mode for UI testing - if we have a mock token, use mock user
    if (BYPASS_AUTH && token === "mock-token-for-testing") {
      setState({
        user: MOCK_USER,
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    try {
      apiClient.setToken(token);
      const response = await apiClient.get<ApiResponse<User>>("/api/auth/me");
      setState({
        user: response.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      apiClient.setToken(null);
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true }));

    // Bypass mode for UI testing
    if (BYPASS_AUTH) {
      localStorage.setItem(TOKEN_KEY, "mock-token-for-testing");
      setState({
        user: { ...MOCK_USER, email },
        isAuthenticated: true,
        isLoading: false,
      });
      return;
    }

    try {
      const response = await apiClient.post<{ user: User; token: string }>(
        "/api/auth/login",
        { email, password }
      );

      localStorage.setItem(TOKEN_KEY, response.token);
      apiClient.setToken(response.token);

      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setState({ user: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      apiClient.setToken(null);
      setState({ user: null, isAuthenticated: false, isLoading: false });
      setPermissions(null);
    }
  };

  // Permission check helper - for now, admin has all permissions
  const hasPermission = useCallback(
    (resource: string, action: string): boolean => {
      if (!state.user) return false;
      // Admin role has all permissions
      if (state.user.role === "admin") return true;
      // Check against permissions if available
      if (permissions) {
        const resourcePerm = permissions.permissions.find(
          (p) => p.resource === resource
        );
        if (resourcePerm) {
          return resourcePerm.actions.includes(action);
        }
      }
      // Default permissions based on role
      if (state.user.role === "operator") {
        // Operators can read most things
        if (action === "read") return true;
      }
      return false;
    },
    [state.user, permissions]
  );

  const hasRole = useCallback(
    (roles: string[]): boolean => {
      if (!state.user) return false;
      return roles.includes(state.user.role);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider
      value={{
        ...state,
        permissions,
        login,
        logout,
        refreshUser,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
