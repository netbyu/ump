"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Search, TrendingDown, Cpu } from "lucide-react";
import Link from "next/link";
import { aiComputeAPI } from "@/lib/ai-compute-api";

export default function PricingPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch pricing
  const { data: pricing, isLoading } = useQuery({
    queryKey: ["ai-pricing"],
    queryFn: () => aiComputeAPI.getPricing(),
    refetchInterval: 60000, // Refresh every minute
  });

  const filteredInstances = pricing?.instance_types.filter((it) =>
    it.instance_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    it.gpu_model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/ai-compute">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">GPU Instance Pricing</h1>
          <p className="text-muted-foreground">
            Compare costs and specifications
          </p>
        </div>
      </div>

      {/* Summary */}
      {pricing && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Cpu className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Instance Types</p>
                  <p className="text-2xl font-bold">
                    {pricing.instance_types.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingDown className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Savings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(
                      pricing.instance_types.reduce((acc, it) => {
                        const savings =
                          ((it.on_demand_price - it.spot_price_estimate) /
                            it.on_demand_price) *
                          100;
                        return acc + savings;
                      }, 0) / pricing.instance_types.length
                    )}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Region</p>
                <p className="text-2xl font-bold">{pricing.region}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Updated: {new Date(pricing.updated_at).toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search instance types or GPU models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table */}
      <Card>
        <CardHeader>
          <CardTitle>Instance Pricing Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading pricing data...
            </div>
          )}

          {filteredInstances && filteredInstances.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Instance Type</TableHead>
                    <TableHead>GPU</TableHead>
                    <TableHead>VRAM</TableHead>
                    <TableHead>vCPUs</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead className="text-right">On-Demand</TableHead>
                    <TableHead className="text-right">Spot (Est.)</TableHead>
                    <TableHead className="text-right">Savings</TableHead>
                    <TableHead>Recommended For</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstances.map((it) => {
                    const savings = Math.round(
                      ((it.on_demand_price - it.spot_price_estimate) /
                        it.on_demand_price) *
                        100
                    );

                    return (
                      <TableRow key={it.instance_type}>
                        <TableCell className="font-medium">
                          {it.instance_type}
                        </TableCell>
                        <TableCell>
                          {it.gpu_count}x {it.gpu_model}
                        </TableCell>
                        <TableCell>{it.gpu_memory_gb}GB</TableCell>
                        <TableCell>{it.vcpus}</TableCell>
                        <TableCell>{it.memory_gb}GB</TableCell>
                        <TableCell className="text-right">
                          <span className="line-through text-muted-foreground">
                            ${it.on_demand_price.toFixed(3)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          ${it.spot_price_estimate.toFixed(3)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="success">{savings}%</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground max-w-[200px]">
                            {it.recommended_models.slice(0, 2).join(", ")}
                            {it.recommended_models.length > 2 && "..."}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredInstances && filteredInstances.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No instances match your search.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {pricing?.instance_types.slice(0, 3).map((it) => (
              <div key={it.instance_type} className="p-4 rounded-lg border">
                <div className="font-medium mb-2">{it.instance_type}</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">1 hour:</span>
                    <span className="font-medium">
                      ${it.spot_price_estimate.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">8 hours:</span>
                    <span className="font-medium">
                      ${(it.spot_price_estimate * 8).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">24 hours:</span>
                    <span className="font-medium">
                      ${(it.spot_price_estimate * 24).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">30 days:</span>
                    <span className="font-bold text-green-600">
                      ${(it.spot_price_estimate * 24 * 30).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
