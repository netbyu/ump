"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Paintbrush, Phone, GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IVRManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">IVR Management</h1>
          <p className="text-gray-400">
            Configure and manage Interactive Voice Response systems
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New IVR
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Main Menu
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-green-400">Active</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Extensions</span>
                <span className="text-gray-300">5 routes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Calls Today</span>
                <span className="text-gray-300">342</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Duration</span>
                <span className="text-gray-300">45s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5" />
              Support Queue
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-xs text-green-400">Active</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Extensions</span>
                <span className="text-gray-300">8 routes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Calls Today</span>
                <span className="text-gray-300">189</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Duration</span>
                <span className="text-gray-300">2m 15s</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Paintbrush className="w-5 h-5" />
              After Hours
            </CardTitle>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <span className="text-xs text-gray-400">Inactive</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Extensions</span>
                <span className="text-gray-300">3 routes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Calls Today</span>
                <span className="text-gray-300">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Schedule</span>
                <span className="text-gray-300">6PM - 8AM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
