const { Server } = require('socket.io');

// Map to track connected users: userId -> socketId
const connectedUsers = new Map();

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── Register user on connect ───────────────────────────────────────────
    socket.on('register', ({ userId }) => {
      connectedUsers.set(userId, socket.id);
      console.log(`👤 User registered: ${userId} → ${socket.id}`);
    });

    // ─── Rescuer updates their live location ───────────────────────────────
    // Flutter app emits this from TrackingProvider every few seconds
    socket.on('rescuer:location-update', ({ rescuerId, requestId, lat, lng }) => {
      console.log(`📍 Rescuer ${rescuerId} location: ${lat}, ${lng}`);

      // Broadcast rescuer location to the customer tracking that request
      // The customer's screen listens for 'rescuer:location' events
      socket.to(`request:${requestId}`).emit('rescuer:location', { lat, lng });
    });

    // ─── Customer updates their live location ──────────────────────────────
    socket.on('customer:location-update', ({ customerId, requestId, lat, lng }) => {
      socket.to(`request:${requestId}`).emit('customer:location', { lat, lng });
    });

    // ─── Join a request room (both customer & rescuer join) ─────────────────
    socket.on('join:request', ({ requestId }) => {
      socket.join(`request:${requestId}`);
      console.log(`🚪 Socket ${socket.id} joined room: request:${requestId}`);
    });

    // ─── Rescuer goes online/offline ────────────────────────────────────────
    socket.on('rescuer:toggle-online', ({ rescuerId, isOnline }) => {
      console.log(`🔄 Rescuer ${rescuerId} is now ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
    });

    // ─── Disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      // Remove from map
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`🔴 User disconnected: ${userId}`);
          break;
        }
      }
    });
  });

  // Helper: emit to a specific user by userId
  io.emitToUser = (userId, event, data) => {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit(event, data);
    }
  };

  return io;
};

module.exports = initSocket;
