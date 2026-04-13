import React, { createContext, useContext, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Bell, BellOff } from 'lucide-react';
import { getSocket } from '../services/socket';
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
  const { enabled, setEnabled, play } = useNotificationSound('/sounds/notification.mp3');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onNewNotification = (payload) => {
      if (enabled) play();
      toast.success(buildToastMessage(payload), { id: `notif-${Date.now()}` });
    };

    // Core real-time notification event.
    socket.on('new_notification', onNewNotification);
    socket.on('notification:new', onNewNotification);

    // Example aliases for domain specific streams.
    socket.on('message:new', onNewNotification);
    socket.on('order:status_updated', onNewNotification);

    return () => {
      socket.off('new_notification', onNewNotification);
      socket.off('notification:new', onNewNotification);
      socket.off('message:new', onNewNotification);
      socket.off('order:status_updated', onNewNotification);
    };
  }, [enabled, play]);

  const value = useMemo(
    () => ({ notificationSoundEnabled: enabled, setNotificationSoundEnabled: setEnabled }),
    [enabled, setEnabled]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <button
        type="button"
        onClick={() => setEnabled((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-card border border-gray-200 hover:bg-gray-50"
        title={enabled ? 'Disable notification sound' : 'Enable notification sound'}
      >
        {enabled ? <Bell size={14} className="text-emerald-600" /> : <BellOff size={14} className="text-gray-500" />}
        {enabled ? 'Sound On' : 'Sound Off'}
      </button>
    </NotificationContext.Provider>
  );
}

export function useNotificationSettings() {
  return useContext(NotificationContext);
}
