import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    socketRef.current = connectSocket();
    const socket = socketRef.current;
    socket.on('connect', () => { setConnected(true); socket.emit('user:join', user._id); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('users:online', (users) => setOnlineUsers(users));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('users:online');
      disconnectSocket();
      socketRef.current = null;
      setConnected(false);
    };
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
