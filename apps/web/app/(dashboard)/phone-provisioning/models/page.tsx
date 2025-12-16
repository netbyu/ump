"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_PHONE_PROVISIONING_API_URL || "http://localhost:8005/api";

export default function PhoneModelsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch phone models
  const { data: models, isLoading } = useQuery({
    queryKey: ["phone-models"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/provisioning/models`);
      if (!response.ok) throw new Error("Failed to fetch models");
      return response.json();
    },
  });

  const filteredModels = models?.items?.filter((model: any) =>
    searchQuery === "" ||
    model.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getVendorColor = (vendor: string) => {
    const colors: Record<string, string> = {
      yealink: "bg-blue-500/10",
      polycom: "bg-purple-500/10",
      cisco: "bg-cyan-500/10",
      grandstream: "bg-orange-500/10",
      mitel: "bg-green-500/10",
      aastra: "bg-green-500/10",
      fanvil: "bg-pink-500/10",
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
          <h1 className="text-3xl font-bold">Phone Models</h1>
          <p className="text-muted-foreground">
            Supported IP phone hardware models
          </p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search phone models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Models Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Loading phone models...
          </div>
        )}

        {filteredModels.map((model: any) => (
          <Card key={model.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg ${getVendorColor(model.vendor)}`}>
                  <Phone className="h-6 w-6" />
                </div>
                <Badge variant="outline" className="capitalize">
                  {model.vendor}
                </Badge>
              </div>
              <CardTitle className="mt-3">{model.display_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {model.description || "No description"}
              </p>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Lines</p>
                  <p className="font-medium">{model.line_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Display</p>
                  <p className="font-medium">
                    {model.has_color_display ? "Color" : "B&W"}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Config Pattern:</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {model.config_file_pattern}
                </code>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
