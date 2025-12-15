import { Play, Plus } from 'lucide-react';
import { IVRNode } from '../pages/IVRBuilder';

interface PropertiesPanelProps {
  selectedNode: IVRNode | null;
  onUpdateNode: (node: IVRNode) => void;
  onOpenTTS: () => void;
}

export function PropertiesPanel({ selectedNode, onUpdateNode, onOpenTTS }: PropertiesPanelProps) {
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
      <div className="p-6 border-b border-gray-200">
        <div className="text-gray-900 mb-4">📝 Node Properties</div>
        
        {/* Node Type */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">🏷️ Type</label>
          <div className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
            {selectedNode.type}
          </div>
        </div>

        {/* Node Label */}
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">📛 Label</label>
          <input
            type="text"
            value={selectedNode.label}
            onChange={(e) => onUpdateNode({ ...selectedNode, label: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* TTS Node Properties */}
        {selectedNode.type === 'tts' && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-gray-900 mb-3">🔊 Audio Settings</div>
              
              <div className="mb-3">
                <label className="block text-gray-700 mb-2">📁 Source</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Text-to-Speech</option>
                  <option>Upload Audio</option>
                  <option>Record</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-gray-700 mb-2">📝 TTS Text</label>
                <textarea
                  value={selectedNode.data?.text || ''}
                  onChange={(e) => onUpdateNode({ 
                    ...selectedNode, 
                    data: { ...selectedNode.data, text: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Enter announcement text..."
                />
              </div>

              <div className="mb-3">
                <label className="block text-gray-700 mb-2">🎭 Voice</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Polly - Joanna (Female)</option>
                  <option>Polly - Matthew (Male)</option>
                  <option>Polly - Ivy (Female)</option>
                </select>
              </div>

              <button 
                onClick={onOpenTTS}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        )}

        {/* Menu Node Properties */}
        {selectedNode.type === 'menu' && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
              <div className="text-gray-900 mb-3">🔢 Menu Options</div>
              
              <div className="space-y-2 mb-3">
                {selectedNode.data?.options?.map((opt: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded flex items-center justify-center">
                        {opt.key}
                      </span>
                      <span className="flex-1 text-gray-900">{opt.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Plus className="w-4 h-4" />
                <span>Add Option</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-gray-700 mb-2">⏱️ Timeout (seconds)</label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">🔄 Max Retries</label>
                <input
                  type="number"
                  defaultValue={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">❌ Invalid Input Action</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Re-prompt</option>
                  <option>Transfer to Operator</option>
                  <option>Disconnect</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Queue Node Properties */}
        {selectedNode.type === 'queue' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-700 mb-2">👥 Queue Name</label>
              <input
                type="text"
                defaultValue="Sales Queue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">⏱️ Max Wait Time (min)</label>
              <input
                type="number"
                defaultValue={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2">🎵 Hold Music</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Default Hold Music</option>
                <option>Jazz</option>
                <option>Classical</option>
                <option>Custom Upload</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
