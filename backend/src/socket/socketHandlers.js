import { Order } from "../models/Order.js";
import { DeliveryPartner } from "../models/DeliveryPartner.js";
import { emitToUser, emitToRole, emitToRoom } from "./socketServer.js";
import mongoose from "mongoose";

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

    console.log(` ${user.name} joined order room: ${roomName}`);

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

    console.log(`${user.name} left order room: ${roomName}`);

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

  // REAL TIME ORDER ACCEPTANCE (with locking)
  socket.on("order:accept", async (data) => {
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { orderId } = data;

      if (!orderId) {
        socket.emit("error", { message: "Order ID is required" });
        return;
      }

      // Only delivery partners can accept orders
      if (userRole !== "delivery") {
        socket.emit("error", {
          message: "Only delivery partners can accept orders",
        });
        return;
      }

      // Get delivery partner profile
      const deliveryPartner = await DeliveryPartner.findOne({
        user: userId,
      }).session(session);

      if (!deliveryPartner) {
        await session.abortTransaction();
        socket.emit("error", { message: "Delivery partner profile not found" });
        return;
      }

      // Check if partner is verified and can accept orders
      if (!deliveryPartner.isVerified) {
        await session.abortTransaction();
        socket.emit("error", { message: "Your account is not verified yet" });
        return;
      }

      if (!deliveryPartner.canAcceptOrders) {
        await session.abortTransaction();
        socket.emit("error", {
          message: "You have reached the maximum number of active orders (3)",
        });
        return;
      }

      // Find and lock the order
      const order = await Order.findById(orderId).session(session);

      if (!order) {
        await session.abortTransaction();
        socket.emit("error", { message: "Order not found" });
        return;
      }

      // CRITICAL: Check if order is still available (race condition protection)
      if (order.status !== "pending") {
        await session.abortTransaction();
        socket.emit("order:accept-failed", {
          orderId,
          reason: "already-accepted",
          message: `Order is no longer available. Current status: ${order.status}`,
          timestamp: new Date(),
        });
        return;
      }

      if (order.deliveryPartner) {
        await session.abortTransaction();
        socket.emit("order:accept-failed", {
          orderId,
          reason: "already-assigned",
          message:
            "Order has already been accepted by another delivery partner",
          timestamp: new Date(),
        });
        return;
      }

      // Assign order to delivery partner
      order.deliveryPartner = userId;
      order.status = "accepted";

      // Add status history
      order.statusHistory.push({
        status: "accepted",
        timestamp: new Date(),
        updatedBy: userId,
        note: `Order accepted by ${user.name}`,
      });

      await order.save({ session });

      // Add order to partner's active orders
      await deliveryPartner.addActiveOrder(orderId);

      // Commit transaction
      await session.commitTransaction();

      // Populate order details
      await order.populate("customer", "name phone email");
      await order.populate("items.product", "name price imageUrl");

      console.log(`Order ${orderId} accepted by ${user.name}`);

      // Emit success to the delivery partner who accepted
      socket.emit("order:accepted-success", {
        orderId,
        order,
        message: "Order accepted successfully",
        timestamp: new Date(),
      });

      // Emit to customer that their order was accepted
      emitToUser(order.customer._id.toString(), "order:accepted", {
        orderId,
        partnerId: userId,
        partnerName: user.name,
        status: "accepted",
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        timestamp: new Date(),
      });

      // Emit to order room (anyone tracking this order)
      emitToRoom(`order:${orderId}`, "order:accepted", {
        orderId,
        partnerId: userId,
        partnerName: user.name,
        status: "accepted",
        timestamp: new Date(),
      });

      // Emit to admins
      emitToRole("admin", "order:accepted", {
        orderId,
        customerId: order.customer._id,
        partnerId: userId,
        partnerName: user.name,
        totalAmount: order.totalAmount,
        timestamp: new Date(),
      });

      // Broadcast to other delivery partners that this order is no longer available
      socket.to("role:delivery").emit("order:no-longer-available", {
        orderId,
        acceptedBy: user.name,
        timestamp: new Date(),
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      console.error("Accept Order Error:", error);

      socket.emit("error", {
        message: "Failed to accept order",
        error: error.message,
      });
    } finally {
      session.endSession();
    }
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

      // Validate coordinates
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        socket.emit("error", { message: "Invalid coordinates" });
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
        // verify partner is assigned to this order
        const order = await Order.findById(orderId);

        if (!order) {
          socket.emit("error", { message: "Order not found" });
          return;
        }

        if (order.deliveryPartner?.toString() !== userId) {
          socket.emit("error", {
            message: "You are not assigned to this order",
          });
          return;
        }

        const locationData = {
          partnerId: userId,
          partnerName: user.name,
          orderId,
          location: { lat, lng },
          timestamp: new Date(),
        };

        // Emit to order room (customer will recieve this)
        emitToRoom(`order:${orderId}`, "delivery:location", locationData);

        // Emit to customer directly
        if (order.customer) {
          emitToUser(
            order.customer.toString(),
            "delivery:location",
            locationData,
          );
        }

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

  // START / STOP CONTINUOUS LOCATION TRACKING

  let locationTrackingInterval = null;

  socket.on("delivery:start-tracking", async (data) => {
    try {
      if (userRole !== "delivery") {
        socket.emit("error", {
          message: "Only delivery partners can start tracking",
        });
        return;
      }

      const { orderId, updateInterval = 5000 } = data; // Default: 5 seconds

      if (!orderId) {
        socket.emit("error", { message: `Order Id is required` });
        return;
      }

      // Verify partner is assigned to this order
      const order = await Order.findById(orderId);

      if (!order) {
        socket.emit("error", {
          message: "Order not found",
        });
      }

      if (order.deliveryPartner?.toString() !== userId) {
        socket.emit("error", { message: "You are not assigned to this order" });
        return;
      }

      // Store tracking info on socket
      socket.trackingOrderId = orderId;
      socket.trackingInterval = updateInterval;

      socket.emit("delivery: tracking-started", {
        orderId,
        updateInterval,
        message: "Continuous location tracking started",
        timestamp: new Date(),
      });

      console.log(`${user.name} started tracking for order ${orderId}`);
    } catch (error) {
      console.error(`Start tracking error: `, error);
      socket.emit("error", {
        message: "Failed to start tracking",
        error: error.message,
      });
    }
  });

  socket.on("delivery:stop-tracking", () => {
    if (socket.trackingOrderId) {
      const orderId = socket.trackingOrderId;

      socket.trackingOrderId = null;
      socket.trackingInterval = null;

      socket.emit("delivery:tracking-stopped", {
        orderId,
        message: "Continuous location tracking stopped",
        timestamp: new Date(),
      });

      console.log(`${user.name} stopped tracking for order ${orderId}`);
    }
  });

  // ORDER COMPLETION CONFIRMATION
  socket.on("order:confirm-delivery", async (data) => {
    try {
      const { orderId, confirmationCode, signature } = data;

      if (!orderId) {
        socket.emit("error", { message: "Order ID is required" });
        return;
      }

      // Find order
      const order = await Order.findById(orderId);

      if (!order) {
        socket.emit("error", { message: "Order not found" });
        return;
      }

      // Delivery partner confirming delivery
      if (userRole === "delivery") {
        // Check if order belongs to this partner
        if (order.deliveryPartner?.toString() !== userId) {
          socket.emit("error", {
            message: "You are not assigned to this order",
          });
          return;
        }

        // Check if order is in correct status
        if (order.status !== "on_the_way") {
          socket.emit("error", {
            message: `Order must be "on_the_way" to confirm delivery. Current status: ${order.status}`,
          });
          return;
        }

        // Update order to delivered
        order.status = "delivered";
        order.actualDeliveryTime = new Date();
        order.paymentStatus = "completed";

        if (confirmationCode) {
          order.deliveryConfirmation = {
            code: confirmationCode,
            confirmedBy: userId,
            confirmedAt: new Date(),
          };
        }

        order.statusHistory.push({
          status: "delivered",
          timestamp: new Date(),
          updatedBy: userId,
          note: `Delivery confirmed by ${user.name}`,
        });

        await order.save();

        // Update delivery partner statistics
        const deliveryPartner = await DeliveryPartner.findOne({ user: userId });
        if (deliveryPartner) {
          await deliveryPartner.completeOrder(order.totalAmount);
          await deliveryPartner.removeActiveOrder(orderId);
        }

        // Stop tracking if active
        if (socket.trackingOrderId === orderId) {
          socket.trackingOrderId = null;
          socket.trackingInterval = null;
        }

        // Populate for response
        await order.populate("customer", "name phone email");

        const completionData = {
          orderId,
          status: "delivered",
          actualDeliveryTime: order.actualDeliveryTime,
          paymentStatus: order.paymentStatus,
          timestamp: new Date(),
        };

        // Emit to delivery partner
        socket.emit("order:delivery-confirmed", {
          ...completionData,
          message: "Delivery confirmed successfully",
          order,
        });

        // Emit to customer
        emitToUser(order.customer._id.toString(), "order:completed", {
          ...completionData,
          partnerName: user.name,
          message: "Your order has been delivered!",
        });

        // Emit to order room
        emitToRoom(`order:${orderId}`, "order:completed", completionData);

        // Emit to admins
        emitToRole("admin", "order:completed", {
          ...completionData,
          customerId: order.customer._id,
          partnerId: userId,
          partnerName: user.name,
          totalAmount: order.totalAmount,
        });

        console.log(`Order ${orderId} completed by ${user.name}`);
      }
      // Customer confirming receipt
      else if (userRole === "customer") {
        // Check if order belongs to this customer
        if (order.customer?.toString() !== userId) {
          socket.emit("error", { message: "This is not your order" });
          return;
        }

        // Check if order is delivered
        if (order.status !== "delivered") {
          socket.emit("error", {
            message: "Order must be delivered before confirmation",
          });
          return;
        }

        // Add customer confirmation
        if (!order.deliveryConfirmation) {
          order.deliveryConfirmation = {};
        }

        order.deliveryConfirmation.customerConfirmed = true;
        order.deliveryConfirmation.customerConfirmedAt = new Date();

        if (signature) {
          order.deliveryConfirmation.customerSignature = signature;
        }

        await order.save();

        socket.emit("order:receipt-confirmed", {
          orderId,
          message: "Receipt confirmed",
          timestamp: new Date(),
        });

        // Notify delivery partner
        if (order.deliveryPartner) {
          emitToUser(
            order.deliveryPartner.toString(),
            "order:customer-confirmed",
            {
              orderId,
              customerName: user.name,
              message: "Customer confirmed receipt",
              timestamp: new Date(),
            },
          );
        }

        console.log(`✅ Order ${orderId} confirmed by customer ${user.name}`);
      }
    } catch (error) {
      console.error("Confirm delivery error:", error);
      socket.emit("error", {
        message: "Failed to confirm delivery",
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

// Helper functions (called from REST APIs)

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

// Emit order completed Event
export const emitOrderCompleted = (order) => {
  const eventData = {
    orderId: order._id.toString(),
    status: "delivered",
    actualDeliveryTime: order.actualDeliveryTime,
    paymentStatus: order.paymentStatus,
    timestamp: new Date(),
  };

  // Emit to customer
  if (order.customer) {
    emitToUser(order.customer.toString(), "order:completed", eventData);
  }

  // Emit to delivery partner
  if (order.deliveryPartner) {
    emitToUser(order.deliveryPartner.toString(), "order:completed", eventData);
  }

  // Emit to order room
  emitToRoom(`order:${order._id}`, "order:completed", eventData);

  // Emit to admins
  emitToRole("admin", "order:completed", {
    ...eventData,
    customerId: order.customer,
    partnerId: order.deliveryPartner,
  });

  console.log(`Order completed event emitted: ${order._id}`);
};

export default {
  registerSocketHandlers,
  emitOrderCreated,
  emitOrderAccepted,
  emitOrderStatusUpdate,
  emitOrderCancelled,
};
