"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Code } from "lucide-react";
import Link from "next/link";

export default function TemplatesPage() {
  const templates = [
    {
      id: "yealink-standard",
      name: "Yealink Standard",
      vendor: "yealink",
      description: "Standard configuration for Yealink T-series phones",
      variables: ["extension", "sip_password", "pbx_server_ip"],
      features: ["BLF", "Call Forward", "Voicemail"],
    },
    {
      id: "polycom-standard",
      name: "Polycom VVX Standard",
      vendor: "polycom",
      description: "Standard VVX series configuration",
      variables: ["extension", "sip_password", "pbx_server_ip"],
      features: ["Directed Call Pickup", "Missed Call Tracking"],
    },
    {
      id: "mitel-6800-standard",
      name: "Mitel 6800 Series",
      vendor: "mitel",
      description: "Standard configuration for Mitel 6800 series (6865i, 6867i, 6869i)",
      variables: ["extension", "sip_password", "pbx_server_ip", "vlan_id"],
      features: ["Call Forward", "DND", "Voicemail", "BLF", "VLAN"],
    },
    {
      id: "cisco-standard",
      name: "Cisco Standard",
      vendor: "cisco",
      description: "Standard configuration for Cisco 88XX series",
      variables: ["extension", "sip_password", "pbx_server_ip"],
      features: ["Directory", "Services"],
    },
    {
      id: "grandstream-standard",
      name: "Grandstream GXP",
      vendor: "grandstream",
      description: "Standard GXP series configuration",
      variables: ["extension", "sip_password", "pbx_server_ip"],
      features: ["Speed Dial", "Call Forward", "Voicemail"],
    },
  ];

  const getVendorColor = (vendor: string) => {
    const colors: Record<string, string> = {
      yealink: "bg-blue-500/10",
      polycom: "bg-purple-500/10",
      cisco: "bg-cyan-500/10",
      grandstream: "bg-orange-500/10",
      mitel: "bg-green-500/10",
    };
    return colors[vendor] || "bg-gray-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/phone-provisioning">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Config Templates</h1>
          <p className="text-muted-foreground">
            Configuration templates for phone provisioning
          </p>
        </div>
      </div>

      {/* Templates */}
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${getVendorColor(template.vendor)}`}>
                  <FileText className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="capitalize">
                  {template.vendor}
                </Badge>
              </div>
              <CardTitle className="mt-3">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {template.description}
              </p>

              {/* Variables */}
              <div>
                <p className="text-sm font-medium mb-2">Required Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {template.variables.map((variable) => (
                    <Badge key={variable} variant="outline" className="text-xs font-mono">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <p className="text-sm font-medium mb-2">Features:</p>
                <div className="flex flex-wrap gap-1">
                  {template.features.map((feature) => (
                    <Badge key={feature} variant="default" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full">
                <Code className="mr-2 h-4 w-4" />
                View Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
