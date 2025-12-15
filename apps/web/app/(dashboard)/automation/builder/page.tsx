"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Plus, Play, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AutomationBuilderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Automation Builder</h1>
          <p className="text-gray-400">
            Create and manage automation workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Play className="w-4 h-4 mr-2" />
            Run
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700 md:col-span-1">
          <CardHeader>
            <CardTitle className="text-white text-sm">Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <div className="flex items-center gap-2 text-gray-300">
                <Zap className="w-4 h-4" />
                <span className="text-sm">Trigger</span>
              </div>
            </div>
            <div className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <div className="flex items-center gap-2 text-gray-300">
                <Plus className="w-4 h-4" />
                <span className="text-sm">Action</span>
              </div>
            </div>
            <div className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              <div className="flex items-center gap-2 text-gray-300">
                <Plus className="w-4 h-4" />
                <span className="text-sm">Condition</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 md:col-span-3 min-h-[500px]">
          <CardHeader>
            <CardTitle className="text-white">Workflow Canvas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Drag components here to build your workflow</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
