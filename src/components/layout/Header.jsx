import React, { useState, useEffect, useRef } from 'react';
import { Bell, Wifi, WifiOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from '../ui';
import { timeAgo } from '../../utils/helpers';

export default function Header({ title }) {
  const { user } = useAuth();
  const { connected } = useSocket();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const qc = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ unread: 'true' }).then(r => r.data),
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  });

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  const notifIcon = (type) => {
    const icons = { task: '✅', project: '📁', client: '👤', invoice: '💰', health_alert: '🚨', system: '📋', message: '💬' };
    return icons[type] || '🔔';
  };

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
      <div className="pl-10 lg:pl-0">
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs ${connected ? 'text-green-600' : 'text-gray-400'}`}>
          {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
          <span className="hidden md:inline">{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) refetch(); }}
            className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors">
            <Bell size={18} className="text-gray-600" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-red text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-gray-100 animate-slide-in z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && (
                  <button onClick={() => markAllRead.mutate()} className="text-xs text-brand-navy hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">All caught up! 🎉</div>
                ) : notifications.map(n => (
                  <div key={n._id} className={`px-4 py-3 hover:bg-surface-secondary transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex gap-2.5">
                      <span className="text-base flex-shrink-0">{notifIcon(n.type)}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <Avatar user={user} size="sm" />
      </div>
    </header>
  );
}
