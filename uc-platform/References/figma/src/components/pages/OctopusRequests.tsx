import { useState } from 'react';
import { Play, Terminal, FileText, CheckCircle, Copy, ExternalLink, RefreshCw, Clock, Zap, ArrowLeft, Filter, X } from 'lucide-react';

type RequestStatus = 'open' | 'in-progress' | 'pending-execution' | 'resolved' | 'closed';
type ScriptStatus = 'idle' | 'running' | 'success' | 'error';
type TicketGroup = 'incidents' | 'service-requests' | 'problems' | null;

interface OctopusRequestsProps {
  selectedGroup?: TicketGroup;
}

interface OctopusTicket {
  id: string;
  ticketNumber: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  assignedTo: string;
  created: string;
  updated: string;
  description: string;
  affectedService?: string;
  type: 'provision' | 'move' | 'change' | 'delete';
  group: 'incidents' | 'service-requests' | 'problems';
  requestor: string;
}

interface AutomationScript {
  id: string;
  name: string;
  description: string;
  category: 'diagnostic' | 'provisioning' | 'validation' | 'cleanup';
  estimatedTime: string;
}

const tickets: OctopusTicket[] = [
  {
    id: '1',
    ticketNumber: 'OCT-45832',
    title: 'Provision new extension for John Smith - Sales',
    status: 'pending-execution',
    priority: 'high',
    requestor: 'Jane Manager',
    assignedTo: 'You',
    created: '2024-01-15 10:30',
    updated: '2024-01-15 14:22',
    description: 'New hire in Sales department needs extension with DID, voicemail, and queue assignment.',
    type: 'provision',
    group: 'service-requests',
  },
  {
    id: '2',
    ticketNumber: 'OCT-45821',
    title: 'Move extension 3042 to new location - Floor 3',
    status: 'in-progress',
    priority: 'medium',
    requestor: 'IT Helpdesk',
    assignedTo: 'You',
    created: '2024-01-15 09:15',
    updated: '2024-01-15 13:45',
    description: 'User relocated to new desk. Update extension location and E911 address.',
    type: 'move',
    group: 'service-requests',
  },
  {
    id: '3',
    ticketNumber: 'OCT-45798',
    title: 'Update caller ID for Sales queue',
    status: 'open',
    priority: 'low',
    requestor: 'Sales Manager',
    assignedTo: 'You',
    created: '2024-01-14 16:20',
    updated: '2024-01-15 08:12',
    description: 'Change outbound caller ID for Sales queue to new main number.',
    type: 'change',
    group: 'service-requests',
  },
  {
    id: '4',
    ticketNumber: 'INC-45901',
    title: 'Choppy voice quality on phone',
    priority: 'critical',
    status: 'open',
    assignedTo: 'You',
    created: '2024-01-15 14:23',
    updated: '2024-01-15 14:23',
    description: 'Dave Gauthier reports choppy voice on his phone. States he needs it fixed ASAP because he is a very important person. No additional details provided.',
    affectedService: undefined,
    type: 'change',
    group: 'incidents',
    requestor: 'Dave Gauthier',
  },
  {
    id: '5',
    ticketNumber: 'INC-45889',
    title: 'Voicemail system intermittent failures',
    priority: 'high',
    status: 'open',
    assignedTo: 'You',
    created: '2024-01-15 12:45',
    updated: '2024-01-15 12:45',
    description: 'Users unable to access voicemail randomly',
    affectedService: 'Voicemail Platform',
    type: 'provision',
    group: 'incidents',
    requestor: 'Support Team',
  },
  {
    id: '6',
    ticketNumber: 'PRB-45899',
    title: 'Recurring registration failures for Polycom devices',
    priority: 'high',
    status: 'open',
    assignedTo: 'Engineering Team',
    created: '2024-01-14 16:40',
    updated: '2024-01-14 16:40',
    description: 'Pattern identified: Polycom VVX series losing registration every 4 hours',
    affectedService: 'SIP Registrar',
    type: 'provision',
    group: 'problems',
    requestor: 'Network Team',
  },
];

