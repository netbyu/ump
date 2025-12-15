import { useState } from 'react';
import { Calendar, RefreshCw, Server, Phone, Wifi, Database, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, X, ExternalLink, ArrowLeft, User, Tag } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type TicketGroup = 'incidents' | 'service-requests' | 'problems';
type ViewMode = 'summary' | 'group-list' | 'ticket-detail';

interface DashboardProps {
  onNavigateToOctopus: (group: TicketGroup) => void;
}

interface ZabbixMetric {
  id: string;
  name: string;
  value: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: any;
  trend?: { value: number; isPositive: boolean };
}

interface OctopusTicketSummary {
  type: TicketGroup;
  label: string;
  icon: string;
  count: number;
  urgent: number;
  color: string;
}

interface OctopusTicket {
  id: string;
  ticketNumber: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  assignedTo: string;
  created: string;
  description: string;
  affectedService?: string;
}

const uptimeData = [
  { time: '00:00', uptime: 99.9 },
  { time: '04:00', uptime: 99.8 },
  { time: '08:00', uptime: 99.9 },
  { time: '12:00', uptime: 99.7 },
  { time: '16:00', uptime: 99.9 },
  { time: '20:00', uptime: 100 },
  { time: '24:00', uptime: 99.9 },
];

const callVolumeData = [
  { time: '00:00', calls: 45 },
  { time: '04:00', calls: 12 },
  { time: '08:00', calls: 156 },
  { time: '12:00', calls: 234 },
  { time: '16:00', calls: 189 },
  { time: '20:00', calls: 98 },
  { time: '24:00', calls: 52 },
];

const zabbixMetrics: ZabbixMetric[] = [
  {
    id: '1',
    name: 'SIP Server Status',
    value: 'Online',
    status: 'healthy',
    icon: Server,
  },
  {
    id: '2',
    name: 'Active Calls',
    value: '47',
    status: 'healthy',
    icon: Phone,
    trend: { value: 12, isPositive: true },
  },
  {
    id: '3',
    name: 'Registered Extensions',
    value: '1,247 / 1,250',
    status: 'healthy',
    icon: Wifi,
  },
  {
    id: '4',
    name: 'Database Connections',
    value: '28 / 100',
    status: 'healthy',
    icon: Database,
  },
  {
    id: '5',
    name: 'Call Quality (MOS)',
    value: '4.2',
    status: 'healthy',
    icon: TrendingUp,
  },
  {
    id: '6',
    name: 'Failed Calls (1h)',
    value: '3',
    status: 'warning',
    icon: AlertTriangle,
  },
];

const ticketGroups: OctopusTicketSummary[] = [
  {
    type: 'incidents',
    label: 'Incidents',
    icon: '🚨',
    count: 8,
    urgent: 2,
    color: 'border-red-300 bg-red-50 hover:bg-red-100',
  },
  {
    type: 'service-requests',
    label: 'Service Requests',
    icon: '📋',
    count: 24,
    urgent: 5,
    color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
  },
  {
    type: 'problems',
    label: 'Problems',
    icon: '⚙️',
    count: 3,
    urgent: 1,
    color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
  },
];

