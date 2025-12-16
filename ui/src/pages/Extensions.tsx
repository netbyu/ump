import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Search, Phone, Trash2, Edit } from 'lucide-react';
import { extensionsApi } from '../lib/api';
import clsx from 'clsx';

interface ExtensionForm {
  id: string;
  displayName: string;
  password: string;
  email?: string;
  department?: string;
  voicemailEnabled: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    online: 'bg-green-100 text-green-800',
    NOT_INUSE: 'bg-green-100 text-green-800',
    INUSE: 'bg-yellow-100 text-yellow-800',
    RINGING: 'bg-blue-100 text-blue-800',
    offline: 'bg-gray-100 text-gray-800',
    unknown: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    NOT_INUSE: 'Available',
    INUSE: 'In Use',
    RINGING: 'Ringing',
    online: 'Online',
    offline: 'Offline',
    unknown: 'Unknown',
  };

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
        statusStyles[status] || statusStyles.unknown
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}

export function ExtensionsPage() {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['extensions', search],
    queryFn: () => extensionsApi.list({ search }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: ExtensionForm) => extensionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extensions'] });
      setShowCreateModal(false);
      toast.success('Extension created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create extension');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => extensionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extensions'] });
      toast.success('Extension deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete extension');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtensionForm>({
    defaultValues: { voicemailEnabled: true },
  });

  const onSubmit = (data: ExtensionForm) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: string) => {
    if (confirm(`Delete extension ${id}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Extensions</h1>
        <button
          onClick={() => {
            reset();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Extension
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search extensions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Extensions Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Extension
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No extensions found
                </td>
              </tr>
            ) : (
              data?.data?.map((ext: any) => (
                <tr key={ext.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <Phone className="mr-2 h-5 w-5 text-gray-400" />
                      <Link
                        to={`/extensions/${ext.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {ext.id}
                      </Link>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                    {ext.displayName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {ext.department || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={ext.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      to={`/extensions/${ext.id}`}
                      className="mr-3 text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="inline h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(ext.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="inline h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Create Extension</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Extension Number
                </label>
                <input
                  {...register('id', {
                    required: 'Required',
                    pattern: {
                      value: /^\d{3,6}$/,
                      message: 'Must be 3-6 digits',
                    },
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="101"
                />
                {errors.id && (
                  <p className="mt-1 text-sm text-red-600">{errors.id.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  {...register('displayName', { required: 'Required' })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="John Doe"
                />
                {errors.displayName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.displayName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SIP Password
                </label>
                <input
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 6, message: 'Min 6 characters' },
                  })}
                  type="password"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email (optional)
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department (optional)
                </label>
                <input
                  {...register('department')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex items-center">
                <input
                  {...register('voicemailEnabled')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Enable Voicemail
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
