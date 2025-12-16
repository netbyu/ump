import { useQuery } from '@tanstack/react-query';
import { Phone, PhoneOff, PhoneCall, Clock } from 'lucide-react';
import { cdrApi, systemApi, extensionsApi } from '../lib/api';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center">
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { data: status } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => systemApi.status().then((r) => r.data),
    refetchInterval: 10000,
  });

  const { data: cdrStats } = useQuery({
    queryKey: ['cdr-stats-today'],
    queryFn: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return cdrApi.stats({ startDate: today.toISOString() }).then((r) => r.data);
    },
    refetchInterval: 30000,
  });

  const { data: extensions } = useQuery({
    queryKey: ['extensions-summary'],
    queryFn: () => extensionsApi.list({ limit: 100 }).then((r) => r.data),
  });

  const onlineCount = extensions?.data?.filter(
    (e: any) => e.status === 'online' || e.status === 'NOT_INUSE'
  ).length || 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* System Status */}
      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-2 text-lg font-semibold">System Status</h2>
        <div className="flex items-center space-x-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm ${
              status?.asterisk === 'connected'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            Asterisk: {status?.asterisk || 'checking...'}
          </span>
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
            API: {status?.api || 'ok'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Extensions Online"
          value={`${onlineCount} / ${extensions?.pagination?.total || 0}`}
          icon={Phone}
          color="bg-blue-500"
        />
        <StatCard
          title="Calls Today"
          value={cdrStats?.totalCalls || 0}
          icon={PhoneCall}
          color="bg-green-500"
        />
        <StatCard
          title="Missed Calls"
          value={cdrStats?.missedCalls || 0}
          icon={PhoneOff}
          color="bg-red-500"
        />
        <StatCard
          title="Total Talk Time"
          value={formatDuration(cdrStats?.totalDuration || 0)}
          icon={Clock}
          color="bg-purple-500"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Today's Performance</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Answer Rate</span>
              <span className="font-semibold">{cdrStats?.answerRate || 0}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${cdrStats?.answerRate || 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Avg Call Duration</span>
              <span className="font-semibold">
                {formatDuration(cdrStats?.avgDuration || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="/extensions"
              className="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
            >
              <Phone className="mx-auto mb-2 h-8 w-8 text-blue-600" />
              <span className="text-sm font-medium">Manage Extensions</span>
            </a>
            <a
              href="/queues"
              className="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
            >
              <PhoneCall className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <span className="text-sm font-medium">Manage Queues</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
