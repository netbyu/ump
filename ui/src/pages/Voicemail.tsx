import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Voicemail as VoicemailIcon, Trash2, Edit, Mail } from 'lucide-react';
import { voicemailApi } from '../lib/api';

interface VoicemailForm {
  mailbox: string;
  fullname: string;
  email?: string;
  password?: string;
  attach: boolean;
}

export function VoicemailPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMailbox, setEditingMailbox] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['voicemail'],
    queryFn: () => voicemailApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: VoicemailForm) => voicemailApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voicemail'] });
      setShowCreateModal(false);
      reset();
      toast.success('Voicemail box created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create voicemail');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ mailbox, data }: { mailbox: string; data: any }) =>
      voicemailApi.update(mailbox, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voicemail'] });
      setEditingMailbox(null);
      toast.success('Voicemail box updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update voicemail');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (mailbox: string) => voicemailApi.delete(mailbox),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voicemail'] });
      toast.success('Voicemail box deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete voicemail');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VoicemailForm>({
    defaultValues: { attach: true },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
  } = useForm();

  const onSubmit = (data: VoicemailForm) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: any) => {
    updateMutation.mutate({ mailbox: editingMailbox.mailbox, data });
  };

  const handleDelete = (mailbox: string) => {
    if (confirm(`Delete voicemail box ${mailbox}?`)) {
      deleteMutation.mutate(mailbox);
    }
  };

  const handleEdit = (vm: any) => {
    setEditingMailbox(vm);
    resetEdit({
      fullname: vm.fullname,
      email: vm.email,
      attach: vm.attach === 'yes',
    });
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Voicemail</h1>
        <button
          onClick={() => {
            reset();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Voicemail Box
        </button>
      </div>

      {/* Voicemail Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Mailbox
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email Attach
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Max Messages
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data?.data?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No voicemail boxes configured
                </td>
              </tr>
            ) : (
              data?.data?.map((vm: any) => (
                <tr key={vm.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <VoicemailIcon className="mr-2 h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{vm.mailbox}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                    {vm.fullname || '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {vm.email ? (
                      <div className="flex items-center text-gray-600">
                        <Mail className="mr-1 h-4 w-4" />
                        {vm.email}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        vm.attach === 'yes'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {vm.attach === 'yes' ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {vm.maxmsg}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <button
                      onClick={() => handleEdit(vm)}
                      className="mr-3 text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="inline h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vm.mailbox)}
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
            <h2 className="mb-4 text-xl font-bold">Create Voicemail Box</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mailbox Number
                </label>
                <input
                  {...register('mailbox', {
                    required: 'Required',
                    pattern: {
                      value: /^\d{3,6}$/,
                      message: 'Must be 3-6 digits',
                    },
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="101"
                />
                {errors.mailbox && (
                  <p className="mt-1 text-sm text-red-600">{errors.mailbox.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  {...register('fullname', { required: 'Required' })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="John Doe"
                />
                {errors.fullname && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullname.message}</p>
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
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  PIN (optional, default: 1234)
                </label>
                <input
                  {...register('password')}
                  type="password"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="****"
                />
              </div>
              <div className="flex items-center">
                <input
                  {...register('attach')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Attach voicemail to email
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

      {/* Edit Modal */}
      {editingMailbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">
              Edit Voicemail Box {editingMailbox.mailbox}
            </h2>
            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  {...registerEdit('fullname')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  {...registerEdit('email')}
                  type="email"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New PIN (leave empty to keep current)
                </label>
                <input
                  {...registerEdit('password')}
                  type="password"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex items-center">
                <input
                  {...registerEdit('attach')}
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Attach voicemail to email
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingMailbox(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