const automationScripts: AutomationScript[] = [
  {
    id: 'diag-1',
    name: 'Find User',
    description: 'Search for user in Avaya system',
    category: 'diagnostic',
    estimatedTime: '5s',
  },
  {
    id: 'diag-debug',
    name: 'Debug Phone',
    description: 'Run comprehensive phone diagnostics and network analysis',
    category: 'diagnostic',
    estimatedTime: '30s',
  },
  {
    id: 'diag-2',
    name: 'Check DID Availability',
    description: 'Verify if a DID is available for assignment',
    category: 'diagnostic',
    estimatedTime: '3s',
  },
  {
    id: 'diag-3',
    name: 'Validate Queue Assignment',
    description: 'Check if user can be added to specified queue',
    category: 'validation',
    estimatedTime: '4s',
  },
  {
    id: 'prov-1',
    name: 'Provision New Extension',
    description: 'Create new extension with standard template',
    category: 'provisioning',
    estimatedTime: '15s',
  },
  {
    id: 'prov-2',
    name: 'Assign DID to Extension',
    description: 'Associate a DID with an extension',
    category: 'provisioning',
    estimatedTime: '8s',
  },
  {
    id: 'prov-3',
    name: 'Enable Voicemail',
    description: 'Activate voicemail for extension',
    category: 'provisioning',
    estimatedTime: '10s',
  },
  {
    id: 'prov-4',
    name: 'Add to Queue',
    description: 'Add extension to call queue',
    category: 'provisioning',
    estimatedTime: '6s',
  },
  {
    id: 'val-1',
    name: 'Test Extension Calling',
    description: 'Verify extension can make/receive calls',
    category: 'validation',
    estimatedTime: '12s',
  },
  {
    id: 'val-2',
    name: 'Verify Voicemail Setup',
    description: 'Confirm voicemail is properly configured',
    category: 'validation',
    estimatedTime: '7s',
  },
];

