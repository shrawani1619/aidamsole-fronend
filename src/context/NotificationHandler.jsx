import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import useNotificationSound from '../hooks/useNotificationSound';
import { useSocket } from './SocketContext';

function formatNotificationMessage(notification) {
  const title = notification?.title?.trim();
  const message = notification?.message?.trim();

  if (title && message) return `${title}: ${message}`;
  if (title) return title;
  if (message) return message;
  return 'New notification received';
}

export default function NotificationHandler() {
  const { play } = useNotificationSound();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) return undefined;

    const onNotification = (eventName) => (notification = {}) => {
      if (notification?.silent || notification?.source === 'chat') {
        qc.invalidateQueries({ queryKey: ['notifications'] });
        return;
      }

      qc.invalidateQueries({ queryKey: ['notifications'] });

      const toastId = notification?.id ? `notification-${notification.id}` : undefined;
      const link = notification?.link;

      toast.custom(
        (t) => (
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-4 py-3 max-w-sm flex flex-col gap-2 text-left">
            <p className="text-sm text-gray-900">{formatNotificationMessage(notification)}</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="text-xs font-medium text-brand-navy hover:underline"
                onClick={() => {
                  toast.dismiss(t);
                  navigate('/notifications');
                }}
              >
                View all
              </button>
              {link ? (
                <button
                  type="button"
                  className="text-xs font-medium text-gray-700 hover:underline"
                  onClick={() => {
                    toast.dismiss(t);
                    navigate(link);
                  }}
                >
                  Open
                </button>
              ) : null}
            </div>
          </div>
        ),
        { id: toastId, duration: 8000 }
      );

      void play();
    };

    const onNotificationNew = onNotification('notification:new');
    const onNewNotification = onNotification('new_notification');
    const onMessageNew = onNotification('message:new');

    socket.on('notification:new', onNotificationNew);
    socket.on('new_notification', onNewNotification);
    socket.on('message:new', onMessageNew);

    return () => {
      socket.off('notification:new', onNotificationNew);
      socket.off('new_notification', onNewNotification);
      socket.off('message:new', onMessageNew);
    };
  }, [socket, play, navigate, qc]);

  return null;
}
