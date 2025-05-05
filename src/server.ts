import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    path: '/api/socket',
    addTrailingSlash: false
  });

  // Setup socket handlers
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Store user data from auth
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.data.userId = userId;
    }
    
    // Handle room joining
    socket.on('joinRoom', (challengeCode) => {
      if (!socket.data.userId) {
        socket.emit('error', 'User not authenticated');
        return;
      }
      
      console.log(`User ${socket.data.userId} joining room ${challengeCode}`);
      socket.join(challengeCode);
      socket.to(challengeCode).emit('userJoined', { userId: socket.data.userId });
    });
    
    // Handle problem solved
    socket.on('markSolved', (problemId) => {
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      
      if (rooms.length === 0 || !socket.data.userId) {
        socket.emit('error', 'Not in a challenge room');
        return;
      }
      
      // Notify others in the room
      const challengeId = rooms[0]; // Assuming user is in only one challenge room
      io.to(challengeId).emit('solvedUpdate', {
        userId: socket.data.userId,
        problemId,
        time: new Date(),
        serverTime: new Date().toISOString()
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Start the server
  server.listen(process.env.PORT || 3000, () => {
    console.log(`> Ready on http://localhost:${process.env.PORT || 3000}`);
  });
});

export {}; 