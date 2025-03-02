const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join', (roomId) => {
    socket.join(roomId);
    currentRoom = roomId;
    const clients = io.sockets.adapter.rooms.get(roomId);

    if (clients.size === 1) {
      socket.emit('init');
    } else {
      socket.to(roomId).emit('offerNeeded');
    }
  });

  socket.on('offer', ({ offer, roomId }) => {
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomId }) => {
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('candidate', ({ candidate, roomId }) => {
    socket.to(roomId).emit('candidate', candidate);
  });

  socket.on('disconnect', () => {
    if (currentRoom) {
      socket.leave(currentRoom);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});