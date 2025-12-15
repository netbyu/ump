"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, Phone, Settings, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SelfServicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">User Self-Service Portal</h1>
        <p className="text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Display Name</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <input
                type="email"
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="your.email@example.com"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Phone Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Extension</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="1234"
                disabled
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Voicemail PIN</label>
              <input
                type="password"
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white"
                placeholder="****"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Update PIN
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-700">
              Change Password
            </Button>
            <Button variant="outline" className="w-full border-gray-700 text-gray-300 hover:bg-gray-700">
              Enable Two-Factor Authentication
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Email Notifications</span>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">SMS Alerts</span>
              <input type="checkbox" className="rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Desktop Notifications</span>
              <input type="checkbox" className="rounded" defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
