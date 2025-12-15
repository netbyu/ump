"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Heart, Lock, TrendingUp, Star } from "lucide-react";
import { aiComputeAPI } from "@/lib/ai-compute-api";
import type { Framework } from "@/types/ai-compute";

interface ModelBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  framework: Framework;
  onSelectModel: (model: string) => void;
}

export function ModelBrowser({
  open,
  onOpenChange,
  framework,
  onSelectModel,
}: ModelBrowserProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("curated");

  // Fetch curated models
  const { data: curatedData } = useQuery({
    queryKey: ["curated-models", framework],
    queryFn: () => aiComputeAPI.getCuratedModels(framework),
    enabled: open && activeTab === "curated",
  });

  // Fetch trending models
  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending-models"],
    queryFn: () => aiComputeAPI.getTrendingModels(),
    enabled: open && activeTab === "trending",
  });

  // Search models
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["search-models", searchQuery],
    queryFn: () => aiComputeAPI.searchModels(searchQuery),
    enabled: open && activeTab === "search" && searchQuery.length > 2,
  });

  const handleSelectModel = (modelName: string) => {
    onSelectModel(modelName);
    onOpenChange(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse Models</DialogTitle>
          <DialogDescription>
            Select from popular models or search HuggingFace
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="curated">
              <Star className="h-4 w-4 mr-2" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="trending">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Curated Models Tab */}
          <TabsContent value="curated" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-2">
              {curatedData?.models?.map((model: any) => (
                <button
                  key={model.name}
                  onClick={() => handleSelectModel(model.name)}
                  className="w-full p-4 rounded-lg border hover:bg-accent text-left transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-mono font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {model.description}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {model.size}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          VRAM: {model.vram}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Trending Models Tab */}
          <TabsContent value="trending" className="flex-1 overflow-y-auto mt-4">
            {trendingLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading trending models...
              </div>
            ) : (
              <div className="space-y-2">
                {trendingData?.models?.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className="w-full p-4 rounded-lg border hover:bg-accent text-left transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{model.id}</span>
                          {model.gated && (
                            <Lock className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          by {model.author}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Download className="h-3 w-3" />
                            {formatNumber(model.downloads)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            {formatNumber(model.likes)}
                          </div>
                          {model.pipeline_tag && (
                            <Badge variant="outline" className="text-xs">
                              {model.pipeline_tag}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search models on HuggingFace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searchQuery.length <= 2 ? (
              <div className="text-center py-8 text-muted-foreground">
                Enter at least 3 characters to search
              </div>
            ) : searchLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching HuggingFace...
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {searchData?.models?.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className="w-full p-4 rounded-lg border hover:bg-accent text-left transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{model.id}</span>
                          {model.gated && (
                            <Badge variant="warning" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Gated
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          by {model.author}
                        </div>
                        {model.description && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {model.description}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Download className="h-3 w-3" />
                            {formatNumber(model.downloads)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="h-3 w-3" />
                            {formatNumber(model.likes)}
                          </div>
                          {model.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
