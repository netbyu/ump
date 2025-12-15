import { FlowNode } from '../pages/FlowBuilder';
import { Play, Circle } from 'lucide-react';

interface FlowPropertiesPanelProps {
  selectedNode: FlowNode | null;
  onUpdateNode: (node: FlowNode) => void;
  debugMode: boolean;
}

export function FlowPropertiesPanel({ selectedNode, onUpdateNode, debugMode }: FlowPropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="text-gray-500 text-center mt-8">
          Select a node to view properties
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button className={`flex-1 px-4 py-3 border-b-2 ${!debugMode ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600'}`}>
            📋 Properties
          </button>
          <button className={`flex-1 px-4 py-3 border-b-2 ${debugMode ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-600'}`}>
            🐛 Debug
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!debugMode ? (
          /* Properties Tab */
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">🏷️ Type</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                {selectedNode.type}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">📛 Name</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => onUpdateNode({ ...selectedNode, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedNode.type === 'http' && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2">📡 Method</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>GET</option>
                    <option>POST</option>
                    <option>PUT</option>
                    <option>DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">🔗 URL</label>
                  <input
                    type="text"
                    placeholder="https://api.example.com/user/{{userId}}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">⏱️ Timeout (seconds)</label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">🔄 Retry Attempts</label>
                  <input
                    type="number"
                    defaultValue={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">📤 Output Variable</label>
                  <input
                    type="text"
                    placeholder="userData"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {selectedNode.type === 'provision' && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2">📞 Extension Range</label>
                  <input
                    type="text"
                    placeholder="3xxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">📋 Template</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Sales Standard</option>
                    <option>Support Agent</option>
                    <option>Executive</option>
                  </select>
                </div>
              </>
            )}

            {selectedNode.type === 'condition' && (
              <>
                <div>
                  <label className="block text-gray-700 mb-2">❓ Condition Expression</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="department === 'Sales'"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          /* Debug Tab */
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Circle className="w-3 h-3 fill-current" />
                <span className="font-medium">🟢 Execution Status</span>
              </div>
              <div className="text-green-600">Completed Successfully</div>
            </div>

            <div>
              <div className="text-gray-900 mb-2">▶️ Current Step</div>
              <div className="text-gray-600">Step 3/7</div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-gray-900 mb-3">📊 Variables</div>
              <div className="space-y-2 font-mono">
                <div className="text-gray-700">
                  <span className="text-blue-600">userId:</span> "123"
                </div>
                <div className="text-gray-700">
                  <span className="text-blue-600">dept:</span> "Sales"
                </div>
                <div className="text-gray-700">
                  <span className="text-blue-600">userData:</span> {'{...}'}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-gray-900 mb-2">📥 Input Data</div>
              <pre className="text-gray-600 overflow-x-auto">
{`{
  "userId": "123",
  "dept": "Sales"
}`}
              </pre>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-gray-900 mb-2">📤 Output Data</div>
              <pre className="text-gray-600 overflow-x-auto">
{`{
  "success": true,
  "extension": "3042"
}`}
              </pre>
            </div>

            <div>
              <div className="text-gray-900 mb-2">⏱️ Timing</div>
              <div className="text-gray-600">
                Started: 10:23:46<br />
                Duration: 1.2s
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
