const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'https://chat-application-henna-iota.vercel.app',
      'https://www.avansingh.in',
      'http://localhost:5173',
      'https://game-application-blond.vercel.app',
      'http://127.0.0.1:5500', // For local HTML testing
      'http://localhost:5500', // For local HTML testing
      'null' // For file:/// protocol
    ],
    credentials: true
  }
});

let rooms = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let currentRoom = null;

  socket.on('join-room', (roomId) => {
    // Leave any existing room
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms[currentRoom]) {
        rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
        // Broadcast to everyone else in the old room that this user left
        socket.to(currentRoom).emit('user-disconnected', socket.id);
      }
    }

    currentRoom = roomId;

    // Add user to the new room
    if (!rooms[currentRoom]) {
      rooms[currentRoom] = [];
    }

    // Tell the new user who is already in the room
    const otherUsersInRoom = rooms[currentRoom];
    socket.emit('all-users', otherUsersInRoom);

    // Add the new user to the room list
    rooms[currentRoom].push(socket.id);
    socket.join(currentRoom);

    // Tell everyone else in the room that a new user has joined
    socket.to(currentRoom).emit('user-joined', socket.id);

    console.log(`User ${socket.id} joined room ${currentRoom}`);
  });

  // --- WebRTC Signaling ---

  // Relaying an offer to a specific target user
  socket.on('webrtc-offer', (payload) => {
    const { offer, targetSocketId } = payload;
    console.log(`Relaying offer from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-offer', {
      offer,
      senderSocketId: socket.id
    });
  });

  // Relaying an answer back to the original sender
  socket.on('webrtc-answer', (payload) => {
    const { answer, targetSocketId } = payload;
    console.log(`Relaying answer from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('webrtc-answer', {
      answer,
      senderSocketId: socket.id
    });
  });

  // Relaying ICE candidates
  socket.on('webrtc-candidate', (payload) => {
    const { candidate, targetSocketId } = payload;
    io.to(targetSocketId).emit('webrtc-candidate', {
      candidate,
      senderSocketId: socket.id
    });
  });

  // --- Disconnect Handling ---

  const handleDisconnect = () => {
    console.log(`User ${socket.id} disconnected`);
    if (currentRoom && rooms[currentRoom]) {
      // Remove user from the room list
      rooms[currentRoom] = rooms[currentRoom].filter(id => id !== socket.id);
      // Tell everyone else in the room that this user left
      socket.to(currentRoom).emit('user-disconnected', socket.id);
      
      // Clean up empty room
      if (rooms[currentRoom].length === 0) {
        delete rooms[currentRoom];
      }
    }
    currentRoom = null;
  };

  // Fired when "End Call" is clicked
  socket.on('hang-up', handleDisconnect);
  
  // Fired when the tab is closed
  socket.on('disconnect', handleDisconnect);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});