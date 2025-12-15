import { useState } from 'react';
import { Save, Check, Bug, Play, Rocket, History, ZoomIn, ZoomOut, Undo, Redo } from 'lucide-react';
import { FlowNodePalette } from '../flow/FlowNodePalette';
import { FlowCanvas } from '../flow/FlowCanvas';
import { FlowPropertiesPanel } from '../flow/FlowPropertiesPanel';
import { DebugConsole } from '../flow/DebugConsole';

export type FlowNode = {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'http' | 'provision' | 'notify' | 'wait' | 'approval';
  label: string;
  x: number;
  y: number;
  data?: any;
};

export function FlowBuilder() {
  const [flowName, setFlowName] = useState('New Hire Onboarding');
  const [flowStatus, setFlowStatus] = useState<'active' | 'draft' | 'paused'>('draft');
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [nodes, setNodes] = useState<FlowNode[]>([
    { id: '1', type: 'trigger', label: 'HR New Hire Event', x: 400, y: 50 },
    { id: '2', type: 'condition', label: 'Department?', x: 400, y: 170 },
    { id: '3', type: 'provision', label: 'Create Extension (Sales)', x: 250, y: 290 },
    { id: '4', type: 'provision', label: 'Create Extension (Support)', x: 550, y: 290 },
    { id: '5', type: 'notify', label: 'Notify Manager', x: 400, y: 410 },
  ]);

  const statusColors = {
    active: 'bg-green-100 text-green-700 border-green-300',
    draft: 'bg-gray-100 text-gray-700 border-gray-300',
    paused: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 transition-colors"
            />
            <select
              value={flowStatus}
              onChange={(e) => setFlowStatus(e.target.value as any)}
              className={`px-3 py-1.5 rounded-lg border ${statusColors[flowStatus]}`}
            >
              <option value="draft">🟢 Draft</option>
              <option value="active">🟢 Active</option>
              <option value="paused">🟡 Paused</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Check className="w-4 h-4" />
              <span>Validate</span>
            </button>
            <button 
              onClick={() => setDebugOpen(!debugOpen)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                debugOpen 
                  ? 'bg-orange-100 text-orange-700 border-orange-300' 
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Bug className="w-4 h-4" />
              <span>Debug Mode</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Play className="w-4 h-4" />
              <span>Run Once</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Rocket className="w-4 h-4" />
              <span>Deploy</span>
            </button>
            <button className="p-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Builder Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <FlowNodePalette />

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
            <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <Undo className="w-4 h-4 text-gray-600" />
            </button>
            <button className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <Redo className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Canvas Area */}
          <FlowCanvas 
            nodes={nodes}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
        </div>

        {/* Properties Panel */}
        <FlowPropertiesPanel 
          selectedNode={selectedNode}
          onUpdateNode={(node) => {
            setNodes(nodes.map(n => n.id === node.id ? node : n));
            setSelectedNode(node);
          }}
          debugMode={debugOpen}
        />
      </div>

      {/* Debug Console */}
      {debugOpen && <DebugConsole />}
    </div>
  );
}
