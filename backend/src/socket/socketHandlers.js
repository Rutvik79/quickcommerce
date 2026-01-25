import { Order } from "../models/Order.js";
import { DeliveryPartner } from "../models/DeliveryPartner.js";
import { emitToUser, emitToRole, emitToRoom } from "./socketServer.js";

export const registerSocketHandlers = (io, socket) => {
  const user = socket.user;
  const userId = socket.userId;
  const userRole = socket.userRole;

  console.log(`Registering event handlers for ${user.name} (${userRole})`);

  //   ROOM MANAGEMENT
  // Join order-specific room
  socket.on("order:join", (data) => {
    const { orderId } = data;

    if (!orderId) {
      socket.emit("error", { message: "Order ID is required" });
      return;
    }

    const roomName = `order:${orderId}`;
    socket.join(roomName);

    console.log(`📦 ${user.name} joined order room: ${roomName}`);

    socket.emit("order:joined", {
      orderId,
      roomName,
      message: "Successfully joined order room",
      timestamp: new Date(),
    });

    // Notify others in the room
    socket.to(roomName).emit("order:user-joined", {
      userId,
      userName: user.name,
      userRole,
      orderId,
      timestamp: new Date(),
    });
  });

  // Leave order-specific room
  socket.on("order:leave", (data) => {
    const { orderId } = data;

    if (!orderId) {
      socket.emit("error", { message: "Order ID is required" });
      return;
    }

    const roomName = `order:${orderId}`;
    socket.leave(roomName);

    console.log(`📦 ${user.name} left order room: ${roomName}`);

    socket.emit("order:left", {
      orderId,
      roomName,
      message: "Successfully left order room",
      timestamp: new Date(),
    });

    // Notify others in the room
    socket.to(roomName).emit("order:user-left", {
      userId,
      userName: user.name,
      userRole,
      orderId,
      timestamp: new Date(),
    });
  });

  //   DELIVERY PARTNER LOCATION UPDATES
  socket.on(`delivery:location-update`, async (data) => {
    try {
      if (userRole !== "delivery") {
        socket.emit("error", {
          message: "Only delivery partners can update location",
        });
        return;
      }

      const { lat, lng, orderId } = data;

      if (!lat || !lng) {
        socket.emit(`error`, {
          message: "Latitude and Longitude are required",
        });
        return;
      }

      //   update location in database
      const deliveryPartner = await DeliveryPartner.findOne({ user: userId });

      if (!deliveryPartner) {
        socket.emit("error", { message: "Delivery partner profile not found" });
        return;
      }

      await deliveryPartner.updateLocation(lat, lng);

      //   If orderId is provided, emit to that order's room
      if (orderId) {
        const locationData = {
          partnerId: userId,
          partnerName: user.name,
          orderId,
          location: { lat, lng },
          timestamp: new Date(),
        };

        // Emit to order room (customer will recieve this)
        emitToRoom(`order:${orderId}`, "delivery:location", locationData);

        // Emit to admins
        emitToRole("admin", "delivery:location", locationData);

        console.log(
          `Location update from ${user.name} for order ${orderId}: (${lat}, ${lng})`,
        );
      }

      //   Acknowledge location update
      socket.emit("delivery:location-update", {
        location: { lat, lng },
        timestamp: new Date(),
      });
    } catch (error) {
      console.error(`Location update error:`, error);
      socket.emit("error", {
        message: "Failed to update location",
        error: error.message,
      });
    }
  });

  //   TYPING INDICATORS
  socket.on("typing:start", (data) => {
    const { orderId } = data;

    if (!orderId) {
      return;
    }

    socket.to(`order:${orderId}`).emit("typing:user-typing", {
      userId,
      userName: user.name,
      userRole,
      orderId,
      timestamp: new Date(),
    });
  });

  socket.on("typing:stop", (data) => {
    const { orderId } = data;

    if (!orderId) {
      return;
    }

    socket.to(`order:${orderId}`).emit("typing:user-stopped", {
      userId,
      userName: user.name,
      userRole,
      orderId,
      timestamp: new Date(),
    });
  });

  // PING PONG (for connection monitoring)

  socket.on("ping", () => {
    socket.emit("pong", {
      timestamp: new Date(),
      latency: Date.now(),
    });
  });

  //   GET ONLINE USERSE (Admin only)

  socket.on("users:get-online", async () => {
    try {
      if (userRole !== "admin") {
        socket.emit("error", { message: "Only admins can view online users" });
        return;
      }

      const onlineUsers = [];
      const sockets = await io.fetchSockets();

      for (const sock of sockets) {
        onlineUsers.push({
          userId: sock.userId,
          userName: sock.user.name,
          userRole: sock.userRole,
          socketId: sock.id,
          connectedAt: new Date(),
        });
      }

      socket.emit("users:online-list", {
        count: onlineUsers.length,
        users: onlineUsers,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Get online users error: ", error);
      socket.emit("error", {
        message: "Failed to get online users",
        error: error.message,
      });
    }
  });

  //   DELIVERY PARTNER AVAILABILITY UPDATES
  socket.on("delivery:availability-update", async (data) => {
    try {
      if (userRole !== "delivery") {
        socket.emit("error", {
          message: "Only delivery partners can update availability",
        });
        return;
      }

      const { isAvailable } = data;

      if (typeof isAvailable !== "boolean") {
        socket.emit("error", { message: "isAvailable must be a boolean" });
        return;
      }

      const deliveryPartner = await DeliveryPartner.findOne({ user: userId });

      if (!deliveryPartner) {
        socket.emit("error", { message: "Delivery partner profile not found" });
        return;
      }

      // Check if they can go available
      if (isAvailable && deliveryPartner.activeOrders.length >= 3) {
        socket.emit("error", {
          message:
            "Cannot set availability to true with 3 or more active orders",
        });
        return;
      }

      deliveryPartner.isAvailable = isAvailable;
      await deliveryPartner.save();

      // Notify admins
      emitToRole("admin", "delivery:availability-changed", {
        partnerId: userId,
        partnerName: user.name,
        isAvailable,
        timestamp: new Date(),
      });

      socket.emit("delivery:availability-updated", {
        isAvailable,
        timestamp: new Date(),
      });

      console.log(`${user.name} availability changed to: ${isAvailable}`);
    } catch (error) {
      console.error("Availability update error: ", error);
      socket.emit("error", {
        message: "Failed to update availability",
        error: error.message,
      });
    }
  });

  //   HEARTBEAT (Connection health check)

  socket.on("heartbeat", () => {
    socket.emit("heartbeat:ack", {
      timestamp: new Date(),
      userId,
      status: "alive",
    });
  });

  //   CUSTOM MESSAGE (for future chat/messaging)
  socket.on(`message:send`, (data) => {
    const { orderId, message } = data;

    if (!orderId || !message) {
      socket.emit("error", { message: "Order ID and message are required" });
      return;
    }

    const messageData = {
      messageId: `msg_${Date.now()}`,
      orderId,
      senderId: userId,
      senderName: user.name,
      senderRole: userRole,
      message,
      timestamp: new Date(),
    };

    // Emit to order room
    emitToRoom(`order:${orderId}`, "message:received", messageData);

    // Acknowledge
    socket.emit("message:sent", messageData);

    console.log(`Message from ${user.name} in order ${orderId}: ${message}`);
  });

  //   GET ROOM MEMBERS
  socket.on(`room:get-members`, async (data) => {
    try {
      const { roomName } = data;

      if (!roomName) {
        socket.emit("error", { message: "Room name is required" });
        return;
      }

      const socketsInRoom = io.sockets.adapter.rooms.get(roomName);

      if (!socketsInRoom) {
        socket.emit("room:members", {
          roomName,
          count: 0,
          members: [],
          timestamp: new Date(),
        });
        return;
      }

      const members = [];
      for (const socketId of socketsInRoom) {
        const sock = io.sockets.sockets.get(socketId);
        if (sock) {
          members.push({
            userId: sock.userId,
            userName: sock.user.name,
            userRole: sock.userRole,
            socketId: sock.id,
          });
        }
      }

      socket.emit("room:members", {
        roomName,
        count: members.length,
        members,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Get room members error:", error);
      socket.emit("error", {
        message: "Failed to get room members",
        error: error.message,
      });
    }
  });

  //   ERROR HANDLING
  socket.on("error", (error) => {
    console.error(`Socket error from ${user.name}:`, error);
  });
  console.log(`Event handlers registered for ${user.name}`);
};

// Helper functions for emitting events from controllers

// Emit order created event
export const emitOrderCreated = (order) => {
  // Emit to all delivery partners
  emitToRole("delivery", "order:created", {
    orderId: order._id,
    customerId: order.customer,
    totalAmomunt: order.totalAmount,
    deliveryAddress: order.deliveryAddress,
    items: order.items,
    timestamp: new Date(),
  });

  // Emit to admins
  emitToRole("admin", "order:created", {
    orderId: order._id,
    customerId: order.customer,
    totalAmount: order.totalAmount,
    timestamp: new Date(),
  });

  console.log(`Order created event emitted: ${order._id}`);
};

// Emit order accepted event
export const emitOrderAccepted = (order, partnerId) => {
  // Emit to customer
  emitToUser(order.customer.toString(), "order:accepted", {
    orderId: order._id,
    partnerId,
    status: "accepted",
    timestamp: new Date(),
  });

  // Emit to admins
  emitToRole("admin", "order:accepted", {
    orderId: order._id,
    customerId: order.customer,
    partnerId,
    timestamp: new Date(),
  });

  console.log(`Order accepted event emitted: ${order._id}`);
};

// Emit order status update event
export const emitOrderStatusUpdate = (order, newStatus) => {
  const eventData = {
    orderId: order._id,
    status: newStatus,
    timestamp: new Date(),
  };

  // Emit to customer
  if (order.customer) {
    emitToUser(order.customer.toString(), "order:status-updated", eventData);
  }

  // Emit to delivery partner
  if (order.deliveryPartner) {
    emitToUser(
      order.deliveryPartner.toString(),
      "order:status-updated",
      eventData,
    );
  }

  // Emit to order room
  emitToRoom(`order:${order._id}`, "order:status-updated", eventData);

  // Emit to admins
  emitToRole("admin", "order:status-updated", {
    ...eventData,
    customerId: order.customer,
    partnerId: order.deliveryPartner,
  });

  console.log(`Order status update emitted: ${order._id} -> ${newStatus}`);
};

// Emit order cancelled event
export const emitOrderCancelled = (order, cancelledBy, reason) => {
  const eventData = {
    orderId: order._id,
    status: "cancelled",
    cancelledBy,
    reason,
    timestamp: new Date(),
  };

  // Emit to customer
  if (order.customer) {
    emitToUser(order.customer.toString(), "order:cancelled", eventData);
  }

  // Emit to delivery partner
  if (order.deliveryPartner) {
    emitToUser(order.deliveryPartner.toString(), "order:cancelled", eventData);
  }

  // Emit to order room
  emitToRoom(`order:${order._id}`, "order:cancelled", eventData);

  // Emit to admins
  emitToRole("admin", "order:cancelled", eventData);

  console.log(`Order cancelled event emitted: ${order._id}`);
};

export default {
  registerSocketHandlers,
  emitOrderCreated,
  emitOrderAccepted,
  emitOrderStatusUpdate,
  emitOrderCancelled,
};
