import { IVRNode } from '../pages/IVRBuilder';
import { Volume2, Hash, MessageSquare, Users, Phone, PhoneForwarded, Voicemail, PhoneOff, Play } from 'lucide-react';

interface IVRCanvasProps {
  nodes: IVRNode[];
  selectedNode: IVRNode | null;
  onSelectNode: (node: IVRNode) => void;
}

const nodeIcons: Record<string, any> = {
  start: Play,
  announcement: Volume2,
  menu: Hash,
  tts: MessageSquare,
  queue: Users,
  extension: Phone,
  transfer: PhoneForwarded,
  voicemail: Voicemail,
  hangup: PhoneOff,
};

const nodeColors: Record<string, string> = {
  start: 'bg-green-100 border-green-300 text-green-700',
  announcement: 'bg-blue-100 border-blue-300 text-blue-700',
  menu: 'bg-purple-100 border-purple-300 text-purple-700',
  tts: 'bg-indigo-100 border-indigo-300 text-indigo-700',
  queue: 'bg-orange-100 border-orange-300 text-orange-700',
  extension: 'bg-cyan-100 border-cyan-300 text-cyan-700',
  transfer: 'bg-pink-100 border-pink-300 text-pink-700',
  voicemail: 'bg-yellow-100 border-yellow-300 text-yellow-700',
  hangup: 'bg-red-100 border-red-300 text-red-700',
};

export function IVRCanvas({ nodes, selectedNode, onSelectNode }: IVRCanvasProps) {
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
        {/* Connection from Start to Welcome */}
        <path
          d="M 430 85 L 430 150"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Connection from Welcome to Menu */}
        <path
          d="M 430 190 L 430 280"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Connection from Menu to Sales */}
        <path
          d="M 380 330 L 280 420"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Connection from Menu to Support */}
        <path
          d="M 480 330 L 580 420"
          stroke="#9ca3af"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        {/* Connection from Menu to Operator */}
        <path
          d="M 430 330 L 430 550"
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
      <div className="relative" style={{ minWidth: '1200px', minHeight: '800px', zIndex: 2 }}>
        {nodes.map((node) => {
          const Icon = nodeIcons[node.type];
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
              <div className={`px-4 py-3 rounded-lg border-2 ${nodeColors[node.type]} shadow-md hover:shadow-lg transition-shadow min-w-[140px]`}>
                <div className="flex items-center gap-2 mb-1">
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="font-medium">{node.label}</span>
                </div>
                {node.data?.text && (
                  <div className="text-xs opacity-75 mt-1 truncate max-w-[120px]">
                    {node.data.text}
                  </div>
                )}
                {node.data?.options && (
                  <div className="text-xs opacity-75 mt-1">
                    {node.data.options.length} options
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
