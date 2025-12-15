"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useDataChannel,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { getAIChatToken, type LiveKitToken } from "@/lib/livekit";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AIChatRoom() {
  const [tokenData, setTokenData] = useState<LiveKitToken | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const data = await getAIChatToken();
      setTokenData(data);
    } catch (err) {
      setError("Failed to start chat session. Please try again.");
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!tokenData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>AI Assistant</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-muted-foreground text-center">
            Start a conversation with the AI assistant to get help with your
            Unified Communication platform.
          </p>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={startSession} disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Start Chat Session"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <LiveKitRoom
      token={tokenData.token}
      serverUrl={tokenData.serverUrl}
      connect={true}
      onDisconnected={() => setTokenData(null)}
      className="h-full"
    >
      <ChatInterface />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function ChatInterface() {
  const room = useRoomContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { message: receivedMessage, send } = useDataChannel("chat");

  // Handle incoming messages from AI
  useEffect(() => {
    if (receivedMessage) {
      try {
        const decoded = new TextDecoder().decode(receivedMessage.payload);
        const data = JSON.parse(decoded);

        if (data.type === "response") {
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.content,
              timestamp: new Date(),
            },
          ]);
          setIsProcessing(false);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    }
  }, [receivedMessage]);

  const sendMessage = useCallback(() => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    // Send to LiveKit data channel
    const payload = JSON.stringify({
      type: "message",
      content: inputValue.trim(),
    });
    send(new TextEncoder().encode(payload), { reliable: true });

    setInputValue("");
  }, [inputValue, isProcessing, send]);

  const toggleMicrophone = async () => {
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      console.error("Failed to toggle microphone:", err);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">AI Assistant</h2>
          <Badge variant="success">Connected</Badge>
        </div>
        <Button
          variant={isMuted ? "outline" : "default"}
          size="icon"
          onClick={toggleMicrophone}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Send a message to start the conversation.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isProcessing}
            className="flex-1"
          />
          <Button type="submit" disabled={!inputValue.trim() || isProcessing}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
