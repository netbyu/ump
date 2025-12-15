"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Server, Workflow, MessageSquare } from "lucide-react";

type StatusType = "online" | "offline" | "degraded";

const stats: {
  name: string;
  value: string;
  status: StatusType;
  icon: typeof Phone;
  description: string;
}[] = [
  {
    name: "Phone Systems",
    value: "12",
    status: "online",
    icon: Phone,
    description: "All systems operational",
  },
  {
    name: "Infrastructure Devices",
    value: "48",
    status: "degraded",
    icon: Server,
    description: "2 devices need attention",
  },
  {
    name: "Active Workflows",
    value: "8",
    status: "online",
    icon: Workflow,
    description: "Running smoothly",
  },
  {
    name: "AI Conversations",
    value: "156",
    status: "online",
    icon: MessageSquare,
    description: "This month",
  },
];

const statusColors: Record<StatusType, "success" | "destructive" | "warning"> = {
  online: "success",
  offline: "destructive",
  degraded: "warning",
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your unified communications platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <Badge variant={statusColors[stat.status]}>{stat.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 mt-2 rounded-full bg-warning" />
                <div>
                  <p className="text-sm font-medium">
                    PBX-03 high CPU usage detected
                  </p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 mt-2 rounded-full bg-success" />
                <div>
                  <p className="text-sm font-medium">
                    Backup workflow completed successfully
                  </p>
                  <p className="text-xs text-muted-foreground">4 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 mt-2 rounded-full bg-destructive" />
                <div>
                  <p className="text-sm font-medium">
                    Gateway-02 connectivity lost
                  </p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Add Phone System</p>
                  <p className="text-xs text-muted-foreground">
                    Register a new PBX or phone system
                  </p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors">
                <Workflow className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Create Workflow</p>
                  <p className="text-xs text-muted-foreground">
                    Set up a new automation workflow
                  </p>
                </div>
              </button>
              <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left transition-colors">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Start AI Chat</p>
                  <p className="text-xs text-muted-foreground">
                    Get help from the AI assistant
                  </p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