const mockTickets: Record<TicketGroup, OctopusTicket[]> = {
  'incidents': [
    {
      id: '1',
      ticketNumber: 'INC-45901',
      title: 'SIP trunk connectivity issues - Atlanta office',
      priority: 'critical',
      status: 'In Progress',
      assignedTo: 'Network Team',
      created: '2024-01-15 14:23',
      description: 'Multiple users reporting cannot make outbound calls',
      affectedService: 'SIP Trunk - ATL-01',
    },
    {
      id: '2',
      ticketNumber: 'INC-45889',
      title: 'Voicemail system intermittent failures',
      priority: 'high',
      status: 'Investigating',
      assignedTo: 'You',
      created: '2024-01-15 12:45',
      description: 'Users unable to access voicemail randomly',
      affectedService: 'Voicemail Platform',
    },
    {
      id: '3',
      ticketNumber: 'INC-45876',
      title: 'Call quality degradation - West region',
      priority: 'medium',
      status: 'Monitoring',
      assignedTo: 'QA Team',
      created: '2024-01-15 10:12',
      description: 'Reports of choppy audio on calls',
      affectedService: 'Media Gateway - West',
    },
  ],
  'service-requests': [
    {
      id: '4',
      ticketNumber: 'SR-45932',
      title: 'Provision 15 new extensions for Sales onboarding',
      priority: 'high',
      status: 'Pending',
      assignedTo: 'You',
      created: '2024-01-15 15:30',
      description: 'New hire batch starting Monday - need extensions ready',
    },
    {
      id: '5',
      ticketNumber: 'SR-45921',
      title: 'Update IVR menu for Customer Support',
      priority: 'medium',
      status: 'In Progress',
      assignedTo: 'You',
      created: '2024-01-15 13:20',
      description: 'Add new option for Technical Support queue',
    },
    {
      id: '6',
      ticketNumber: 'SR-45908',
      title: 'Configure call recording for Compliance team',
      priority: 'medium',
      status: 'Pending',
      assignedTo: 'Compliance Admin',
      created: '2024-01-15 11:05',
      description: 'Enable automatic recording for all compliance extensions',
    },
  ],
  'problems': [
    {
      id: '7',
      ticketNumber: 'PRB-45899',
      title: 'Recurring registration failures for Polycom devices',
      priority: 'high',
      status: 'Root Cause Analysis',
      assignedTo: 'Engineering Team',
      created: '2024-01-14 16:40',
      description: 'Pattern identified: Polycom VVX series losing registration every 4 hours',
      affectedService: 'SIP Registrar',
    },
    {
      id: '8',
      ticketNumber: 'PRB-45867',
      title: 'Database performance degradation during peak hours',
      priority: 'medium',
      status: 'Investigating',
      assignedTo: 'DBA Team',
      created: '2024-01-14 09:15',
      description: 'Call setup delays observed between 12-2pm daily',
      affectedService: 'Primary Database',
    },
  ],
};

