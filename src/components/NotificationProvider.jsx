import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { connectSocket, getSocket } from '../services/socket';
import useNotificationSound from '../hooks/useNotificationSound';

const NotificationContext = createContext(null);

function buildToastMessage(payload = {}) {
  const type = payload.type || 'system';
  if (type === 'message') {
    return payload.message || 'You have a new message';
  }
  if (type === 'order_status') {
    const orderLabel = payload.orderId ? `Order #${payload.orderId}` : 'Order';
    const status = payload.status || 'updated';
    return `${orderLabel} is now ${status}`;
  }
  return payload.message || 'New notification received';
}

export default function NotificationProvider({ children }) {
  const { play, unlock } = useNotificationSound();
  const qc = useQueryClient();

  useEffect(() => {
    // Socket is created in SocketProvider; if this effect runs first, connect immediately.
    const socket = getSocket() ?? connectSocket();
    if (!socket) return undefined;

    const onNewNotification = (payload) => {
      // Chat module: silent socket hints — refresh list + unread badge, no sound/toast
      if (payload?.silent || payload?.source === 'chat') {
        qc.invalidateQueries({ queryKey: ['conversations'] });
        return;
      }
      play();
      toast.success(buildToastMessage(payload), { id: `notif-${Date.now()}` });
    };

    socket.on('new_notification', onNewNotification);
    socket.on('notification:new', onNewNotification);
    socket.on('message:new', onNewNotification);
    socket.on('order:status_updated', onNewNotification);

    return () => {
      socket.off('new_notification', onNewNotification);
      socket.off('notification:new', onNewNotification);
      socket.off('message:new', onNewNotification);
      socket.off('order:status_updated', onNewNotification);
    };
  }, [play, qc]);

  const value = useMemo(
    () => ({ notificationSoundEnabled: true, setNotificationSoundEnabled: () => {} }),
    []
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <button
        type="button"
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-card border border-palette-mid hover:bg-palette-mist select-none"
        title="Tap once if you do not hear notification sounds (browser audio unlock)"
        aria-label="Test notification sound"
        onClick={() => {
          void unlock();
          void play();
        }}
      >
        <Bell size={14} className="text-emerald-600" aria-hidden />
        Sound On
      </button>
    </NotificationContext.Provider>
  );
}

export function useNotificationSettings() {
  return useContext(NotificationContext);
}
