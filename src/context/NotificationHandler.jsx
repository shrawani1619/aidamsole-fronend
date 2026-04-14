import { useEffect } from 'react';
import toast from 'react-hot-toast';
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

  useEffect(() => {
    if (!socket) {
      console.log('[Notification] socket not ready yet');
      return undefined;
    }

    console.log('[Notification] listeners attached', {
      socketId: socket.id,
      connected: socket.connected,
    });

    const onNotification = (eventName) => (notification = {}) => {
      console.log('[Notification] event received', {
        eventName,
        id: notification?.id,
        type: notification?.type,
        title: notification?.title,
        silent: notification?.silent,
        timestamp: notification?.timestamp,
      });

      const toastId = notification?.id ? `notification-${notification.id}` : undefined;
      toast.success(formatNotificationMessage(notification), { id: toastId });

      if (notification.silent === true) {
        console.log('[Notification] sound skipped because silent=true', {
          eventName,
          id: notification?.id,
        });
        return;
      }

      console.log('[Notification] triggering sound play', {
        eventName,
        id: notification?.id,
      });
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
      console.log('[Notification] listeners removed');
    };
  }, [socket, play]);

  return null;
}
