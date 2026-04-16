import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { notificationsApi } from '../../services/api';
import { PageLoader, EmptyState } from '../../components/ui';
import { timeAgo } from '../../utils/helpers';

function notifIcon(type) {
  const icons = {
    task: '✅',
    project: '📁',
    client: '👤',
    invoice: '💰',
    health_alert: '🚨',
    system: '📋',
    message: '💬',
  };
  return icons[type] || '🔔';
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () => notificationsApi.list({ page, limit: 25 }).then((r) => r.data),
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications || [];
  const totalPages = data?.pages || 1;
  const unreadCount = data?.unreadCount ?? 0;

  const openNotification = (n) => {
    if (!n.isRead) markRead.mutate(n._id);
    if (n.link) navigate(n.link);
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="page-title">Notifications</h2>
          <p className="text-sm text-gray-500">
            All alerts stay here until you read them; nothing is removed automatically.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className="btn-secondary text-sm py-2 px-3 shrink-0"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </button>
        )}
      </div>

      {isError && (
        <p className="text-sm text-red-600">{error?.response?.data?.message || error?.message || 'Could not load notifications.'}</p>
      )}

      {!isError && notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="When you are assigned tasks or mentioned, they will appear here." />
      ) : (
        <>
          <ul className="card divide-y divide-gray-50 p-0 overflow-hidden">
            {notifications.map((n) => (
              <li key={n._id}>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className={`w-full text-left px-4 py-3.5 flex gap-3 transition-colors hover:bg-surface-secondary ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <span className="text-lg flex-shrink-0 pt-0.5">{notifIcon(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-navy mt-2" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>

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
