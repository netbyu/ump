"use client";

import { useState, useEffect } from 'react';
import { X, Save, Loader2, Trash2 } from 'lucide-react';
import { useUpdateIntegration, useDeleteIntegration, type Integration } from '@/hooks/use-integrations';

interface EditIntegrationModalProps {
  integration: Integration | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditIntegrationModal({ integration, isOpen, onClose }: EditIntegrationModalProps) {
  const [name, setName] = useState('');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = useUpdateIntegration();
  const deleteMutation = useDeleteIntegration();

  useEffect(() => {
    if (integration) {
      setName(integration.name);
      setEnabled(integration.enabled);
      // Initialize config based on integration type
      setConfig({});
    }
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!integration) return;

    updateMutation.mutate(
      {
        id: integration.id,
        data: { name, config, enabled },
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  if (!isOpen || !integration) return null;

  // Get config fields based on integration type
  const getConfigFields = () => {
    const category = integration.integration_type?.category;

    if (category === 'pbx') {
      return [
        { key: 'host', label: 'Host/IP Address', type: 'text', placeholder: '192.168.1.10' },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
        { key: 'version', label: 'Version', type: 'text', placeholder: '12.5' },
      ];
    } else if (category === 'itsm') {
      return [
        { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://company.service-now.com' },
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: '••••••••' },
        { key: 'instance', label: 'Instance Name', type: 'text', placeholder: 'company' },
      ];
    } else if (category === 'crm') {
      return [
        { key: 'instance_url', label: 'Instance URL', type: 'text', placeholder: 'https://company.salesforce.com' },
        { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'your-client-id' },
        { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
      ];
    } else if (category === 'hr') {
      return [
        { key: 'tenant_url', label: 'Tenant URL', type: 'text', placeholder: 'https://company.workday.com' },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'admin@company.com' },
        { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
      ];
    } else if (category === 'comm') {
      return [
        { key: 'workspace_url', label: 'Workspace URL', type: 'text', placeholder: 'company.slack.com' },
        { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-••••••••' },
        { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: 'company-tenant' },
      ];
    }

    return [
      { key: 'api_url', label: 'API URL', type: 'text', placeholder: 'https://api.example.com' },
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: '••••••••' },
    ];
  };

  const configFields = getConfigFields();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{integration.integration_type?.icon || "🔌"}</span>
            <div>
              <h2 className="text-xl font-semibold text-white">Edit Integration</h2>
              <p className="text-sm text-gray-400">{integration.integration_type?.name || "Integration"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
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
              <p className="text-xs text-gray-400 mt-1">
                A friendly name to identify this integration
              </p>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div>
                <div className="text-sm font-medium text-white">Enable Integration</div>
                <div className="text-xs text-gray-400 mt-1">
                  {enabled ? 'Integration is active and syncing' : 'Integration is paused'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    enabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
                ></div>
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <span className="text-sm text-gray-400">Current Status:</span>
              <span className={`px-3 py-1 rounded text-sm ${
                integration.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                integration.status === 'configuring' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                integration.status === 'inactive' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
              </span>
            </div>

            {/* Configuration Section */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
              <div className="space-y-4">
                {configFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={config[field.key] || ''}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
              <div>
                <div className="text-xs text-gray-400">Last Sync</div>
                <div className="text-sm text-white mt-1">
                  {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Records Synced</div>
                <div className="text-sm text-white mt-1">{(integration.recordsCount ?? 0).toLocaleString()}</div>
              </div>
              {(integration.errorCount ?? 0) > 0 && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-400">Errors</div>
                  <div className="text-sm text-red-400 mt-1">{integration.errorCount} errors detected</div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700 bg-gray-900">
          {!showDeleteConfirm ? (
            <>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-600 text-red-400 rounded-lg hover:bg-red-600/10 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Integration
              </button>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="text-yellow-400 flex items-center gap-2">
                <span>⚠️</span>
                <span>Are you sure you want to delete this integration?</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteMutation.mutate(integration.id, {
                      onSuccess: () => {
                        onClose();
                      },
                    });
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
