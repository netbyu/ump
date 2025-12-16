import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { systemApi } from '../lib/api';
import { useAuthStore } from '../stores/auth';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => systemApi.settings().then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, string>) => systemApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save settings');
    },
  });

  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

      <div className="space-y-6">
        {/* System Settings */}
        {user?.role === 'admin' && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">System Settings</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  {...register('company_name')}
                  defaultValue={settings?.company_name}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Context
                </label>
                <input
                  {...register('default_context')}
                  defaultValue={settings?.default_context}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Voicemail Context
                </label>
                <input
                  {...register('voicemail_context')}
                  defaultValue={settings?.voicemail_context}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User Info */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Your Account</h2>
          <div className="space-y-2">
            <p>
              <span className="text-gray-500">Username:</span>{' '}
              <span className="font-medium">{user?.username}</span>
            </p>
            <p>
              <span className="text-gray-500">Email:</span>{' '}
              <span className="font-medium">{user?.email || 'Not set'}</span>
            </p>
            <p>
              <span className="text-gray-500">Role:</span>{' '}
              <span className="font-medium capitalize">{user?.role}</span>
            </p>
          </div>
        </div>

        {/* About */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">About</h2>
          <p className="text-gray-600">
            Asterisk Management UI v1.0.0
            <br />
            Built with Node.js, React, and PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}
