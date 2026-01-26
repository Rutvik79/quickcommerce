import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

let io;

// Initialize Socket.io server
export const initializeSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // console.log("1");
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // console.log("2");
      // Verify token
      const decoded = verifyToken(token);

      // Get user details
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      if (!user.isActive) {
        return next(
          new Error("Authentication error: User account is deactivated"),
        );
      }

      // console.log("3");
      // Attach user to socket
      socket.user = user;
      socket.userId = user._id.toString();
      socket.userRole = user.role;

      // console.log("4");
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Connection event
  io.on("connection", (socket) => {
    // console.log("5");
    console.log(
      `User connected: ${socket.user.name} (${socket.user.role}) - Socket ID: ${socket.id}`,
    );

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-specific room
    socket.join(`role:${socket.userRole}`);

    // Send welcome message
    socket.emit("connected", {
      message: "Connected to QuickCommerce real-time server",
      userId: socket.userId,
      userName: socket.user.name,
      role: socket.userRole,
      socketId: socket.id,
      timestamp: new Date(),
    });

    // console.log("6");
    // Broadcast user online status to admins
    io.to("role:admin").emit("user:online", {
      userId: socket.userId,
      userName: socket.user.name,
      role: socket.userRole,
      timestamp: new Date(),
    });

    // console.log("7");
    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.user.name} - Reason: ${reason}`);

      // Broadcast user offline status to admins
      io.to("role:admin").emit("user:offline", {
        userId: socket.userId,
        userName: socket.user.name,
        role: socket.userRole,
        reason,
        timestamp: new Date(),
      });
    });

    // console.log("8");
    // Handle errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      socket.emit("error", {
        message: "An error occurred",
        error: error.message,
      });
    });

    // console.log("9");
    // Import and register event handlers
    import("./socketHandlers.js").then(({ registerSocketHandlers }) => {
      registerSocketHandlers(io, socket);
    });
  });

  // console.log("10");
  console.log("Socket.io server initialized");
  return io;
};

// Get Socket.io instance
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Emit event to specific user
export const emitToUser = (userId, event, data) => {
  if (!io) {
    console.error("Socket.io not initialized");
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
};

// Emit event to specific role
export const emitToRole = (role, event, data) => {
  if (!io) {
    console.error("Socket.io not initialized");
    return;
  }
  io.to(`role:${role}`).emit(event, data);
};

// Emit event to specific room
export const emitToRoom = (room, event, data) => {
  if (!io) {
    console.error("Socket.io not initialized");
    return;
  }
  io.to(room).emit(event, data);
};

// Emit event to all connected clients
export const emitToAll = (event, data) => {
  if (!io) {
    console.error("Socket.io not initialized");
    return;
  }
  io.emit(event, data);
};

// Get connected users count
export const getConnectedUsersCount = () => {
  if (!io) {
    return 0;
  }
  return io.sockets.sockets.size;
};

// Get users in a specific room
export const getUsersInRoom = (room) => {
  if (!io) {
    return [];
  }
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  return socketsInRoom ? Array.from(socketsInRoom) : [];
};

// Check if user is online
export const isUserOnline = (userId) => {
  if (!io) {
    return false;
  }
  const room = `user:${userId}`;
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  return socketsInRoom && socketsInRoom.size > 0;
};

export default {
  initializeSocketServer,
  getIO,
  emitToUser,
  emitToRole,
  emitToRoom,
  emitToAll,
  getConnectedUsersCount,
  getUsersInRoom,
  isUserOnline,
};
