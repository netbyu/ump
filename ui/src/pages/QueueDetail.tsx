import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus, UserMinus, Pause, Play } from 'lucide-react';
import { queuesApi, extensionsApi } from '../lib/api';
import { useState } from 'react';

export function QueueDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState('');

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue', name],
    queryFn: () => queuesApi.get(name!).then((r) => r.data),
    enabled: !!name,
  });

  const { data: extensions } = useQuery({
    queryKey: ['extensions-list'],
    queryFn: () => extensionsApi.list({ limit: 100 }).then((r) => r.data),
  });

  const addMemberMutation = useMutation({
    mutationFn: (extension: string) => queuesApi.addMember(name!, extension),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', name] });
      setShowAddMember(false);
      setSelectedExtension('');
      toast.success('Member added');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add member');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (extension: string) => queuesApi.removeMember(name!, extension),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', name] });
      toast.success('Member removed');
    },
  });

  const pauseMemberMutation = useMutation({
    mutationFn: ({ extension, paused }: { extension: string; paused: boolean }) =>
      queuesApi.pauseMember(name!, extension, paused),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', name] });
    },
  });

  const extractExtension = (interface_: string) => {
    // PJSIP/101 -> 101
    return interface_.replace(/^PJSIP\//, '');
  };

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  if (!queue) {
    return <div className="text-center">Queue not found</div>;
  }

  // Get available extensions (not already in queue)
  const memberExtensions = new Set(
    queue.members?.map((m: any) => extractExtension(m.interface)) || []
  );
  const availableExtensions =
    extensions?.data?.filter((e: any) => !memberExtensions.has(e.id)) || [];

  return (
    <div>
      <button
        onClick={() => navigate('/queues')}
        className="mb-6 inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Queues
      </button>

      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{queue.name}</h1>
          <button
            onClick={() => setShowAddMember(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </button>
        </div>

        {queue.description && (
          <p className="mb-6 text-gray-600">{queue.description}</p>
        )}

        {/* Queue Settings */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Strategy</p>
            <p className="text-lg font-semibold">{queue.strategy}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Timeout</p>
            <p className="text-lg font-semibold">{queue.timeout}s</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Wrapup Time</p>
            <p className="text-lg font-semibold">{queue.wrapuptime}s</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Service Level</p>
            <p className="text-lg font-semibold">{queue.servicelevel}s</p>
          </div>
        </div>

        {/* Members */}
        <h2 className="mb-4 text-lg font-semibold">Members</h2>
        {queue.members?.length === 0 ? (
          <p className="text-gray-500">No members in this queue</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
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
                    Penalty
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
                {queue.members?.map((member: any) => {
                  const ext = extractExtension(member.interface);
                  const isPaused = member.paused === 1;
                  return (
                    <tr key={member.uniqueid}>
                      <td className="whitespace-nowrap px-6 py-4 font-medium">
                        {ext}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {member.membername || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {member.penalty}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            isPaused
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {isPaused ? 'Paused' : 'Active'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            pauseMemberMutation.mutate({
                              extension: ext,
                              paused: !isPaused,
                            })
                          }
                          className="mr-3 text-gray-600 hover:text-blue-600"
                          title={isPaused ? 'Unpause' : 'Pause'}
                        >
                          {isPaused ? (
                            <Play className="inline h-4 w-4" />
                          ) : (
                            <Pause className="inline h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${ext} from queue?`)) {
                              removeMemberMutation.mutate(ext);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <UserMinus className="inline h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Add Member to Queue</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Select Extension
              </label>
              <select
                value={selectedExtension}
                onChange={(e) => setSelectedExtension(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Select an extension...</option>
                {availableExtensions.map((ext: any) => (
                  <option key={ext.id} value={ext.id}>
                    {ext.id} - {ext.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddMember(false)}
                className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => addMemberMutation.mutate(selectedExtension)}
                disabled={!selectedExtension || addMemberMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {addMemberMutation.isPending ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
