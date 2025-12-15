import { Activity, CheckCircle, XCircle, Clock, Zap, TrendingUp, AlertCircle, PlayCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function TemporalDashboard() {
  // Mock data for workflow execution trends
  const executionTrends = [
    { time: '00:00', completed: 45, failed: 5, running: 12 },
    { time: '04:00', completed: 38, failed: 3, running: 8 },
    { time: '08:00', completed: 62, failed: 8, running: 15 },
    { time: '12:00', completed: 78, failed: 12, running: 22 },
    { time: '16:00', completed: 85, failed: 7, running: 18 },
    { time: '20:00', completed: 56, failed: 4, running: 14 },
  ];

  // Mock data for workflow types
  const workflowTypes = [
    { name: 'Phone Provisioning', value: 145, color: '#3b82f6' },
    { name: 'IVR Updates', value: 98, color: '#8b5cf6' },
    { name: 'Port Configuration', value: 87, color: '#10b981' },
    { name: 'Debug Phone', value: 65, color: '#f59e0b' },
    { name: 'User Management', value: 54, color: '#ef4444' },
  ];

  // Mock data for recent workflows
  const recentWorkflows = [
    { id: 'WF-1234', name: 'Debug Phone - Dave Gauthier', status: 'completed', duration: '45s', startTime: '2 min ago' },
    { id: 'WF-1235', name: 'Provision New Phone', status: 'running', duration: '12s', startTime: '5 min ago' },
    { id: 'WF-1236', name: 'Update IVR Menu', status: 'completed', duration: '2m 15s', startTime: '8 min ago' },
    { id: 'WF-1237', name: 'Port Configuration', status: 'failed', duration: '1m 05s', startTime: '12 min ago' },
    { id: 'WF-1238', name: 'Phone QoS Check', status: 'completed', duration: '38s', startTime: '15 min ago' },
  ];

  // Mock data for task queue metrics
  const taskQueues = [
    { name: 'phone-operations', pending: 12, active: 5, backlog: 3 },
    { name: 'ivr-updates', pending: 8, active: 3, backlog: 1 },
    { name: 'network-config', pending: 15, active: 7, backlog: 5 },
    { name: 'user-provisioning', pending: 6, active: 2, backlog: 0 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'running':
        return <PlayCircle className="w-4 h-4 text-blue-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-400/10';
      case 'running':
        return 'text-blue-400 bg-blue-400/10';
      case 'failed':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white mb-1">Temporal Automation Dashboard</h1>
          <p className="text-gray-400 text-sm">Monitor workflow execution and infrastructure metrics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          <span>Temporal Connected</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Total Executions (24h)</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl text-white mb-1">1,847</div>
          <div className="flex items-center gap-1 text-sm text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>+12.5% from yesterday</span>
          </div>
        </Card>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Success Rate</span>
            <Zap className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl text-white mb-1">97.8%</div>
          <div className="flex items-center gap-1 text-sm text-blue-400">
            <span>2.2% failed</span>
          </div>
        </Card>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Active Workflows</span>
            <PlayCircle className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl text-white mb-1">18</div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <span>Across 4 task queues</span>
          </div>
        </Card>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Avg. Duration</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl text-white mb-1">42s</div>
          <div className="flex items-center gap-1 text-sm text-green-400">
            <TrendingUp className="w-3 h-3" />
            <span>15% faster</span>
          </div>
        </Card>
      </div>

      {/* Execution Trends & Workflow Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700 p-6 lg:col-span-2">
          <h2 className="text-white mb-4">Workflow Execution Trends (24h)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={executionTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
              <Line type="monotone" dataKey="running" stroke="#3b82f6" strokeWidth={2} name="Running" />
              <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <h2 className="text-white mb-4">Workflow Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={workflowTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {workflowTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {workflowTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                  <span className="text-gray-300">{type.name}</span>
                </div>
                <span className="text-gray-400">{type.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Task Queue Metrics */}
      <Card className="bg-gray-800 border-gray-700 p-6">
        <h2 className="text-white mb-4">Task Queue Metrics</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={taskQueues}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Bar dataKey="active" fill="#3b82f6" name="Active" />
            <Bar dataKey="pending" fill="#8b5cf6" name="Pending" />
            <Bar dataKey="backlog" fill="#f59e0b" name="Backlog" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Recent Workflow Executions */}
      <Card className="bg-gray-800 border-gray-700 p-6">
        <h2 className="text-white mb-4">Recent Workflow Executions</h2>
        <div className="space-y-3">
          {recentWorkflows.map((workflow) => (
            <div 
              key={workflow.id}
              className="flex items-center justify-between p-4 bg-gray-750 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1">
                {getStatusIcon(workflow.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white">{workflow.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(workflow.status)}`}>
                      {workflow.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {workflow.id} • Started {workflow.startTime}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{workflow.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Temporal Server</span>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-lg text-green-400 mb-1">Healthy</div>
          <div className="text-xs text-gray-500">temporal.ucmp.local:7233</div>
        </Card>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Worker Pools</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-lg text-white mb-1">4 Active</div>
          <div className="text-xs text-gray-500">12 workers total</div>
        </Card>

        <Card className="bg-gray-800 border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Namespace</span>
            <AlertCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg text-white mb-1">ucmp-prod</div>
          <div className="text-xs text-gray-500">Default namespace</div>
        </Card>
      </div>
    </div>
  );
}