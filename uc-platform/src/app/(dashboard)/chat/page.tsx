"use client";

import { AIChatRoom } from "@/components/features/ai-chat/chat-room";

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">
          Chat with AI to get help managing your UC platform
        </p>
      </div>
      <div className="h-[calc(100%-5rem)] border rounded-lg bg-card">
        <AIChatRoom />
      </div>
    </div>
  );
}
