import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed } from 'lucide-react';
import { cdrApi } from '../lib/api';
import clsx from 'clsx';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function DispositionIcon({ disposition }: { disposition: string }) {
  switch (disposition) {
    case 'ANSWERED':
      return <Phone className="h-5 w-5 text-green-600" />;
    case 'NO ANSWER':
      return <PhoneMissed className="h-5 w-5 text-red-600" />;
    case 'BUSY':
      return <Phone className="h-5 w-5 text-yellow-600" />;
    default:
      return <Phone className="h-5 w-5 text-gray-400" />;
  }
}

export function CdrPage() {
  const [filters, setFilters] = useState({
    src: '',
    dst: '',
    disposition: '',
    startDate: '',
    endDate: '',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['cdr', filters, page],
    queryFn: () =>
      cdrApi
        .list({
          ...filters,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          disposition: filters.disposition || undefined,
          page,
          limit: 50,
        })
        .then((r) => r.data),
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Call History</h1>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="text"
            placeholder="Source number"
            value={filters.src}
            onChange={(e) => handleFilterChange('src', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="text"
            placeholder="Destination"
            value={filters.dst}
            onChange={(e) => handleFilterChange('dst', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={filters.disposition}
            onChange={(e) => handleFilterChange('disposition', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All</option>
            <option value="ANSWERED">Answered</option>
            <option value="NO ANSWER">No Answer</option>
            <option value="BUSY">Busy</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">End Date</label>
          <input
            type="datetime-local"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
      </div>

      {/* CDR Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date/Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
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
                  No records found
                </td>
              </tr>
            ) : (
              data?.data?.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {format(new Date(record.calldate), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{record.src}</div>
                    <div className="text-gray-500">{record.clid}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {record.dst}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {formatDuration(record.billsec || 0)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <DispositionIcon disposition={record.disposition} />
                      <span
                        className={clsx('ml-2 text-sm', {
                          'text-green-600': record.disposition === 'ANSWERED',
                          'text-red-600': record.disposition === 'NO ANSWER',
                          'text-yellow-600': record.disposition === 'BUSY',
                          'text-gray-500': record.disposition === 'FAILED',
                        })}
                      >
                        {record.disposition}
                      </span>
                    </div>
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
              of <span className="font-medium">{data.pagination.total}</span> results
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
