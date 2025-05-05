import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiResponse } from 'next';
import prisma from './prisma';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export interface SocketData {
  userId: string;
  challengeId: string;
}

// User-to-challenge room mapping for easy access
export const userRooms = new Map<string, string>();

let io: SocketIOServer | undefined;

export const initSocket = (res: NextApiResponseWithSocket) => {
  if (!io) {
    // Create a new Socket.IO server if one doesn't exist
    io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    });
    
    // Add the io instance to the Next.js response
    res.socket.server.io = io;
    
    // Setup socket event handlers
    io.on('connection', (socket) => {
      console.log('New client connected', socket.id);
      
      // Handle joining a challenge room
      socket.on('joinRoom', async (challengeCode: string) => {
        try {
          const challenge = await prisma.challenge.findUnique({
            where: { code: challengeCode },
            select: { id: true }
          });
          
          if (!challenge) {
            socket.emit('error', 'Challenge not found');
            return;
          }
          
          // Get user ID from socket handshake auth
          const userId = socket.handshake.auth.userId;
          if (!userId) {
            socket.emit('error', 'User not authenticated');
            return;
          }
          
          // Store user data and join the room
          socket.data.userId = userId;
          socket.data.challengeId = challenge.id;
          
          // Map user to their current challenge room
          userRooms.set(userId, challenge.id);
          
          // Join the socket room
          socket.join(challenge.id);
          
          console.log(`User ${userId} joined challenge ${challenge.id}`);
          
          // Inform others that someone joined
          socket.to(challenge.id).emit('userJoined', { userId });
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', 'Failed to join challenge room');
        }
      });
      
      // Handle marking problem as solved
      socket.on('markSolved', async (problemId: string) => {
        const userId = socket.data.userId;
        const challengeId = socket.data.challengeId;
        
        if (!userId || !challengeId) {
          socket.emit('error', 'Not in a challenge room');
          return;
        }
        
        // Let everyone in the room know about the solved problem
        io?.to(challengeId).emit('solvedUpdate', {
          userId,
          problemId,
          time: new Date(),
          serverTime: new Date().toISOString()
        });
      });
      
      // Handle user disconnect
      socket.on('disconnect', () => {
        const userId = socket.data.userId;
        if (userId) {
          userRooms.delete(userId);
        }
        console.log('Client disconnected', socket.id);
      });
    });
  }
  
  return io;
};

// Function to emit timer updates to a challenge room
export const emitTimerUpdate = (challengeId: string, timeLeft: number) => {
  io?.to(challengeId).emit('timerTick', { 
    timeLeft,
    serverTime: new Date().toISOString()
  });
};

// Function to end a challenge and notify all participants
export const emitChallengeEnd = async (challengeId: string) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        winner: {
          select: {
            id: true,
            email: true,
            codeforcesHandle: true
          }
        }
      }
    });
    
    if (!challenge) {
      console.error('Challenge not found when ending:', challengeId);
      return;
    }
    
    io?.to(challengeId).emit('endChallenge', {
      winner: challenge.winner,
      endTime: challenge.endTime,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error emitting challenge end:', error);
  }
}; 