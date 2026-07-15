import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Determine the API URL depending on the environment
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const userId = userInfo._id || '';
    const role = userInfo.role || '';

    // Connect to the Socket.io server
    const newSocket = io(API_URL, {
      query: { userId, role },
      autoConnect: true,
      reconnection: true,
    });

    setSocket(newSocket);

    // Clean up function on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
