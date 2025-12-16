import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Phone, PhoneCall, PhoneForwarded, RefreshCw } from 'lucide-react';
import { systemApi } from '../lib/api';
import clsx from 'clsx';

function formatDuration(startTime: string): string {
  const start = new Date(startTime);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - start.getTime()) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ChannelStateIcon({ state }: { state: string }) {
  switch (state) {
    case 'Up':
      return <PhoneCall className="h-5 w-5 text-green-600" />;
    case 'Ringing':
      return <Phone className="h-5 w-5 text-blue-600 animate-pulse" />;
    case 'Ring':
      return <PhoneForwarded className="h-5 w-5 text-yellow-600" />;
    default:
      return <Phone className="h-5 w-5 text-gray-400" />;
  }
}

function ChannelStateBadge({ state }: { state: string }) {
  const styles: Record<string, string> = {
    Up: 'bg-green-100 text-green-800',
    Ringing: 'bg-blue-100 text-blue-800',
    Ring: 'bg-yellow-100 text-yellow-800',
    Down: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
        styles[state] || styles.Down
      )}
    >
      {state}
    </span>
  );
}

export function ActiveCallsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['active-channels'],
    queryFn: () => systemApi.channels().then((r) => r.data),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const channels = data?.data || [];

  // Group channels by call (using linkedid or similar)
  const groupedCalls: Record<string, any[]> = {};
  channels.forEach((channel: any) => {
    const callId = channel.linkedid || channel.id;
    if (!groupedCalls[callId]) {
      groupedCalls[callId] = [];
    }
    groupedCalls[callId].push(channel);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Calls</h1>
          <p className="text-sm text-gray-500">
            Real-time view of ongoing calls • Auto-refreshes every 5 seconds
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={clsx('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3">
              <PhoneCall className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Channels</p>
              <p className="text-2xl font-semibold text-gray-900">{channels.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Calls</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Object.keys(groupedCalls).length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-3">
              <PhoneForwarded className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Ringing</p>
              <p className="text-2xl font-semibold text-gray-900">
                {channels.filter((c: any) => c.state === 'Ringing' || c.state === 'Ring').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Channels Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Caller ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Connected To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                State
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Application
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
            ) : channels.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <Phone className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                  <p className="text-lg font-medium">No active calls</p>
                  <p className="text-sm">Calls will appear here when they are in progress</p>
                </td>
              </tr>
            ) : (
              channels.map((channel: any) => (
                <tr key={channel.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <ChannelStateIcon state={channel.state} />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {channel.name?.split('-')[0] || channel.id}
                        </p>
                        <p className="text-xs text-gray-500">{channel.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {channel.caller?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {channel.caller?.number || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {channel.connected?.name || '-'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {channel.connected?.number || channel.dialplan?.exten || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ChannelStateBadge state={channel.state} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                    {channel.creationtime ? formatDuration(channel.creationtime) : '-'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {channel.dialplan?.app_name || '-'}
                    {channel.dialplan?.app_data && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({channel.dialplan.app_data})
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Last Updated */}
      {data && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Last updated: {format(new Date(), 'HH:mm:ss')}
        </div>
      )}
    </div>
  );
}
