import { useState } from 'react';
import { Phone, MapPin, Users, BellOff, PhoneForwarded, Voicemail, Mic, Play, Trash2, Edit, Upload, Plus } from 'lucide-react';

type SelfServiceView = 'dashboard' | 'forwarding' | 'greetings';

export function SelfService() {
  const [activeView, setActiveView] = useState<SelfServiceView>('dashboard');
  const [forwardingActive, setForwardingActive] = useState(false);

  return (
    <div className="flex h-full">
      {/* Left Navigation */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-6">
          <div className="text-gray-900 mb-2">Hello, Alex</div>
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-700">Available</span>
          </div>
        </div>

        <nav className="space-y-1">
          {[
            { id: 'dashboard' as const, icon: Phone, label: 'My Dashboard' },
            { id: 'forwarding' as const, icon: PhoneForwarded, label: 'Call Forwarding' },
            { id: 'greetings' as const, icon: Mic, label: 'Greetings' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  activeView === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {activeView === 'dashboard' && (
          <div className="max-w-4xl space-y-6">
            <div className="text-gray-900">🏠 My Dashboard</div>

            {/* My Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-gray-900 mb-4">📞 My Information</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-500">Extension</div>
                    <div className="text-gray-900">1234</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-500">Location</div>
                    <div className="text-gray-900">HQ Floor 2</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-500">Queues</div>
                    <div className="text-gray-900">Sales, Support</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Voicemail className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-gray-500">Voicemail</div>
                    <div className="text-gray-900">3 new messages</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-gray-900 mb-4">⚡ Quick Actions</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <BellOff className="w-6 h-6 text-gray-600" />
                  <span className="text-gray-700">Set DND</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <PhoneForwarded className="w-6 h-6 text-gray-600" />
                  <span className="text-gray-700">Forward Calls</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all relative">
                  <Voicemail className="w-6 h-6 text-gray-600" />
                  <span className="text-gray-700">Voicemail</span>
                  <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    3
                  </span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <Mic className="w-6 h-6 text-gray-600" />
                  <span className="text-gray-700">Update Greeting</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-gray-900 mb-4">📋 Recent Activity</div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-red-500" />
                  <div className="flex-1">
                    <div className="text-gray-900">Missed call from +1-555-0123</div>
                    <div className="text-gray-500">5 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Voicemail className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="text-gray-900">New voicemail (2:14)</div>
                    <div className="text-gray-500">15 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <PhoneForwarded className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <div className="text-gray-900">Forward rule activated</div>
                    <div className="text-gray-500">1 hour ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'forwarding' && (
          <div className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-gray-900">↪️ Call Forwarding</div>
              <label className="flex items-center gap-3">
                <span className="text-gray-700">Forwarding</span>
                <button
                  onClick={() => setForwardingActive(!forwardingActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    forwardingActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    forwardingActive ? 'translate-x-6' : ''
                  }`}></div>
                </button>
              </label>
            </div>

            {/* Forwarding Rules */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-900">📋 Forwarding Rules</div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Add Rule</span>
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { id: 1, name: 'Always Forward', target: '+1-555-9999' },
                  { id: 2, name: 'When Busy', target: 'Voicemail' },
                  { id: 3, name: 'After 20 seconds', target: 'Mobile' },
                ].map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="text-gray-900">{rule.name}</div>
                      <div className="text-gray-600">→ {rule.target}</div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule-Based Forwarding */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-gray-900 mb-4">🕐 Schedule-Based Forwarding</div>
              <div className="space-y-3">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Business Hours (Active)</span>
                  </div>
                  <div className="text-green-600">Mon-Fri 9am-5pm → Extension</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="text-gray-900 mb-1">After Hours</div>
                  <div className="text-gray-600">→ Mobile: +1-555-1234</div>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="text-gray-900 mb-1">Weekends</div>
                  <div className="text-gray-600">→ Voicemail</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'greetings' && (
          <div className="max-w-4xl space-y-6">
            <div className="text-gray-900">🎙️ Greetings Manager</div>

            {/* Active Greeting */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium">✅ Active Greeting</span>
              </div>
              <div className="text-blue-900">"Standard Business"</div>
            </div>

            {/* Greetings Library */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-gray-900 mb-4">📚 My Greetings Library</div>
              <div className="space-y-3">
                {[
                  { id: 1, name: 'Standard Business', duration: '0:08', active: true },
                  { id: 2, name: 'Out of Office', duration: '0:12', active: false },
                  { id: 3, name: 'Holiday Message', duration: '0:15', active: false },
                ].map((greeting) => (
                  <div
                    key={greeting.id}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg ${
                      greeting.active ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <Mic className={`w-5 h-5 ${greeting.active ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div className="flex-1">
                      <div className={greeting.active ? 'text-blue-900' : 'text-gray-900'}>
                        {greeting.name}
                      </div>
                      <div className={greeting.active ? 'text-blue-600' : 'text-gray-500'}>
                        Duration: {greeting.duration}
                      </div>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                      <Play className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded transition-colors">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create New Greeting */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-gray-900 mb-4">➕ Create New Greeting</div>
              <div className="grid grid-cols-3 gap-4">
                <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Mic className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <div className="text-gray-900">Record from Browser</div>
                    <div className="text-gray-500 mt-1">Use your microphone</div>
                  </div>
                </button>
                <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-gray-900">Upload Audio File</div>
                    <div className="text-gray-500 mt-1">WAV, MP3, or M4A</div>
                  </div>
                </button>
                <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600">🗣️</span>
                  </div>
                  <div>
                    <div className="text-gray-900">Text-to-Speech</div>
                    <div className="text-gray-500 mt-1">Generate from text</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
