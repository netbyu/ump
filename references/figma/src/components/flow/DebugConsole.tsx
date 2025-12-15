import { Play, Pause, SkipForward, StepForward, Square, RotateCcw, Search, Trash2, Copy, ChevronDown } from 'lucide-react';

export function DebugConsole() {
  const logs = [
    { time: '10:23:45.001', level: 'INFO', message: "Flow 'NewHireOnboard' started", color: 'text-green-600' },
    { time: '10:23:45.023', level: 'DEBUG', message: 'Trigger payload: {userId: "123"}', color: 'text-blue-600' },
    { time: '10:23:45.045', level: 'INFO', message: 'Validation passed', color: 'text-green-600' },
    { time: '10:23:46.001', level: 'DEBUG', message: 'HTTP GET https://api.example.com/user/123', color: 'text-blue-600' },
    { time: '10:23:47.203', level: 'WARN', message: 'Response time > 1s (1.2s)', color: 'text-yellow-600' },
  ];

  const executionTrace = [
    { step: 1, status: 'complete', label: 'Trigger: Webhook Received' },
    { step: 2, status: 'complete', label: 'Parse Input Data' },
    { step: 3, status: 'complete', label: 'Validate Payload' },
    { step: 4, status: 'running', label: 'HTTP Request' },
    { step: 5, status: 'pending', label: 'Condition Check' },
    { step: 6, status: 'pending', label: 'Create Extension' },
    { step: 7, status: 'pending', label: 'Send Notification' },
  ];

  return (
    <div className="bg-white border-t-2 border-orange-300 flex flex-col" style={{ height: '320px' }}>
      {/* Debug Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors text-green-600">
          <Play className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600">
          <Pause className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600">
          <SkipForward className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600">
          <StepForward className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors text-red-600">
          <Square className="w-4 h-4" />
        </button>
        <button className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600">
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <div className="h-4 w-px bg-gray-300 mx-2"></div>
        
        <span className="text-gray-700">🔴 Breakpoints (3)</span>
        
        <div className="flex-1"></div>
        
        <select className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-700">
          <option>🎭 Live Mode</option>
          <option>🎭 Mock Data</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Execution Trace */}
        <div className="w-64 border-r border-gray-200 overflow-y-auto">
          <div className="p-3 bg-gray-50 border-b border-gray-200 text-gray-900">
            📜 Execution Trace
          </div>
          <div className="p-3 space-y-2">
            {executionTrace.map((item) => (
              <div
                key={item.step}
                className={`flex items-start gap-2 p-2 rounded ${
                  item.status === 'running' ? 'bg-blue-50 border border-blue-200' :
                  item.status === 'complete' ? 'bg-green-50 border border-green-200' :
                  'bg-gray-50 border border-gray-200'
                }`}
              >
                <span className={`mt-0.5 ${
                  item.status === 'running' ? 'text-blue-600' :
                  item.status === 'complete' ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  {item.status === 'complete' ? '✅' : item.status === 'running' ? '▶️' : '⏳'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-gray-900">{item.step}. {item.label}</div>
                </div>
              </div>
            ))}
            <div className="text-gray-500 mt-4">⏱️ Elapsed: 2.4s</div>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <button className="px-4 py-2 border-b-2 border-blue-500 text-blue-600">
              📋 Logs
            </button>
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              📊 Variables
            </button>
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              🔍 Trace
            </button>
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
              ❌ Errors
            </button>
          </div>

          {/* Tab Content - Logs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Log Controls */}
            <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-700">
                <option>All Levels</option>
                <option>INFO</option>
                <option>DEBUG</option>
                <option>WARN</option>
                <option>ERROR</option>
              </select>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <Trash2 className="w-4 h-4 text-gray-600" />
              </button>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Log Entries */}
            <div className="flex-1 overflow-y-auto bg-gray-900 p-3 font-mono">
              {logs.map((log, idx) => (
                <div key={idx} className={`${log.color} mb-1`}>
                  <span className="text-gray-500">[{log.time}]</span>{' '}
                  <span className="font-medium">{log.level}</span>{' '}
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Mock Data */}
        <div className="w-80 border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-200 text-gray-900">
            🎭 Test Payload
          </div>
          <div className="flex-1 p-3 overflow-y-auto">
            <textarea
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue={`{
  "userId": "123",
  "department": "Sales",
  "startDate": "2024-01-15"
}`}
            />
            <div className="mt-3 space-y-2">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <span>📚 Load Template</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <span>💉 Inject & Run</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
