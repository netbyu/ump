/**
 * Simple toast hook for displaying notifications
 */
import { useState, useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

// Simple in-memory toast state (for now just logs to console)
// TODO: Replace with proper toast UI component
export function useToast() {
  const toast = useCallback((options: ToastOptions) => {
    const { title, description, variant } = options;

    // For now, use console and alert as fallback
    if (variant === "destructive") {
      console.error(`[Toast Error] ${title}${description ? `: ${description}` : ""}`);
    } else {
      console.log(`[Toast] ${title}${description ? `: ${description}` : ""}`);
    }

    // Could be enhanced with a proper toast notification system
  }, []);

  return { toast };
}
