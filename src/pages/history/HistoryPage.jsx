import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { historyApi } from '../../services/api';
import { PageLoader, EmptyState } from '../../components/ui';
import { formatDate } from '../../utils/helpers';

const ACTION_LABEL = {
  USER_TRASHED: 'User moved to trash',
  USER_RESTORED: 'User restored',
  USER_DELETED_PERMANENT: 'User deleted permanently',
  TASK_TRASHED: 'Task moved to trash',
  TASK_RESTORED: 'Task restored',
  TASK_DELETED_PERMANENT: 'Task deleted permanently',
};

export default function HistoryPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['history', page],
    queryFn: () => historyApi.list({ page, limit: 40 }).then((r) => r.data),
  });

  const items = data?.items || [];
  const totalPages = data?.pages || 1;

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Activity history</h2>
          <p className="text-sm text-gray-500">
            Audit log for trash and restore actions. Super admins always see this; other roles need History access in Permissions.
          </p>
        </div>
      </div>

      {isError && (
        <p className="text-sm text-red-600">{error?.response?.data?.message || error?.message || 'Could not load history.'}</p>
      )}

      {!isError && items.length === 0 ? (
        <EmptyState icon={History} title="No activity yet" description="Events appear when users or tasks are moved to trash, restored, or deleted permanently." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3 whitespace-nowrap">When</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((row) => (
                  <tr key={row._id}>
                    <td className="py-2.5 pr-3 text-gray-500 whitespace-nowrap text-xs">
                      {row.createdAt ? formatDate(row.createdAt, 'dd MMM yyyy HH:mm') : '—'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-gray-900">{row.actorId?.name || '—'}</span>
                      <span className="block text-xs text-gray-500 truncate max-w-[180px]">{row.actorId?.email}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-surface-secondary text-gray-800">
                        {ACTION_LABEL[row.action] || row.action}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-gray-600 capitalize">{row.targetType}</td>
                    <td className="py-2.5 text-xs text-gray-700 max-w-md">{row.label || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="btn-secondary py-1.5 px-3 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary py-1.5 px-3 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
