"use client";

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { useCreateIntegration, useIntegrationTypes } from '@/hooks/use-integrations';

interface AddIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddIntegrationModal({ isOpen, onClose }: AddIntegrationModalProps) {
  const [step, setStep] = useState<'select-type' | 'configure'>(  'select-type');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});

  const { data: typesData } = useIntegrationTypes();
  const createMutation = useCreateIntegration();

  const integrationTypes = typesData?.data || [];

  const filteredTypes = integrationTypes.filter((type: any) =>
    selectedCategory === 'all' || type.category === selectedCategory
  );

  const selectedType = integrationTypes.find((t: any) => t.id === selectedTypeId);

  const handleSelectType = (typeId: string) => {
    setSelectedTypeId(typeId);
    const type = integrationTypes.find((t: any) => t.id === typeId);
    if (type) {
      setName(`My ${type.name}`);
      setStep('configure');
    }
  };

  const handleCreate = () => {
    createMutation.mutate(
      {
        integration_type_id: selectedTypeId,
        name,
        config,
      },
      {
        onSuccess: () => {
          // Reset form
          setStep('select-type');
          setSelectedTypeId('');
          setName('');
          setConfig({});
          onClose();
        },
      }
    );
  };

  const getConfigFields = () => {
    if (!selectedType) return [];

    const category = selectedType.category;

    if (category === 'pbx') {
      return [
        { key: 'host', label: 'Host/IP Address', type: 'text', placeholder: '192.168.1.10', required: true },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'admin', required: true },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
        { key: 'version', label: 'Version', type: 'text', placeholder: '12.5', required: false },
      ];
    } else if (category === 'itsm') {
      return [
        { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://company.service-now.com', required: true },
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'your-api-key', required: true },
        { key: 'instance', label: 'Instance Name', type: 'text', placeholder: 'company', required: true },
      ];
    } else if (category === 'crm') {
      return [
        { key: 'instance_url', label: 'Instance URL', type: 'text', placeholder: 'https://company.salesforce.com', required: true },
        { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'your-client-id', required: true },
        { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'your-client-secret', required: true },
      ];
    } else if (category === 'hr') {
      return [
        { key: 'tenant_url', label: 'Tenant URL', type: 'text', placeholder: 'https://company.workday.com', required: true },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'admin@company.com', required: true },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••', required: true },
      ];
    } else if (category === 'comm') {
      return [
        { key: 'workspace_url', label: 'Workspace URL', type: 'text', placeholder: 'company.slack.com', required: false },
        { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-your-token', required: true },
        { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: 'company-tenant', required: false },
      ];
    }

    return [
      { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://api.example.com', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'your-api-key', required: true },
    ];
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Types', icon: '📋' },
    { id: 'itsm', label: 'ITSM', icon: '🎫' },
    { id: 'pbx', label: 'PBX', icon: '📞' },
    { id: 'crm', label: 'CRM', icon: '💼' },
    { id: 'hr', label: 'HR', icon: '👔' },
    { id: 'comm', label: 'Communication', icon: '💬' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            {step === 'select-type' ? 'Add New Integration' : `Configure ${selectedType?.name}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select-type' ? (
            <>
              {/* Category Filter */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-900 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* Integration Types Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTypes.map((type: any) => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className="bg-gray-900 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{type.icon}</span>
                      <div>
                        <div className="text-white font-semibold">{type.name}</div>
                        <div className="text-xs text-gray-400">{type.vendor}</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{type.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {type.supported_features.map((feature: string) => (
                        <span
                          key={feature}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {/* Integration Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Integration Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Integration"
                />
              </div>

              {/* Configuration Fields */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
                <div className="space-y-4">
                  {getConfigFields().map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      <input
                        type={field.type}
                        value={config[field.key] || ''}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        required={field.required}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-400">ℹ️</span>
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-1">Initial Status: Configuring</p>
                    <p className="text-blue-400/80">
                      The integration will be created in "configuring" status and disabled.
                      You can test and enable it after creation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900">
          {step === 'configure' && (
            <button
              onClick={() => setStep('select-type')}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back
            </button>
          )}
          <div className={`flex items-center gap-3 ${step === 'select-type' ? 'ml-auto' : ''}`}>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            {step === 'configure' && (
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || !name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Integration
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
