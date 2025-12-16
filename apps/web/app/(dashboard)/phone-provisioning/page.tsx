"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Plus, Server, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = process.env.NEXT_PUBLIC_PHONE_PROVISIONING_API_URL || "http://localhost:8005/api";

export default function PhoneProvisioningPage() {
  // Fetch phone assignments
  const { data: assignments } = useQuery({
    queryKey: ["phone-assignments"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/provisioning/assignments`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const stats = [
    {
      name: "Total Phones",
      value: assignments?.total || 0,
      icon: Phone,
      color: "text-blue-600",
    },
    {
      name: "Provisioned",
      value: assignments?.provisioned || 0,
      icon: Server,
      color: "text-green-600",
    },
    {
      name: "Pending",
      value: assignments?.pending || 0,
      icon: FileText,
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phone Provisioning</h1>
          <p className="text-muted-foreground">
            Auto-provision SIP phones with zero-touch deployment
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/phone-provisioning/settings">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Link href="/phone-provisioning/assignments">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Phone
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </span>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/phone-provisioning/assignments">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Phone className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Phone Assignments</p>
                  <p className="text-sm text-muted-foreground">
                    Manage MAC → Extension
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/phone-provisioning/models">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Server className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Phone Models</p>
                  <p className="text-sm text-muted-foreground">
                    Supported hardware
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/phone-provisioning/templates">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Templates</p>
                  <p className="text-sm text-muted-foreground">
                    Config templates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/phone-provisioning/settings">
          <Card className="hover:bg-accent transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Settings</p>
                  <p className="text-sm text-muted-foreground">
                    Server configuration
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Zero-Touch Provisioning Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                  1
                </div>
                <p className="font-medium">Add Assignment</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Map MAC address to extension and PBX server
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                  2
                </div>
                <p className="font-medium">Config Generated</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Service auto-generates vendor-specific config file
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                  3
                </div>
                <p className="font-medium">Phone Boots</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Phone requests config via TFTP or HTTP
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-bold">
                  ✓
                </div>
                <p className="font-medium">Auto-Configured</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Phone registers to PBX automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
