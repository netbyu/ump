import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Users, Trash2, Settings } from 'lucide-react';
import { queuesApi } from '../lib/api';

interface QueueForm {
  name: string;
  description?: string;
  strategy: string;
  timeout: number;
}

export function QueuesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: () => queuesApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: QueueForm) => queuesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      setShowCreateModal(false);
      toast.success('Queue created');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create queue');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => queuesApi.delete(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      toast.success('Queue deleted');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QueueForm>({
    defaultValues: { strategy: 'ringall', timeout: 15 },
  });

  const onSubmit = (data: QueueForm) => {
    createMutation.mutate(data);
  };

  const handleDelete = (name: string) => {
    if (confirm(`Delete queue ${name}?`)) {
      deleteMutation.mutate(name);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Queues</h1>
        <button
          onClick={() => {
            reset();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Queue
        </button>
      </div>

      {/* Queues Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full text-center text-gray-500">Loading...</div>
        ) : data?.data?.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">
            No queues configured
          </div>
        ) : (
          data?.data?.map((queue: any) => (
            <div
              key={queue.name}
              className="rounded-lg bg-white p-6 shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="mr-2 h-6 w-6 text-blue-600" />
                  <Link
                    to={`/queues/${queue.name}`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {queue.name}
                  </Link>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/queues/${queue.name}`}
                    className="text-gray-400 hover:text-blue-600"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(queue.name)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {queue.description && (
                <p className="mb-4 text-sm text-gray-500">{queue.description}</p>
              )}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Strategy</span>
                  <span className="font-medium">{queue.strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timeout</span>
                  <span className="font-medium">{queue.timeout}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Members</span>
                  <span className="font-medium">{queue.members?.length || 0}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Create Queue</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Queue Name
                </label>
                <input
                  {...register('name', {
                    required: 'Required',
                    pattern: {
                      value: /^[a-zA-Z0-9_-]+$/,
                      message: 'Only letters, numbers, - and _',
                    },
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="support"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  {...register('description')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Support Queue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ring Strategy
                </label>
                <select
                  {...register('strategy')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="ringall">Ring All</option>
                  <option value="leastrecent">Least Recent</option>
                  <option value="fewestcalls">Fewest Calls</option>
                  <option value="random">Random</option>
                  <option value="rrmemory">Round Robin (Memory)</option>
                  <option value="linear">Linear</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ring Timeout (seconds)
                </label>
                <input
                  {...register('timeout', { valueAsNumber: true })}
                  type="number"
                  min="5"
                  max="300"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
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
