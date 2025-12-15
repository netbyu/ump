import { useState } from 'react';
import { Search, Plus, Settings, BarChart3, Pause, Play, RefreshCw, X } from 'lucide-react';

type IntegrationStatus = 'connected' | 'warning' | 'paused' | 'disconnected';

interface Integration {
  id: string;
  name: string;
  icon: string;
  status: IntegrationStatus;
  description: string;
  category: string;
}

const integrations: Integration[] = [
  {
    id: '1',
    name: 'ServiceNow',
    icon: '❄️',
    status: 'connected',
    description: 'Ticket sync, incident management',
    category: 'itsm',
  },
  {
    id: '2',
    name: 'Workday',
    icon: '📊',
    status: 'connected',
    description: 'HR events, employee sync',
    category: 'hr',
  },
  {
    id: '3',
    name: 'Salesforce',
    icon: '☁️',
    status: 'warning',
    description: 'CRM sync, contact lookup',
    category: 'crm',
  },
  {
    id: '4',
    name: 'Microsoft Teams',
    icon: '🟣',
    status: 'paused',
    description: 'Notifications, presence sync',
    category: 'comm',
  },
];

export function IntegrationHub() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  const statusColors: Record<IntegrationStatus, string> = {
    connected: 'bg-green-400/10 text-green-400 border-green-400/30',
    warning: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
    paused: 'bg-gray-400/10 text-gray-400 border-gray-400/30',
    disconnected: 'bg-red-400/10 text-red-400 border-red-400/30',
  };

  const statusLabels: Record<IntegrationStatus, string> = {
    connected: '🟢 Connected',
    warning: '🟡 Warning',
    paused: '⏸️ Paused',
    disconnected: '🔴 Disconnected',
  };

  const categories = [
    { id: 'all', label: '📋 All Integrations', count: 12 },
    { id: 'active', label: '✅ Active', count: 8 },
    { id: 'inactive', label: '⏸️ Inactive', count: 4 },
    { id: 'itsm', label: '🎫 ITSM / Ticketing' },
    { id: 'hr', label: '👔 HR Systems' },
    { id: 'crm', label: '💼 CRM' },
    { id: 'comm', label: '💬 Communication' },
    { id: 'analytics', label: '📊 Analytics' },
    { id: 'custom', label: '🔧 Custom / Webhooks' },
  ];

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="space-y-1">
          {categories.map((category, idx) => (
            <div key={category.id}>
              {idx === 3 && <div className="my-3 border-t border-gray-700"></div>}
              <button
                onClick={() => setSelectedCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span>{category.label}</span>
                {category.count && (
                  <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                    {category.count}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-900">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-white">🔗 Integration Hub</div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search integrations..."
                  className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Add Integration</span>
              </button>
              <div className="px-3 py-2 bg-green-400/10 border border-green-400/30 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400">All Systems Operational</span>
              </div>
            </div>
          </div>

          {/* Integration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-gray-800 rounded-lg border-2 border-gray-700 p-6 hover:border-blue-500 transition-all cursor-pointer"
                onClick={() => setSelectedIntegration(integration.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{integration.icon}</span>
                    <div>
                      <div className="text-white mb-1">{integration.name}</div>
                      <div className={`inline-flex items-center px-2 py-1 rounded border ${statusColors[integration.status]}`}>
                        {statusLabels[integration.status]}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-gray-400 mb-4">{integration.description}</div>

                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1 px-3 py-1.5 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors">
                    <Settings className="w-3 h-3" />
                    <span>Configure</span>
                  </button>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors">
                    <BarChart3 className="w-3 h-3" />
                    <span>Stats</span>
                  </button>
                  {integration.status === 'paused' ? (
                    <button className="flex items-center gap-1 px-3 py-1.5 text-green-400 border border-green-400/30 rounded hover:bg-green-400/10 transition-colors">
                      <Play className="w-3 h-3" />
                      <span>Resume</span>
                    </button>
                  ) : integration.status === 'warning' ? (
                    <button className="flex items-center gap-1 px-3 py-1.5 text-blue-400 border border-blue-400/30 rounded hover:bg-blue-400/10 transition-colors">
                      <RefreshCw className="w-3 h-3" />
                      <span>Reconnect</span>
                    </button>
                  ) : (
                    <button className="flex items-center gap-1 px-3 py-1.5 text-gray-300 border border-gray-600 rounded hover:bg-gray-700 transition-colors">
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add New Card */}
            <div className="bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 p-6 hover:border-blue-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px]">
              <Plus className="w-12 h-12 text-gray-500 mb-3" />
              <div className="text-gray-300">Add New Integration</div>
              <div className="text-gray-500 mt-1">Browse Catalog</div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Panel (Slide-out) */}
      {selectedIntegration && (
        <div className="w-96 bg-gray-800 border-l-2 border-gray-700 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {integrations.find(i => i.id === selectedIntegration)?.icon}
              </span>
              <div className="text-white">
                {integrations.find(i => i.id === selectedIntegration)?.name} Configuration
              </div>
            </div>
            <button
              onClick={() => setSelectedIntegration(null)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Connection Info */}
            <div>
              <div className="text-white mb-3">🔌 Connection</div>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 mb-1">🌐 Instance</div>
                  <div className="text-white">company.service-now.com</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">🔐 Authentication</div>
                  <div className="text-white">OAuth 2.0</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">👤 Service Account</div>
                  <div className="text-white">svc_telephony</div>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  🧪 Test Connection
                </button>
              </div>
            </div>

            {/* Sync Settings */}
            <div>
              <div className="text-white mb-3">🔄 Sync Settings</div>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 mb-1">↔️ Direction</div>
                  <div className="text-white">Bidirectional</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">⏱️ Interval</div>
                  <div className="text-white">Real-time</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">📦 Objects</div>
                  <div className="text-white">Incidents, Changes, Users</div>
                </div>
              </div>
            </div>

            {/* Health & Stats */}
            <div>
              <div className="text-white mb-3">📊 Health & Stats</div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-400/10 rounded-lg border border-green-400/30">
                  <span className="text-green-400">🟢 Uptime</span>
                  <span className="text-green-300">99.8%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <span className="text-gray-300">⏱️ Last Sync</span>
                  <span className="text-white">2 min ago</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <span className="text-gray-300">📈 24h Volume</span>
                  <span className="text-white">1,234 events</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-400/10 rounded-lg border border-red-400/30">
                  <span className="text-red-400">❌ Errors (24h)</span>
                  <span className="text-red-300">3</span>
                </div>
                <button className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                  📋 View Logs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}