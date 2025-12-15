"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, Server, Activity, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MCPPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">MCP Servers</h1>
          <p className="text-gray-400">
            Model Context Protocol server management
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Server
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5" />
              Primary MCP
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Endpoint</span>
                <span className="text-gray-300">localhost:8080</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tools</span>
                <span className="text-gray-300">12 available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Requests</span>
                <span className="text-gray-300">1,234 today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Network className="w-5 h-5" />
              Phone Tools
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Endpoint</span>
                <span className="text-gray-300">localhost:8081</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tools</span>
                <span className="text-gray-300">8 available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Requests</span>
                <span className="text-gray-300">567 today</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Analytics
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
              <span className="text-xs text-yellow-400">Degraded</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Endpoint</span>
                <span className="text-gray-300">localhost:8082</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tools</span>
                <span className="text-gray-300">5 available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Requests</span>
                <span className="text-gray-300">89 today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
