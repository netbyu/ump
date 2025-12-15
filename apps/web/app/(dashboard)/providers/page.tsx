"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  LayoutGrid,
  List,
  Key,
  Webhook,
  Shield,
  Loader2,
  Plus,
  Filter,
  ArrowRight,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProviders,
  useProviderCategories,
} from "@/hooks/use-connectors";
import type { Provider } from "@/types";

// Auth type icon mapping
function getAuthIcon(authType: string) {
  switch (authType?.toLowerCase()) {
    case "oauth2":
    case "oauth2_client_credentials":
    case "oauth1":
      return <Shield className="w-4 h-4" />;
    case "api_key":
    case "bearer":
    case "basic":
    default:
      return <Key className="w-4 h-4" />;
  }
}

// Category badge color mapping
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    communication: "bg-blue-600",
    crm: "bg-green-600",
    productivity: "bg-purple-600",
    marketing: "bg-pink-600",
    hr: "bg-orange-600",
    finance: "bg-yellow-600",
    development: "bg-cyan-600",
    "dev-tools": "bg-cyan-600",
    analytics: "bg-indigo-600",
    storage: "bg-teal-600",
    social: "bg-red-600",
    accounting: "bg-emerald-600",
    ats: "bg-violet-600",
    banking: "bg-amber-600",
    cms: "bg-lime-600",
    design: "bg-fuchsia-600",
    ticketing: "bg-rose-600",
    security: "bg-slate-600",
    support: "bg-sky-600",
  };
  return colors[category?.toLowerCase()] || "bg-gray-600";
}

export default function ProvidersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Queries
  const { data: providers = [], isLoading, refetch } = useProviders({
    category: selectedCategory !== "all" ? selectedCategory : undefined,
    search: searchQuery || undefined,
  });
  const { data: categories = [] } = useProviderCategories();

  // Filtered providers (additional client-side filtering for tags)
  const filteredProviders = useMemo(() => {
    let result = providers;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }
    return result;
  }, [providers, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: providers.length,
    oauth: providers.filter((p) => p.auth_type === "oauth2" || p.auth_type === "oauth2_client_credentials").length,
    apiKey: providers.filter((p) => p.auth_type === "api_key").length,
    webhooks: providers.filter((p) => p.supports_webhooks).length,
  }), [providers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Provider Catalog</h1>
          <p className="text-gray-400 mt-1">
            Browse {stats.total}+ available integrations and connect to external services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Link href="/providers/create">
            <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
              <FileCode className="w-4 h-4 mr-2" />
              Create Provider
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-gray-400">Total Providers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Shield className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.oauth}</p>
                <p className="text-sm text-gray-400">OAuth Providers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Key className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.apiKey}</p>
                <p className="text-sm text-gray-400">API Key Providers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600/20 rounded-lg">
                <Webhook className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.webhooks}</p>
                <p className="text-sm text-gray-400">Webhook Support</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 border border-gray-700 rounded-md p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProviders.map((provider) => (
            <Card
              key={provider.id}
              className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {provider.icon_url ? (
                      <img
                        src={provider.icon_url}
                        alt={provider.name}
                        className="w-10 h-10 rounded-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-400">
                          {provider.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-white text-base">
                        {provider.name}
                      </CardTitle>
                      <p className="text-xs text-gray-500">v{provider.version}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getAuthIcon(provider.auth_type)}
                    <span className="ml-1">{provider.auth_type}</span>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-400 line-clamp-2">
                  {provider.description || "No description available"}
                </p>

                <div className="flex flex-wrap gap-1">
                  {provider.categories?.slice(0, 2).map((cat) => (
                    <Badge
                      key={cat}
                      className={`${getCategoryColor(cat)} text-white text-xs`}
                    >
                      {cat}
                    </Badge>
                  ))}
                  {provider.protocol && provider.protocol !== "rest" && (
                    <Badge className="bg-purple-600 text-white text-xs">
                      {provider.protocol === "json_rpc" ? "JSON-RPC" :
                       provider.protocol === "native" ? "Native SDK" :
                       provider.protocol === "graphql" ? "GraphQL" :
                       provider.protocol.toUpperCase()}
                    </Badge>
                  )}
                  {provider.supports_webhooks && (
                    <Badge className="bg-orange-600 text-white text-xs">
                      <Webhook className="w-3 h-3 mr-1" />
                      Webhooks
                    </Badge>
                  )}
                </div>

                <Link href={`/providers/add/${provider.id}`} className="mt-4 block">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Connect
                    <ArrowRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === "list" && (
        <Card className="bg-gray-800 border-gray-700">
          <div className="divide-y divide-gray-700">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 hover:bg-gray-750 group"
              >
                <div className="flex items-center gap-4">
                  {provider.icon_url ? (
                    <img
                      src={provider.icon_url}
                      alt={provider.name}
                      className="w-10 h-10 rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-400">
                        {provider.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-medium">{provider.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">
                      {provider.description || "No description"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-1 hidden md:flex">
                    {provider.categories?.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat}
                        className={`${getCategoryColor(cat)} text-white text-xs`}
                      >
                        {cat}
                      </Badge>
                    ))}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {provider.auth_type}
                  </Badge>
                  <Link href={`/providers/add/${provider.id}`}>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Connect
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && filteredProviders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No providers found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
