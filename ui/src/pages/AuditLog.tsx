import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Shield, User, Clock, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { systemApi } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { Navigate } from 'react-router-dom';
import clsx from 'clsx';

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    login: 'bg-purple-100 text-purple-800',
    logout: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2 py-1 text-xs font-medium uppercase',
        styles[action.toLowerCase()] || 'bg-gray-100 text-gray-800'
      )}
    >
      {action}
    </span>
  );
}

function JsonViewer({ data, label }: { data: any; label: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return <span className="text-gray-400">-</span>;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
      >
        {expanded ? (
          <ChevronDown className="mr-1 h-4 w-4" />
        ) : (
          <ChevronRight className="mr-1 h-4 w-4" />
        )}
        {label}
      </button>
      {expanded && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const user = useAuthStore((state) => state.user);

  // Only allow admins
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page],
    queryFn: () => systemApi.audit({ page, limit: 25 }).then((r) => r.data),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center text-2xl font-bold text-gray-900">
          <Shield className="mr-2 h-6 w-6" />
          Audit Log
        </h1>
        <p className="text-sm text-gray-500">
          Track all system changes and user activities
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                IP Address
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
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                  <p className="text-lg font-medium">No audit logs</p>
                  <p className="text-sm">Activity will be logged here</p>
                </td>
              </tr>
            ) : (
              data?.data?.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center text-sm text-gray-900">
                      <Clock className="mr-2 h-4 w-4 text-gray-400" />
                      {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <User className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {log.user?.username || 'System'}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{log.entityType}</p>
                      {log.entityId && (
                        <p className="text-sm text-gray-500">{log.entityId}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {log.oldValues && (
                        <JsonViewer data={log.oldValues} label="Previous" />
                      )}
                      {log.newValues && (
                        <JsonViewer data={log.newValues} label="New" />
                      )}
                      {!log.oldValues && !log.newValues && (
                        <span className="text-gray-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {log.ipAddress || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
            <div className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {(page - 1) * data.pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(page * data.pagination.limit, data.pagination.total)}
              </span>{' '}
              of <span className="font-medium">{data.pagination.total}</span> entries
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.pagination.pages}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
