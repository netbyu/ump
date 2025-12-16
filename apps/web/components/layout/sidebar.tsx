"use client";

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, FileText, Paintbrush, Zap,
  Plug, Settings, ChevronLeft, Shield, Server, BarChart3,
  Bot, FileImage, Activity, ChevronDown, Workflow, Network, Phone, Layers, Cpu,
  Store, Cable
} from 'lucide-react';
import { PageView } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { useFeatureFlags } from '@/contexts/feature-flags-context';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// Map pages to required permissions (resource:action)
const pagePermissions: Record<string, { resource: string; action: string } | null> = {
  'dashboard': null, // Always visible
  'itsm-requests': { resource: 'itsm', action: 'read' },
  'monitoring': { resource: 'monitoring', action: 'read' },
  'nodes': { resource: 'integrations', action: 'read' },
  'phone-systems': { resource: 'extensions', action: 'read' },
  'call-report': { resource: 'reports', action: 'read' },
  'automation-dashboard': { resource: 'automation', action: 'read' },
  'automation-builder': { resource: 'automation', action: 'update' },
  'agents': { resource: 'agents', action: 'read' },
  'mcp': { resource: 'agents', action: 'read' },
  'ai-compute': { resource: 'ai', action: 'read' },
  'fax-management': { resource: 'fax', action: 'read' },
  'ivr': { resource: 'ivr', action: 'read' },
  'phone-provisioning': { resource: 'telephony', action: 'read' },
  'providers': { resource: 'integrations', action: 'read' },
  'connectors': { resource: 'integrations', action: 'read' },
  'stacks': { resource: 'integrations', action: 'read' },
  'admin': { resource: 'users', action: 'read' },
  'settings': { resource: 'settings', action: 'read' },
};

// Map PageView IDs to routes
const routeMap: Record<PageView, string> = {
  'dashboard': '/dashboard',
  'itsm-requests': '/itsm',
  'monitoring': '/monitoring',
  'nodes': '/devices',
  'phone-systems': '/phone-systems',
  'call-report': '/call-report',
  'automation-dashboard': '/automation',
  'automation-builder': '/automation/builder',
  'agents': '/agents',
  'mcp': '/mcp',
  'ai-compute': '/ai-compute',
  'fax-management': '/fax',
  'ivr': '/ivr',
  'phone-provisioning': '/phone-provisioning',
  'providers': '/providers',
  'connectors': '/connectors',
  'stacks': '/infrastructure/stacks',
  'admin': '/admin',
  'settings': '/settings',
};

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['automation', 'ai', 'unified-communication', 'integrations-section']);
  const { hasPermission, permissions } = useAuth();
  const { isFeatureEnabled, features } = useFeatureFlags();

  // Check if user can see a page (permission + feature flag)
  const canAccessPage = (pageId: string): boolean => {
    // First check if feature is enabled
    if (!isFeatureEnabled(pageId)) return false;

    // Then check permissions
    const permission = pagePermissions[pageId];
    if (!permission) return true; // No permission required
    return hasPermission(permission.resource, permission.action);
  };

  // Determine current page from pathname
  const getCurrentPage = (): PageView => {
    const entry = Object.entries(routeMap).find(([_, route]) => route === pathname);
    return entry ? (entry[0] as PageView) : 'dashboard';
  };

  const currentPage = getCurrentPage();

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const allNavItems = [
    { id: 'dashboard' as PageView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'itsm-requests' as PageView, icon: FileText, label: 'ITSM Requests' },
    { id: 'monitoring' as PageView, icon: Activity, label: 'Monitoring' },
    {
      id: 'automation',
      icon: Workflow,
      label: 'Automation',
      isSection: true,
      children: [
        { id: 'automation-dashboard' as PageView, icon: BarChart3, label: 'Dashboard' },
        { id: 'automation-builder' as PageView, icon: Zap, label: 'Builder' },
      ]
    },
    {
      id: 'ai',
      icon: Bot,
      label: 'AI',
      isSection: true,
      children: [
        { id: 'agents' as PageView, icon: Bot, label: 'Agents' },
        { id: 'mcp' as PageView, icon: Network, label: 'MCP' },
        { id: 'ai-compute' as PageView, icon: Cpu, label: 'AI Compute' },
      ]
    },
    {
      id: 'unified-communication',
      icon: Phone,
      label: 'Unified Communication',
      isSection: true,
      children: [
        { id: 'phone-systems' as PageView, icon: Server, label: 'Phone Systems' },
        { id: 'phone-provisioning' as PageView, icon: Phone, label: 'Phone Provisioning' },
        { id: 'call-report' as PageView, icon: BarChart3, label: 'Call Report' },
        { id: 'fax-management' as PageView, icon: FileImage, label: 'Fax Management' },
        { id: 'ivr' as PageView, icon: Paintbrush, label: 'IVR Management' },
      ]
    },
    {
      id: 'integrations-section',
      icon: Plug,
      label: 'Integrations',
      isSection: true,
      children: [
        { id: 'nodes' as PageView, icon: Server, label: 'Nodes' },
        { id: 'providers' as PageView, icon: Store, label: 'Providers' },
        { id: 'connectors' as PageView, icon: Cable, label: 'Connectors' },
        { id: 'stacks' as PageView, icon: Layers, label: 'Stacks' },
      ]
    },
    { id: 'admin' as PageView, icon: Shield, label: 'Admin' },
  ];

  // Filter nav items based on permissions and feature flags
  const navItems = useMemo(() => {
    return allNavItems.filter(item => {
      if ('isSection' in item && item.isSection && item.children) {
        // For sections, filter children first
        const visibleChildren = item.children.filter(child => canAccessPage(child.id));
        // Only show section if at least one child is visible
        return visibleChildren.length > 0;
      }
      return canAccessPage(item.id);
    }).map(item => {
      if ('isSection' in item && item.isSection && item.children) {
        // Filter children for sections
        return {
          ...item,
          children: item.children.filter(child => canAccessPage(child.id))
        };
      }
      return item;
    });
  // Include features in dependencies so sidebar reacts to feature flag changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions, features]);

  return (
    <div className={`bg-gray-900 text-gray-300 flex flex-col transition-all duration-300 border-r border-gray-700 ${collapsed ? 'w-16' : 'w-64'}`}>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          // Section with children
          if ('isSection' in item && item.isSection) {
            const isExpanded = expandedSections.includes(item.id);

            return (
              <div key={item.id}>
                <button
                  onClick={() => !collapsed && toggleSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-gray-800 text-gray-300`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </>
                  )}
                </button>

                {!collapsed && isExpanded && item.children && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = currentPage === child.id;

                      return (
                        <Link
                          key={child.id}
                          href={routeMap[child.id]}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                            isChildActive
                              ? 'bg-blue-600 text-white'
                              : 'hover:bg-gray-800 text-gray-400'
                          }`}
                        >
                          <ChildIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular nav item
          return (
            <Link
              key={item.id}
              href={routeMap[item.id as PageView]}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className="my-4 border-t border-gray-700"></div>

        <Link
          href={routeMap.settings}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            currentPage === 'settings'
              ? 'bg-blue-600 text-white'
              : 'hover:bg-gray-800 text-gray-300'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="p-4 hover:bg-gray-800 transition-colors flex items-center justify-center border-t border-gray-700"
      >
        <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