export function OctopusRequests({ selectedGroup }: OctopusRequestsProps) {
  const [selectedTicket, setSelectedTicket] = useState<string | null>('1');
  const [executingScript, setExecutingScript] = useState<string | null>(null);
  const [scriptResults, setScriptResults] = useState<Record<string, { status: ScriptStatus; output: string; timestamp: string }>>({});
  const [scriptFilter, setScriptFilter] = useState<'all' | 'diagnostic' | 'provisioning' | 'validation' | 'cleanup'>('all');
  const [activeGroup, setActiveGroup] = useState<TicketGroup>(selectedGroup || null);

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);

  const statusColors = {
    open: 'bg-blue-100 text-blue-700 border-blue-300',
    'in-progress': 'bg-purple-100 text-purple-700 border-purple-300',
    'pending-execution': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    resolved: 'bg-green-100 text-green-700 border-green-300',
    closed: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  const priorityColors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white',
  };

  const categoryIcons = {
    diagnostic: '🔍',
    provisioning: '⚙️',
    validation: '✅',
    cleanup: '🧹',
  };

  const groupLabels: Record<Exclude<TicketGroup, null>, { label: string; icon: string }> = {
    'incidents': { label: 'Incidents', icon: '🚨' },
    'service-requests': { label: 'Service Requests', icon: '📋' },
    'problems': { label: 'Problems', icon: '⚙️' },
  };

  // Filter tickets by active group
  const filteredTickets = activeGroup 
    ? tickets.filter(t => t.group === activeGroup)
    : tickets;

  const executeScript = (scriptId: string) => {
    setExecutingScript(scriptId);
    
    // Simulate script execution
    setTimeout(() => {
      const script = automationScripts.find(s => s.id === scriptId);
      const mockOutputs: Record<string, string> = {
        'diag-1': `User Search Results - Found in Avaya
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PERSONAL INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Given Name:           Dave
Surname:              Gauthier
Middle Name:          -
Display Name:         -
User Name:            gauda1

EMPLOYMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Employee #:           EMP104083
Department:           -
Organization:         -
Email:                Dave.Gauthier@ssss.gouv.qc.ca

PHONE SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Extension:            600310
Phone Model:          J179CC
Port:                 S000016
Display Language:     french
CM Name:              CMDuplex1-auraprod

NETWORK SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primary SM:           10.222.204.14
Secondary SM:         10.213.255.74
COR:                  17
COS:                  3
Voicemail:            700000

PHONE BUTTONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Button 1:             call-appr
Button 2:             call-appr
Button 3:             call-appr
Button 4:             call-appr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status: ✓ User found in Avaya system`,
        'diag-debug': `Phone Debug Test Sequence - Extension 600310
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/4] Getting Phone Registrations...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Found 3 registration(s)

Registration #1
  Login:              gauda1@reg04.rtss.qc.ca
  Name:               Dave Gauthier
  Handle:             600310@auraprod.ciusssmcq.ca
  Active:             True
  Controller:         None
  Primary:            N/A
  IP Address:         10.220.6.69:1751
  Location:           CSSSVB STE GENEVIEVE
  User Agent:         IPPhone R15 15.0.6.3 0C110517FD74
  Reg Time:           N/A

Registration #2
  Login:              gauda1@reg04.rtss.qc.ca
  Name:               Dave Gauthier
  Handle:             600310@auraprod.ciusssmcq.ca
  Active:             False
  Controller:         None
  Primary:            N/A
  IP Address:         10.220.6.73:5060
  Location:           CSSSVB STE GENEVIEVE
  User Agent:         CISCO ATA 191
  Reg Time:           N/A

[2/4] Pinging Active Phone (10.220.6.69)...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PING 10.220.6.69 (10.220.6.69) 56(84) bytes of data.
64 bytes from 10.220.6.69: icmp_seq=1 ttl=64 time=1.23 ms
64 bytes from 10.220.6.69: icmp_seq=2 ttl=64 time=1.18 ms
64 bytes from 10.220.6.69: icmp_seq=3 ttl=64 time=1.21 ms
64 bytes from 10.220.6.69: icmp_seq=4 ttl=64 time=1.19 ms

--- 10.220.6.69 ping statistics ---
4 packets transmitted, 4 received, 0% packet loss
✓ Ping successful

[3/4] Finding Phone in NetDisco...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phone found on: ctr04-000595.reg04.rtss.qc.ca

Port Details:
  Port:                 GigabitEthernet1/0/25
  Description:          GigabitEthernet1/0/25
  Type:                 ethernetCsmacd
  Interface Index:      10125
  Last Change:          2025-06-27 13:33:26
  Name:                 local 105 prise 20
  Speed (configured):   auto
  Duplex (configured):  Full
  Port MAC:             00:8e:73:9c:0f:99
  MTU:                  1500
  Native VLAN:          432
  VLAN Membership:      40,432
  PoE Status:           deliveringPower
  PoE Power (mW):       2380
  Node MAC:             0c:11:05:17:fd:74
  Archived Node:        No
  Node IP:              10.220.6.69
  Spanning Tree:        Up
  Port Status:          Up

[4/4] Retrieving Port Config from Oxidized...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Switch: ctr04-000595.reg04.rtss.qc.ca
Interface: GigabitEthernet1/0/25

 interface GigabitEthernet1/0/25
  description local 105 prise 20
  switchport access vlan 432
  switchport mode access
  switchport voice vlan 40
  srr-queue bandwidth share 1 30 35 5
  priority-queue out 
  spanning-tree portfast edge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  ISSUE DETECTED: Missing QoS Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Expected QoS commands not found:
  • mls qos trust dscp
  • auto qos voip trust

Missing QoS configuration may cause choppy voice quality issues.
Recommendation: Apply standard voice port QoS template.`,
        'diag-2': `DID Availability Check:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DID Range: +1-555-0100 to +1-555-0199
Available DIDs: 23
Next Available: +1-555-0145
Status: ✓ Available for assignment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        'diag-3': `Queue Validation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Queue: Sales
Current Members: 12
Max Capacity: 25
Status: ✓ Can add member
Skill Requirements: None
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        'prov-1': `Extension Provisioning:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Extension 3156 created
✓ Applied template: Sales Standard
✓ Generated credentials
✓ Device profile configured
✓ E911 location set
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: SUCCESS`,
        'prov-2': `DID Assignment:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ DID +1-555-0145 assigned
✓ Routing rules updated
✓ Caller ID configured
✓ Inbound routing verified
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: SUCCESS`,
        'prov-3': `Voicemail Provisioning:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Voicemail box created
✓ PIN generated and emailed
✓ Greetings initialized
✓ Notification settings configured
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: SUCCESS`,
        'prov-4': `Queue Membership:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Added to Sales queue
✓ Ring strategy: Linear
✓ Priority: 5
✓ Skills validated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: SUCCESS`,
        'val-1': `Extension Call Testing:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Outbound call test: PASS
✓ Inbound call test: PASS
✓ Voicemail deposit: PASS
✓ Audio quality check: PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━���━━━━
Result: ALL TESTS PASSED`,
        'val-2': `Voicemail Verification:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Voicemail accessible
✓ Greetings playback: OK
✓ Message deposit: OK
✓ Email notification: OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: VERIFIED`,
      };

      setScriptResults(prev => ({
        ...prev,
        [scriptId]: {
          status: 'success',
          output: mockOutputs[scriptId] || `Script ${script?.name} executed successfully.\n\nOperation completed without errors.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
      setExecutingScript(null);
    }, 2000);
  };

  const filteredScripts = scriptFilter === 'all' 
    ? automationScripts 
    : automationScripts.filter(s => s.category === scriptFilter);

  return (
    <div className="h-full flex">
      {/* Ticket List */}
      <div className="w-96 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath fill='%236366f1' d='M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z'/%3E%3C/svg%3E" alt="Octopus" className="w-6 h-6" />
            <div className="text-white">Octopus ITSM</div>
          </div>

          {/* Group Filter Pills */}
          {activeGroup && (
            <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{groupLabels[activeGroup].icon}</span>
                  <span className="text-blue-200">{groupLabels[activeGroup].label}</span>
                </div>
                <button
                  onClick={() => setActiveGroup(null)}
                  className="p-1 hover:bg-blue-800/50 rounded transition-colors"
                  title="Clear filter"
                >
                  <X className="w-4 h-4 text-blue-400" />
                </button>
              </div>
              <div className="text-blue-300">{filteredTickets.length} tickets</div>
            </div>
          )}

          {/* Group Filter Buttons */}
          {!activeGroup && (
            <div className="mb-4 space-y-2">
              <div className="text-gray-400 mb-2">Filter by type:</div>
              {Object.entries(groupLabels).map(([key, { label, icon }]) => {
                const count = tickets.filter(t => t.group === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveGroup(key as Exclude<TicketGroup, null>)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-700 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span className="text-gray-300">{label}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-gray-600 text-gray-300 rounded">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button className="flex items-center gap-2 px-4 py-2 border border-gray-700 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors w-full justify-center text-gray-300">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh from Octopus</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredTickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedTicket === ticket.id
                  ? 'border-blue-500 bg-blue-900/30'
                  : 'border-gray-700 hover:border-gray-600 bg-gray-700/30'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded ${priorityColors[ticket.priority]}`}>
                    {ticket.priority.toUpperCase()}
                  </span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </div>
              <div className="text-blue-400 mb-1">{ticket.ticketNumber}</div>
              <div className="text-white mb-2">{ticket.title}</div>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 rounded border ${statusColors[ticket.status as RequestStatus]}`}>
                  {ticket.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              <div className="text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {ticket.updated}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Ticket Detail */}
        <div className="flex-1 overflow-y-auto p-8">
          {selectedTicketData ? (
            <div className="max-w-4xl space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <a 
                    href="#" 
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                  >
                    {selectedTicketData.ticketNumber}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <span className={`px-2 py-1 rounded ${priorityColors[selectedTicketData.priority]}`}>
                    {selectedTicketData.priority}
                  </span>
                  <span className={`px-3 py-1 rounded border ${statusColors[selectedTicketData.status as RequestStatus]}`}>
                    {selectedTicketData.status.replace('-', ' ')}
                  </span>
                </div>
                <div className="text-white">{selectedTicketData.title}</div>
              </div>

              {/* Ticket Info */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="text-white mb-4">📋 Ticket Information</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-400 mb-1">Requestor</div>
                    <div className="text-white">{selectedTicketData.requestor}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Assigned To</div>
                    <div className="text-white">{selectedTicketData.assignedTo}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Created</div>
                    <div className="text-white">{selectedTicketData.created}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Last Updated</div>
                    <div className="text-white">{selectedTicketData.updated}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-400 mb-1">Description</div>
                    <div className="text-white">{selectedTicketData.description}</div>
                  </div>
                </div>
              </div>

              {/* Script Execution Results */}
              {Object.keys(scriptResults).length > 0 && (
                <div className="bg-gray-800 rounded-lg border border-gray-700">
                  <div className="p-6 border-b border-gray-700">
                    <div className="text-white">📊 Execution History</div>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {Object.entries(scriptResults).map(([scriptId, result]) => {
                      const script = automationScripts.find(s => s.id === scriptId);
                      return (
                        <div key={scriptId} className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                result.status === 'success' ? 'bg-green-900/30' : 'bg-red-900/30'
                              }`}>
                                {result.status === 'success' ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  <span className="text-red-400">✗</span>
                                )}
                              </div>
                              <div>
                                <div className="text-white">{script?.name}</div>
                                <div className="text-gray-400">Executed at {result.timestamp}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => navigator.clipboard.writeText(result.output)}
                              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                              title="Copy output"
                            >
                              <Copy className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                          <pre className="bg-gray-950 text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm">
{result.output}
                          </pre>
                          {scriptId === 'diag-debug' ? (
                            <div className="mt-3 flex items-center gap-3">
                              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <FileText className="w-4 h-4" />
                                <span>Document to Ticket</span>
                              </button>
                              <button 
                                disabled
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
                                title="QoS fix automation coming soon"
                              >
                                <Zap className="w-4 h-4" />
                                <span>FIX</span>
                              </button>
                            </div>
                          ) : (
                            <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                              <FileText className="w-4 h-4" />
                              <span>Document to Octopus Ticket</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manual Notes */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="text-white mb-4">📝 Add Work Notes</div>
                <textarea
                  className="w-full px-4 py-3 border border-gray-700 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                  placeholder="Document your work, findings, or next steps..."
                />
                <button className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>Add Note to Ticket</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Select a ticket to view details</div>
            </div>
          )}
        </div>

        {/* Automation Scripts Sidebar */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-orange-500" />
              <div className="text-white">Automation Scripts</div>
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {(['all', 'diagnostic', 'provisioning', 'validation', 'cleanup'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setScriptFilter(category)}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    scriptFilter === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {category === 'all' ? '📋 All' : `${categoryIcons[category]} ${category}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredScripts.map((script) => {
              const isExecuting = executingScript === script.id;
              const hasResult = scriptResults[script.id];
              
              return (
                <div
                  key={script.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    hasResult 
                      ? 'border-green-700/50 bg-green-900/20' 
                      : 'border-gray-700 bg-gray-700/30 hover:border-blue-600'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-xl">{categoryIcons[script.category]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white mb-1">{script.name}</div>
                      <div className="text-gray-400">{script.description}</div>
                      <div className="text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{script.estimatedTime}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => executeScript(script.id)}
                    disabled={isExecuting}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isExecuting
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : hasResult
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isExecuting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Executing...</span>
                      </>
                    ) : (
                      <>
                        {hasResult ? <CheckCircle className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{hasResult ? 'Re-run' : 'Execute'}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-700 bg-gray-900/50">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-700 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors text-gray-300">
              <Terminal className="w-4 h-4" />
              <span>Open Debug Console</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}