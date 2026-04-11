import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    socketRef.current = io(window.location.origin.replace(':3000', ':5000'), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    const socket = socketRef.current;
    socket.on('connect', () => { setConnected(true); socket.emit('user:join', user._id); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('users:online', (users) => setOnlineUsers(users));
    return () => { socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [user]);

  const emit = (event, data) => socketRef.current?.emit(event, data);
  const on = (event, cb) => { socketRef.current?.on(event, cb); return () => socketRef.current?.off(event, cb); };
  const joinRoom = (roomId) => socketRef.current?.emit('chat:join', roomId);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, emit, on, joinRoom, onlineUsers, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
