import { FlowNode } from '../pages/FlowBuilder';
import { Radio, GitBranch, Plus, Bell } from 'lucide-react';

interface FlowCanvasProps {
  nodes: FlowNode[];
  selectedNode: FlowNode | null;
  onSelectNode: (node: FlowNode) => void;
}

const nodeIcons: Record<string, any> = {
  trigger: Radio,
  condition: GitBranch,
  provision: Plus,
  notify: Bell,
};

const nodeColors: Record<string, string> = {
  trigger: 'bg-purple-100 border-purple-300 text-purple-700',
  condition: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  provision: 'bg-blue-100 border-blue-300 text-blue-700',
  notify: 'bg-green-100 border-green-300 text-green-700',
  action: 'bg-cyan-100 border-cyan-300 text-cyan-700',
  http: 'bg-orange-100 border-orange-300 text-orange-700',
  wait: 'bg-gray-100 border-gray-300 text-gray-700',
  approval: 'bg-pink-100 border-pink-300 text-pink-700',
};

export function FlowCanvas({ nodes, selectedNode, onSelectNode }: FlowCanvasProps) {
  return (
    <div className="flex-1 relative overflow-auto">
      {/* Grid Background */}
      <div 
        className="absolute inset-0" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Connections */}
      <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {/* Trigger to Condition */}
        <path
          d="M 430 85 L 430 170"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Condition to Sales */}
        <path
          d="M 370 210 L 280 290"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Condition to Support */}
        <path
          d="M 490 210 L 580 290"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Sales to Notify */}
        <path
          d="M 280 330 L 370 410"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Support to Notify */}
        <path
          d="M 580 330 L 490 410"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
          </marker>
        </defs>
      </svg>

      {/* Nodes */}
      <div className="relative" style={{ minWidth: '1200px', minHeight: '600px', zIndex: 2 }}>
        {nodes.map((node) => {
          const Icon = nodeIcons[node.type] || Radio;
          const isSelected = selectedNode?.id === node.id;
          
          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node)}
              className={`absolute cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className={`px-4 py-3 rounded-lg border-2 ${nodeColors[node.type] || nodeColors.action} shadow-md hover:shadow-lg transition-shadow min-w-[160px]`}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{node.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
