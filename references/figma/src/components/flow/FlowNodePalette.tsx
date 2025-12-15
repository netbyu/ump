import { Search, Radio, Calendar, Webhook, Briefcase, Ticket, TrendingUp, Plus, Edit, Bell, Link2, FileCode, Clock, GitBranch, Repeat, CheckSquare } from 'lucide-react';

export function FlowNodePalette() {
  const categories = [
    {
      name: '🎯 Triggers',
      nodes: [
        { icon: Radio, label: 'Platform Event', type: 'trigger' },
        { icon: Calendar, label: 'Scheduled', type: 'schedule' },
        { icon: Webhook, label: 'Webhook', type: 'webhook' },
        { icon: Briefcase, label: 'HR Event', type: 'hr' },
        { icon: Ticket, label: 'Ticket Event', type: 'ticket' },
        { icon: TrendingUp, label: 'Threshold Alert', type: 'threshold' },
      ],
    },
    {
      name: '⚙️ Actions',
      nodes: [
        { icon: Plus, label: 'Provision', type: 'provision' },
        { icon: Edit, label: 'Modify', type: 'modify' },
        { icon: Bell, label: 'Notify', type: 'notify' },
        { icon: Link2, label: 'HTTP Request', type: 'http' },
        { icon: Ticket, label: 'Create Ticket', type: 'createTicket' },
        { icon: FileCode, label: 'Run Script', type: 'script' },
        { icon: Clock, label: 'Delay', type: 'wait' },
        { icon: GitBranch, label: 'Condition', type: 'condition' },
        { icon: Repeat, label: 'Loop', type: 'loop' },
        { icon: CheckSquare, label: 'Approval Gate', type: 'approval' },
      ],
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="text-gray-900 mb-3">🧩 Triggers & Actions</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {categories.map((category) => (
          <div key={category.name}>
            <div className="text-gray-700 mb-3">{category.name}</div>
            <div className="space-y-2">
              {category.nodes.map((node) => {
                const Icon = node.icon;
                return (
                  <button
                    key={node.type}
                    className="w-full flex items-center gap-3 px-3 py-2.5 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-move"
                    draggable
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <Icon className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <span className="text-gray-700 group-hover:text-blue-700">{node.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
