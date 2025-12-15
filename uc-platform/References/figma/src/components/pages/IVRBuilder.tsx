import { useState } from 'react';
import { Save, Check, TestTube, Rocket, History, Settings, ZoomIn, ZoomOut, Grid, Magnet, Play, Plus } from 'lucide-react';
import { NodePalette } from '../ivr/NodePalette';
import { IVRCanvas } from '../ivr/IVRCanvas';
import { PropertiesPanel } from '../ivr/PropertiesPanel';
import { TTSModal } from '../ivr/TTSModal';

export type IVRNode = {
  id: string;
  type: 'start' | 'announcement' | 'menu' | 'tts' | 'queue' | 'extension' | 'transfer' | 'condition' | 'voicemail' | 'hangup';
  label: string;
  x: number;
  y: number;
  data?: any;
};

export function IVRBuilder() {
  const [ivrName, setIvrName] = useState('Sales IVR Flow');
  const [selectedNode, setSelectedNode] = useState<IVRNode | null>(null);
  const [showTTSModal, setShowTTSModal] = useState(false);
  const [nodes, setNodes] = useState<IVRNode[]>([
    { id: '1', type: 'start', label: 'Start', x: 400, y: 50 },
    { id: '2', type: 'tts', label: 'Welcome Message', x: 400, y: 150, data: { text: 'Welcome to our company' } },
    { id: '3', type: 'menu', label: 'Main Menu', x: 400, y: 280, data: { options: [
      { key: '1', label: 'Sales', target: '4' },
      { key: '2', label: 'Support', target: '5' },
      { key: '0', label: 'Operator', target: '6' }
    ]}},
    { id: '4', type: 'queue', label: 'Sales Queue', x: 250, y: 420 },
    { id: '5', type: 'queue', label: 'Support Queue', x: 550, y: 420 },
    { id: '6', type: 'extension', label: 'Operator Ext', x: 400, y: 550 },
  ]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              value={ivrName}
              onChange={(e) => setIvrName(e.target.value)}
              className="text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Check className="w-4 h-4" />
              <span>Validate</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <TestTube className="w-4 h-4" />
              <span>Test</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Rocket className="w-4 h-4" />
              <span>Publish</span>
            </button>
            <button className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <History className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Builder Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <NodePalette />

        {/* Canvas */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Canvas Controls */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-gray-700 min-w-[60px] text-center">100%</span>
              <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded transition-colors">
              <Grid className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">Grid</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded transition-colors">
              <Magnet className="w-4 h-4 text-gray-600" />
              <span className="text-gray-700">Snap</span>
            </button>
          </div>

          {/* Canvas Area */}
          <IVRCanvas 
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />

          {/* Minimap */}
          <div className="absolute bottom-4 right-80 w-48 h-32 bg-white border-2 border-gray-300 rounded-lg shadow-lg">
            <div className="w-full h-full bg-gray-100 p-2">
              <div className="text-gray-500 text-center">Minimap</div>
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <PropertiesPanel 
          selectedNode={selectedNode}
          onUpdateNode={(node) => {
            setNodes(nodes.map(n => n.id === node.id ? node : n));
            setSelectedNode(node);
          }}
          onOpenTTS={() => setShowTTSModal(true)}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6 text-gray-600">
          <span>💾 Last Saved: 2 min ago</span>
          <span>⚠️ 0 Errors | 1 Warning</span>
        </div>
        <div className="text-gray-600">
          🧩 {nodes.length} Nodes | 15 Connections
        </div>
      </div>

      {/* TTS Modal */}
      {showTTSModal && (
        <TTSModal onClose={() => setShowTTSModal(false)} />
      )}
    </div>
  );
}
