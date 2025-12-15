import { useState } from 'react';
import { Plus, Settings, Phone, Brain, BookOpen, MessageSquare, Plug, Play, Save, Trash2, Edit, Copy } from 'lucide-react';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  voice: string;
  language: string;
  model: string;
  lastUpdated: string;
}

type TabType = 'general' | 'voice' | 'model' | 'knowledge' | 'conversation' | 'integrations';

export function AIAgentPage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>('agent-1');
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [showAgentList, setShowAgentList] = useState(true);

  const [agents] = useState<AIAgent[]>([
    {
      id: 'agent-1',
      name: 'Main Support Agent',
      description: 'Primary customer support AI agent',
      status: 'active',
      voice: 'en-US-Neural2-F',
      language: 'English (US)',
      model: 'GPT-4',
      lastUpdated: '2024-12-03'
    },
    {
      id: 'agent-2',
      name: 'Sales Assistant',
      description: 'AI agent for sales inquiries',
      status: 'active',
      voice: 'en-US-Neural2-J',
      language: 'English (US)',
      model: 'GPT-4',
      lastUpdated: '2024-12-02'
    },
    {
      id: 'agent-3',
      name: 'After Hours Agent',
      description: 'Handles calls outside business hours',
      status: 'inactive',
      voice: 'en-US-Neural2-F',
      language: 'English (US)',
      model: 'GPT-3.5 Turbo',
      lastUpdated: '2024-11-30'
    }
  ]);

  const [config, setConfig] = useState({
    // General
    name: 'Main Support Agent',
    description: 'Primary customer support AI agent',
    status: 'active',
    
    // Voice
    voice: 'en-US-Neural2-F',
    language: 'en-US',
    speechRate: '1.0',
    pitch: '0',
    
    // Model
    provider: 'OpenAI',
    model: 'gpt-4',
    temperature: '0.7',
    maxTokens: '500',
    systemPrompt: 'You are a helpful customer support agent for a telecommunications company. Be professional, friendly, and concise in your responses.',
    
    // Knowledge Base
    knowledgeSource: 'url',
    knowledgeUrl: '',
    
    // Conversation
    greeting: 'Hello! I\'m your AI assistant. How can I help you today?',
    fallbackMessage: 'I\'m sorry, I didn\'t quite understand that. Could you please rephrase?',
    endCallMessage: 'Thank you for calling. Have a great day!',
    maxConversationLength: '10',
    enableSentiment: true,
    
    // Integrations
    transferEnabled: true,
    transferNumber: '',
    webhookUrl: '',
    crmIntegration: 'none'
  });

  const tabs = [
    { id: 'general' as TabType, icon: Settings, label: 'General' },
    { id: 'voice' as TabType, icon: Phone, label: 'Voice Settings' },
    { id: 'model' as TabType, icon: Brain, label: 'AI Model' },
    { id: 'knowledge' as TabType, icon: BookOpen, label: 'Knowledge Base' },
    { id: 'conversation' as TabType, icon: MessageSquare, label: 'Conversation' },
    { id: 'integrations' as TabType, icon: Plug, label: 'Integrations' },
  ];

  const currentAgent = agents.find(a => a.id === selectedAgent);

  return (
    <div className="flex h-full">
      {/* Agent List Sidebar */}
      {showAgentList && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2>AI Agents</h2>
              <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                New Agent
              </button>
            </div>
            <input
              type="text"
              placeholder="Search agents..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAgent === agent.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{agent.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        agent.status === 'active' 
                          ? 'bg-green-100 text-green-700'
                          : agent.status === 'inactive'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{agent.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{agent.model}</span>
                  <span>{agent.lastUpdated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-gray-900 mb-2">{currentAgent?.name}</h1>
              <p className="text-gray-600">{currentAgent?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Play className="w-4 h-4" />
                Test Agent
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-4">General Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Agent Name</label>
                      <input
                        type="text"
                        value={config.name}
                        onChange={(e) => setConfig({...config, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Description</label>
                      <textarea
                        value={config.description}
                        onChange={(e) => setConfig({...config, description: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Status</label>
                      <select
                        value={config.status}
                        onChange={(e) => setConfig({...config, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Settings */}
            {activeTab === 'voice' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-4">Voice Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Voice</label>
                      <select
                        value={config.voice}
                        onChange={(e) => setConfig({...config, voice: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <optgroup label="English (US) - Female">
                          <option value="en-US-Neural2-F">en-US-Neural2-F (Standard Female)</option>
                          <option value="en-US-Neural2-C">en-US-Neural2-C (Professional Female)</option>
                          <option value="en-US-Neural2-E">en-US-Neural2-E (Warm Female)</option>
                        </optgroup>
                        <optgroup label="English (US) - Male">
                          <option value="en-US-Neural2-J">en-US-Neural2-J (Standard Male)</option>
                          <option value="en-US-Neural2-D">en-US-Neural2-D (Professional Male)</option>
                          <option value="en-US-Neural2-A">en-US-Neural2-A (Warm Male)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Language</label>
                      <select
                        value={config.language}
                        onChange={(e) => setConfig({...config, language: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="en-US">English (United States)</option>
                        <option value="en-GB">English (United Kingdom)</option>
                        <option value="es-ES">Spanish (Spain)</option>
                        <option value="es-MX">Spanish (Mexico)</option>
                        <option value="fr-FR">French (France)</option>
                        <option value="de-DE">German (Germany)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Speech Rate: {config.speechRate}x
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={config.speechRate}
                        onChange={(e) => setConfig({...config, speechRate: e.target.value})}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Slower</span>
                        <span>Normal</span>
                        <span>Faster</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Pitch: {config.pitch > '0' ? '+' : ''}{config.pitch}
                      </label>
                      <input
                        type="range"
                        min="-20"
                        max="20"
                        step="1"
                        value={config.pitch}
                        onChange={(e) => setConfig({...config, pitch: e.target.value})}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Lower</span>
                        <span>Normal</span>
                        <span>Higher</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Play className="w-4 h-4" />
                        Preview Voice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Model Settings */}
            {activeTab === 'model' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-4">AI Model Configuration</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Provider</label>
                      <select
                        value={config.provider}
                        onChange={(e) => setConfig({...config, provider: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="OpenAI">OpenAI</option>
                        <option value="Anthropic">Anthropic (Claude)</option>
                        <option value="Google">Google (Gemini)</option>
                        <option value="Azure">Azure OpenAI</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Model</label>
                      <select
                        value={config.model}
                        onChange={(e) => setConfig({...config, model: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {config.provider === 'OpenAI' && (
                          <>
                            <option value="gpt-4">GPT-4</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                          </>
                        )}
                        {config.provider === 'Anthropic' && (
                          <>
                            <option value="claude-3-opus">Claude 3 Opus</option>
                            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                            <option value="claude-3-haiku">Claude 3 Haiku</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">
                        Temperature: {config.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={config.temperature}
                        onChange={(e) => setConfig({...config, temperature: e.target.value})}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Focused</span>
                        <span>Balanced</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Max Tokens per Response</label>
                      <input
                        type="number"
                        value={config.maxTokens}
                        onChange={(e) => setConfig({...config, maxTokens: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Recommended: 300-800 for conversations</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">System Prompt</label>
                      <textarea
                        value={config.systemPrompt}
                        onChange={(e) => setConfig({...config, systemPrompt: e.target.value})}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                        placeholder="Define the AI agent's personality, role, and behavior..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This prompt defines how the AI agent behaves and responds to callers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Base */}
            {activeTab === 'knowledge' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-4">Knowledge Base</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Knowledge Source</label>
                      <select
                        value={config.knowledgeSource}
                        onChange={(e) => setConfig({...config, knowledgeSource: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="none">None</option>
                        <option value="url">Website URL</option>
                        <option value="file">Upload Files</option>
                        <option value="database">Database</option>
                        <option value="api">API Endpoint</option>
                      </select>
                    </div>

                    {config.knowledgeSource === 'url' && (
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">Website URL</label>
                        <input
                          type="url"
                          value={config.knowledgeUrl}
                          onChange={(e) => setConfig({...config, knowledgeUrl: e.target.value})}
                          placeholder="https://example.com/knowledge-base"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          The AI will crawl and learn from this website
                        </p>
                      </div>
                    )}

                    {config.knowledgeSource === 'file' && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
                        <p className="text-xs text-gray-500">Supports PDF, DOCX, TXT, CSV</p>
                        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Choose Files
                        </button>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm text-blue-900 mb-2">Current Knowledge Base</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Company FAQ (250 entries)</li>
                        <li>• Product Documentation (1,500 pages)</li>
                        <li>• Support Articles (420 articles)</li>
                      </ul>
                      <button className="mt-3 text-sm text-blue-600 hover:text-blue-700">
                        Manage Knowledge Base →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Settings */}
            {activeTab === 'conversation' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-4">Conversation Flow</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Greeting Message</label>
                      <textarea
                        value={config.greeting}
                        onChange={(e) => setConfig({...config, greeting: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">First message when caller connects</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Fallback Message</label>
                      <textarea
                        value={config.fallbackMessage}
                        onChange={(e) => setConfig({...config, fallbackMessage: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Used when AI doesn't understand the caller</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">End Call Message</label>
                      <textarea
                        value={config.endCallMessage}
                        onChange={(e) => setConfig({...config, endCallMessage: e.target.value})}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Message before ending the call</p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Max Conversation Turns</label>
                      <input
                        type="number"
                        value={config.maxConversationLength}
                        onChange={(e) => setConfig({...config, maxConversationLength: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Maximum back-and-forth exchanges before transfer</p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-900">Enable Sentiment Analysis</div>
                        <div className="text-xs text-gray-500">Detect caller emotions and adjust responses</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.enableSentiment}
                          onChange={(e) => setConfig({...config, enableSentiment: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations */}
            {activeTab === 'integrations' && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <div>
                  <h3 className="text-gray-900 mb-4">Integrations</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm text-gray-900">Enable Call Transfer</div>
                        <div className="text-xs text-gray-500">Allow AI to transfer calls to human agents</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.transferEnabled}
                          onChange={(e) => setConfig({...config, transferEnabled: e.target.checked})}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {config.transferEnabled && (
                      <div>
                        <label className="block text-sm text-gray-700 mb-2">Transfer Number</label>
                        <input
                          type="tel"
                          value={config.transferNumber}
                          onChange={(e) => setConfig({...config, transferNumber: e.target.value})}
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">Webhook URL</label>
                      <input
                        type="url"
                        value={config.webhookUrl}
                        onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                        placeholder="https://api.example.com/webhook"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Receive real-time call events and transcripts
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2">CRM Integration</label>
                      <select
                        value={config.crmIntegration}
                        onChange={(e) => setConfig({...config, crmIntegration: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="none">None</option>
                        <option value="salesforce">Salesforce</option>
                        <option value="hubspot">HubSpot</option>
                        <option value="zendesk">Zendesk</option>
                        <option value="custom">Custom CRM</option>
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm text-blue-900 mb-2">Active Integrations</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-800">Octopus ITSM</span>
                          <span className="text-green-600">Connected</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-800">Zabbix Monitoring</span>
                          <span className="text-green-600">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
