import { LayoutDashboard, FileText, Paintbrush, Zap, UserCircle, Plug, Settings, ChevronLeft, Shield, Server, BarChart3, Bot, FileImage, Activity, ChevronDown, Workflow, Network } from 'lucide-react';
import { PageView } from '../App';
import { useState } from 'react';

interface SidebarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ currentPage, onNavigate, collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['automation', 'ai', 'management']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navItems = [
    { id: 'dashboard' as PageView, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'itsm-requests' as PageView, icon: FileText, label: 'ITSM Requests' },
    { id: 'monitoring' as PageView, icon: Activity, label: 'Monitoring' },
    { id: 'phone-systems' as PageView, icon: Server, label: 'Phone Systems' },
    { id: 'call-report' as PageView, icon: BarChart3, label: 'Call Report' },
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
      ]
    },
    { 
      id: 'management',
      icon: Settings, 
      label: 'Management',
      isSection: true,
      children: [
        { id: 'fax-management' as PageView, icon: FileImage, label: 'Fax Management' },
        { id: 'ivr' as PageView, icon: Paintbrush, label: 'IVR Management' },
      ]
    },
    { id: 'self-service' as PageView, icon: UserCircle, label: 'User Self-Service Portal' },
    { id: 'integrations' as PageView, icon: Plug, label: 'Integrations' },
    { id: 'admin' as PageView, icon: Shield, label: 'Admin' },
  ];

  return (
    <div className={`bg-gray-900 text-gray-300 flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
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
                        <button
                          key={child.id}
                          onClick={() => onNavigate(child.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                            isChildActive 
                              ? 'bg-blue-600 text-white' 
                              : 'hover:bg-gray-800 text-gray-400'
                          }`}
                        >
                          <ChildIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          
          // Regular nav item
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}

        <div className="my-4 border-t border-gray-700"></div>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            currentPage === 'settings'
              ? 'bg-blue-600 text-white' 
              : 'hover:bg-gray-800 text-gray-300'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
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