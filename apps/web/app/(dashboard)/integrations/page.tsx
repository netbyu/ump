"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400">
            Connect with external services and tools
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Microsoft Teams
            </CardTitle>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Sync presence and enable calling from Teams
            </p>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              Configure
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Slack
            </CardTitle>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Send notifications and updates to Slack channels
            </p>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              Configure
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Plug className="w-5 h-5" />
              ServiceNow
            </CardTitle>
            <div className="flex items-center gap-1">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Not Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Create and manage ITSM tickets automatically
            </p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Connect
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Salesforce
            </CardTitle>
            <div className="flex items-center gap-1">
              <X className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Not Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Integrate with CRM for caller identification
            </p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Connect
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Plug className="w-5 h-5" />
              Active Directory
            </CardTitle>
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Connected</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">
              Sync users and groups from AD/LDAP
            </p>
            <Button variant="outline" size="sm" className="border-gray-700 text-gray-300">
              Configure
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
