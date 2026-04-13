import { io } from 'socket.io-client';

let socketInstance = null;

function getSocketUrl() {
  return (
    (import.meta.env.VITE_SOCKET_URL && String(import.meta.env.VITE_SOCKET_URL).trim()) ||
    window.location.origin.replace(':3000', ':5000')
  );
}

export function connectSocket() {
  if (socketInstance) return socketInstance;

  socketInstance = io(getSocketUrl(), {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    withCredentials: true,
  });

  return socketInstance;
}

export function getSocket() {
  return socketInstance;
}

export function disconnectSocket() {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
}
