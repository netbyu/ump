import { Search, Volume2, Hash, MessageSquare, Users, Phone, PhoneForwarded, GitBranch, Clock, Link, Voicemail, PhoneOff, PhoneCall, Star } from 'lucide-react';

export function NodePalette() {
  const categories = [
    {
      name: '🔊 Audio',
      nodes: [
        { icon: Volume2, label: 'Announcement', type: 'announcement' },
        { icon: Hash, label: 'DTMF Menu', type: 'menu' },
        { icon: MessageSquare, label: 'TTS Prompt', type: 'tts' },
      ],
    },
    {
      name: '🔀 Routing',
      nodes: [
        { icon: Users, label: 'Queue', type: 'queue' },
        { icon: Phone, label: 'Extension', type: 'extension' },
        { icon: PhoneForwarded, label: 'External Transfer', type: 'transfer' },
      ],
    },
    {
      name: '🧠 Logic',
      nodes: [
        { icon: GitBranch, label: 'Condition', type: 'condition' },
        { icon: Clock, label: 'Time Check', type: 'time' },
        { icon: Link, label: 'API Lookup', type: 'api' },
      ],
    },
    {
      name: '🏁 Endpoints',
      nodes: [
        { icon: Voicemail, label: 'Voicemail', type: 'voicemail' },
        { icon: PhoneOff, label: 'Disconnect', type: 'hangup' },
        { icon: PhoneCall, label: 'Callback', type: 'callback' },
        { icon: Star, label: 'Survey', type: 'survey' },
      ],
    },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="text-gray-900 mb-3">🧩 Components</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
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
