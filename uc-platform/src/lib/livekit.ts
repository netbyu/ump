import { apiClient } from "@/lib/api";
import type { ApiResponse } from "@/types";

export interface LiveKitToken {
  token: string;
  roomName: string;
  serverUrl: string;
}

export async function getAIChatToken(): Promise<LiveKitToken> {
  const response = await apiClient.post<ApiResponse<LiveKitToken>>(
    "/api/chat/token"
  );
  return response.data;
}

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
