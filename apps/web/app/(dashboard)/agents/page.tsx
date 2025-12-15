"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Play, Pause, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Agents</h1>
          <p className="text-gray-400">
            Manage and monitor AI agents
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Bot className="w-4 h-4 mr-2" />
          New Agent
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Support Agent</CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-green-400">Active</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Handles customer support inquiries and ticket routing
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                <Pause className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Phone Agent</CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-green-400">Active</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Manages phone system configurations and troubleshooting
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                <Pause className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Analytics Agent</CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="text-xs text-gray-400">Paused</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Generates reports and analyzes call data patterns
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                <Play className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-gray-700 text-gray-300">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
