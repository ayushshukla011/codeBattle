'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Define socket event types
interface TimerTickEvent {
  timeLeft: number;
  serverTime: string;
}

interface SolvedUpdateEvent {
  userId: string;
  problemId: string;
  time: Date;
  serverTime: string;
}

interface EndChallengeEvent {
  winner: {
    id: string;
    email: string;
    codeforcesHandle: string;
  } | null;
  endTime: Date | null;
  serverTime: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChallengeRoom: (challengeCode: string) => void;
  markProblemSolved: (problemId: string) => void;
  timeLeft: number | null;
  solvedProblems: Map<string, { userId: string; time: Date }>;
  challengeEnded: boolean;
  winner: {
    id: string;
    email: string;
    codeforcesHandle: string;
  } | null;
  timeDiff: number;
}

// Create the socket context
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinChallengeRoom: () => {},
  markProblemSolved: () => {},
  timeLeft: null,
  solvedProblems: new Map(),
  challengeEnded: false,
  winner: null,
  timeDiff: 0
});

// Create a provider component for the socket context
export const SocketProvider: React.FC<{ 
  children: React.ReactNode;
  userId: string;
}> = ({ children, userId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<Map<string, { userId: string; time: Date }>>(new Map());
  const [challengeEnded, setChallengeEnded] = useState(false);
  const [winner, setWinner] = useState<{ id: string; email: string; codeforcesHandle: string } | null>(null);
  const [timeDiff, setTimeDiff] = useState(0); // Time difference between client and server

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!userId) return;
    
    // Connect to the server
    const socketInstance = io({
      path: '/api/socket',
      auth: {
        userId
      }
    });
    
    // Set up event listeners
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });
    
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    socketInstance.on('timerTick', (data: TimerTickEvent) => {
      setTimeLeft(data.timeLeft);
      
      // Update time difference between client and server
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime();
        const clientTime = Date.now();
        setTimeDiff(serverTime - clientTime);
      }
    });
    
    socketInstance.on('solvedUpdate', (data: SolvedUpdateEvent) => {
      setSolvedProblems((prevSolved) => {
        const newSolved = new Map(prevSolved);
        newSolved.set(data.problemId, { 
          userId: data.userId, 
          time: new Date(data.time) 
        });
        return newSolved;
      });
      
      // Update time difference between client and server
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime();
        const clientTime = Date.now();
        setTimeDiff(serverTime - clientTime);
      }
    });
    
    socketInstance.on('endChallenge', (data: EndChallengeEvent) => {
      setChallengeEnded(true);
      setWinner(data.winner);
      
      // Update time difference between client and server
      if (data.serverTime) {
        const serverTime = new Date(data.serverTime).getTime();
        const clientTime = Date.now();
        setTimeDiff(serverTime - clientTime);
      }
    });
    
    // Set the socket instance
    setSocket(socketInstance);
    
    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, [userId]);
  
  // Function to join a challenge room
  const joinChallengeRoom = (challengeCode: string) => {
    if (socket && isConnected) {
      socket.emit('joinRoom', challengeCode);
    }
  };
  
  // Function to mark a problem as solved
  const markProblemSolved = (problemId: string) => {
    if (socket && isConnected) {
      socket.emit('markSolved', problemId);
    }
  };
  
  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinChallengeRoom,
        markProblemSolved,
        timeLeft,
        solvedProblems,
        challengeEnded,
        winner,
        timeDiff
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Create a custom hook to use the socket context
export const useSocket = () => useContext(SocketContext); 