export function Dashboard({ onNavigateToOctopus }: DashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedGroup, setSelectedGroup] = useState<TicketGroup | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<OctopusTicket | null>(null);

  const handleGroupClick = (group: TicketGroup) => {
    onNavigateToOctopus(group);
  };

  const handleTicketClick = (ticket: OctopusTicket) => {
    setSelectedTicket(ticket);
    setViewMode('ticket-detail');
  };

  const handleBackToSummary = () => {
    setViewMode('summary');
    setSelectedGroup(null);
    setSelectedTicket(null);
  };

  const handleBackToGroupList = () => {
    setViewMode('group-list');
    setSelectedTicket(null);
  };

  const priorityColors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white',
  };

  // Summary View
  if (viewMode === 'summary') {
    return (
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white">👋 Welcome Back, Admin</div>
            <div className="text-gray-400 mt-1">Phone System & Ticket Overview</div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
              <Calendar className="w-4 h-4" />
              <span>Last 24 Hours</span>
            </button>
            <button className="p-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Zabbix Phone System Status */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-white">Phone System Status</div>
                <div className="text-gray-400 mt-1">Zabbix Monitoring</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900/30 border border-green-700/50 rounded-lg">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300">All Systems Operational</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {zabbixMetrics.map((metric) => {
              const Icon = metric.icon;
              const statusColor = 
                metric.status === 'healthy' ? 'border-green-700/50 bg-green-900/20' :
                metric.status === 'warning' ? 'border-yellow-700/50 bg-yellow-900/20' :
                'border-red-700/50 bg-red-900/20';
              
              return (
                <div key={metric.id} className={`p-4 rounded-lg border-2 ${statusColor}`}>
                  <Icon className={`w-5 h-5 mb-2 ${
                    metric.status === 'healthy' ? 'text-green-400' :
                    metric.status === 'warning' ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                  <div className="text-gray-400 mb-1">{metric.name}</div>
                  <div className="text-white">{metric.value}</div>
                  {metric.trend && (
                    <div className={`flex items-center gap-1 mt-1 ${metric.trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {metric.trend.isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{metric.trend.value}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Uptime */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="text-white mb-4">📈 System Uptime (24h)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={uptimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis domain={[99, 100]} stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                <Line type="monotone" dataKey="uptime" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Call Volume */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <div className="text-white mb-4">📞 Call Volume (24h)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={callVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} />
                <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Octopus ITSM Ticket Groups */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236366f1' d='M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z'/%3E%3C/svg%3E" alt="Octopus" className="w-8 h-8" />
            <div>
              <div className="text-white">Octopus ITSM - Pending Requests</div>
              <div className="text-gray-400 mt-1">Click a category to view tickets</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ticketGroups.map((group) => (
              <button
                key={group.type}
                onClick={() => handleGroupClick(group.type)}
                className={`p-6 rounded-lg border-2 transition-all text-left ${
                  group.type === 'incidents' ? 'border-red-700/50 bg-red-900/20 hover:bg-red-900/30' :
                  group.type === 'service-requests' ? 'border-blue-700/50 bg-blue-900/20 hover:bg-blue-900/30' :
                  'border-orange-700/50 bg-orange-900/20 hover:bg-orange-900/30'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{group.icon}</span>
                  {group.urgent > 0 && (
                    <span className="px-2 py-1 bg-red-600 text-white rounded">
                      {group.urgent} Urgent
                    </span>
                  )}
                </div>
                <div className="text-white mb-2">{group.label}</div>
                <div className="text-gray-400">{group.count} open tickets</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Group List View
  if (viewMode === 'group-list' && selectedGroup) {
    const groupData = ticketGroups.find(g => g.type === selectedGroup)!;
    const tickets = mockTickets[selectedGroup];

    return (
      <div className="p-8 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSummary}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{groupData.icon}</span>
              <div>
                <div className="text-gray-900">{groupData.label}</div>
                <div className="text-gray-500 mt-1">{tickets.length} tickets</div>
              </div>
            </div>
          </div>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Ticket List */}
        <div className="grid grid-cols-1 gap-4">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => handleTicketClick(ticket)}
              className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <a
                    href="#"
                    onClick={(e) => e.stopPropagation()}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
                  >
                    {ticket.ticketNumber}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className={`px-2 py-1 rounded ${priorityColors[ticket.priority]}`}>
                    {ticket.priority.toUpperCase()}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                    {ticket.status}
                  </span>
                </div>
              </div>
              
              <div className="text-gray-900 mb-2">{ticket.title}</div>
              <div className="text-gray-600 mb-3">{ticket.description}</div>
              
              <div className="flex items-center gap-4 text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{ticket.assignedTo}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{ticket.created}</span>
                </div>
                {ticket.affectedService && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    <span>{ticket.affectedService}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Ticket Detail View
  if (viewMode === 'ticket-detail' && selectedTicket) {
    return (
      <div className="p-8 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToGroupList}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <a
                href="#"
                className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
              >
                {selectedTicket.ticketNumber}
                <ExternalLink className="w-4 h-4" />
              </a>
              <span className={`px-2 py-1 rounded ${priorityColors[selectedTicket.priority]}`}>
                {selectedTicket.priority.toUpperCase()}
              </span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {selectedTicket.status}
              </span>
            </div>
            <div className="text-gray-900">{selectedTicket.title}</div>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-gray-900 mb-4">📋 Ticket Information</div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-gray-600 mb-1">Assigned To</div>
              <div className="text-gray-900">{selectedTicket.assignedTo}</div>
            </div>
            <div>
              <div className="text-gray-600 mb-1">Created</div>
              <div className="text-gray-900">{selectedTicket.created}</div>
            </div>
            {selectedTicket.affectedService && (
              <div className="col-span-2">
                <div className="text-gray-600 mb-1">Affected Service</div>
                <div className="text-gray-900">{selectedTicket.affectedService}</div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-gray-600 mb-1">Description</div>
              <div className="text-gray-900">{selectedTicket.description}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Open in MAC Request Portal
          </button>
          <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            View in Octopus
          </button>
        </div>
      </div>
    );
  }

  return null;
}