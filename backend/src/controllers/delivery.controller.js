import mongoose from "mongoose";
import { DeliveryPartner } from "../models/DeliveryPartner.js";
import { Order } from "../models/Order.js";
import {
  emitOrderCompleted,
  emitOrderStatusUpdate,
} from "../socket/socketHandlers.js";

// @desc    Get all available (unassigned) orders
// @route   GET /api/delivery/orders/available
// @access  Private (Delivery Partner only)
export const getAvailableOrders = async (req, res) => {
  try {
    const { city, minAmount, maxAmount, page = 1, limit = 20 } = req.query;

    // Get delivery partner profile
    const deliveryPartner = await DeliveryPartner.findOne({
      user: req.user._id,
    });

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found. Please contact support.",
      });
    }

    // Check if partner is verified
    if (!deliveryPartner.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not verified yet. Please wait for admin approval.",
      });
    }

    // Check if partner can accept more orders
    if (!deliveryPartner.canAcceptOrders) {
      return res.status(400).json({
        success: false,
        message:
          "You have reached the maximum number of active orders (3). Please complete existing orders first.",
      });
    }

    // Build query for unassigned orders
    let query = {
      status: "pending",
      deliveryPartner: null,
    };

    // Filter by city if provided
    if (city) {
      query["deliveryAddress.city"] = { $regex: city, $options: "i" };
    }

    // Filter by order amount
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get available orders
    const orders = await Order.find(query)
      .populate("customer", "name phone")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      partnerStatus: {
        isAvailable: deliveryPartner.isAvailable,
        activeOrdersCount: deliveryPartner.activeOrders.length,
        canAcceptMore: deliveryPartner.canAcceptOrders,
      },
      orders,
    });
  } catch (error) {
    console.error("Get Available Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available orders",
      error: error.message,
    });
  }
};

// @desc    Accept an order (with locking mechanism)
// @route   POST /api/delivery/orders/:id/accept
// @access  Private (Delivery Partner only)
export const acceptOrder = async (req, res) => {
  // Start a session for transaction (to prevent race conditions)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const orderId = req.params.id;

    // Get delivery partner profile
    const deliveryPartner = await DeliveryPartner.findOne({
      user: req.user._id,
    }).session(session);

    if (!deliveryPartner) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    // Check if partner is verified and available
    if (!deliveryPartner.isVerified) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Your account is not verified yet",
      });
    }

    if (!deliveryPartner.canAcceptOrders) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "You have reached the maximum number of active orders",
      });
    }

    // Find the order with locking (use session for transaction)
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order is still available (pending and unassigned)
    if (order.status !== "pending") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Order cannot be accepted. Current status: ${order.status}`,
      });
    }

    if (order.deliveryPartner) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Order has already been accepted by another delivery partner",
      });
    }

    // Assign order to delivery partner
    order.deliveryPartner = req.user._id;
    order.status = "accepted";

    // Add status history entry
    order.statusHistory.push({
      status: "accepted",
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: `Order accepted by ${req.user.name}`,
    });

    await order.save({ session });

    // Add order to delivery partner's active orders
    await deliveryPartner.addActiveOrder(orderId);

    // Commit transaction
    await session.commitTransaction();

    // Populate order details for response
    await order.populate("customer", "name phone email");
    await order.populate("items.product", "name price imageUrl");

    res.status(200).json({
      success: true,
      message: "Order accepted successfully",
      order,
    });
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    console.error("Accept Order Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error accepting order",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

// @desc    Update order status
// @route   PATCH /api/delivery/orders/:id/status
// @access  Private (Delivery Partner only)
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, note } = req.body;

    // Validate status
    const validStatuses = ["picked_up", "on_the_way", "delivered"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Find order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if order belongs to this delivery partner
    if (
      !order.deliveryPartner ||
      order.deliveryPartner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this order",
      });
    }

    // Validate status transition
    const currentStatus = order.status;
    const statusFlow = {
      accepted: ["picked_up"],
      picked_up: ["on_the_way"],
      on_the_way: ["delivered"],
    };

    if (
      !statusFlow[currentStatus] ||
      !statusFlow[currentStatus].includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from "${currentStatus}" to "${status}". Valid next status: ${statusFlow[currentStatus]?.join(", ") || "none"}`,
      });
    }

    // Update order status
    order.status = status;

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || `Status updated to ${status}`,
    });

    // If delivered, set actual delivery time and update partner stats
    if (status === "delivered") {
      order.actualDeliveryTime = new Date();
      order.paymentStatus = "completed";

      // Update delivery partner statistics
      const deliveryPartner = await DeliveryPartner.findOne({
        user: req.user._id,
      });
      if (deliveryPartner) {
        await deliveryPartner.completeOrder(order.totalAmount);
        await deliveryPartner.removeActiveOrder(orderId);
      }

      // EMIT REAL-TIME EVENT: Order Completed
      emitOrderCompleted(order);
    } else {
      // EMIT REAL-TIME EVENT: Order Status Updated
      emitOrderStatusUpdate(order, status);
    }

    await order.save();

    // Populate details
    await order.populate("customer", "name phone");
    await order.populate("deliveryPartner", "name phone");

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
};

// @desc    Get delivery partner's active orders
// @route   GET /api/delivery/orders/active
// @access  Private (Delivery Partner only)
export const getActiveOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    let query = {
      deliveryPartner: req.user._id,
      status: { $in: ["accepted", "picked_up", "on_the_way"] }, // Active statuses
    };

    // Filter by specific status if provided
    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get active orders
    const orders = await Order.find(query)
      .populate("customer", "name phone email")
      .populate("items.product", "name price imageUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Order.countDocuments(query);

    // Get delivery partner stats
    const deliveryPartner = await DeliveryPartner.findOne({
      user: req.user._id,
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      statistics: deliveryPartner
        ? {
            completedOrders: deliveryPartner.statistics.completedOrders,
            totalEarnings: deliveryPartner.statistics.totalEarnings,
            averageRating: deliveryPartner.statistics.averageRating,
          }
        : null,
      orders,
    });
  } catch (error) {
    console.error("Get Active Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching active orders",
      error: error.message,
    });
  }
};

// @desc    Get all orders (including completed) for delivery partner
// @route   GET /api/delivery/orders
// @access  Private (Delivery Partner only)
export const getAllMyOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    let query = { deliveryPartner: req.user._id };

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get orders
    const orders = await Order.find(query)
      .populate("customer", "name phone")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      orders,
    });
  } catch (error) {
    console.error("Get All My Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

// @desc    Update delivery partner's current location
// @route   PATCH /api/delivery/location
// @access  Private (Delivery Partner only)
export const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    // Validate coordinates
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    // Find and update delivery partner
    const deliveryPartner = await DeliveryPartner.findOne({
      user: req.user._id,
    });

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    // Update location
    await deliveryPartner.updateLocation(lat, lng);

    res.status(200).json({
      success: true,
      message: "Location updated successfully",
      location: {
        lat: deliveryPartner.currentLocation.lat,
        lng: deliveryPartner.currentLocation.lng,
        lastUpdated: deliveryPartner.currentLocation.lastUpdated,
      },
    });
  } catch (error) {
    console.error("Update Location Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating location",
      error: error.message,
    });
  }
};

// @desc    Update delivery partner availability
// @route   PATCH /api/delivery/availability
// @access  Private (Delivery Partner only)
export const updateAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isAvailable must be a boolean value",
      });
    }

    const deliveryPartner = await DeliveryPartner.findOne({
      user: req.user._id,
    });

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    // Don't allow going available if they have 3 active orders
    if (isAvailable && deliveryPartner.activeOrders.length >= 3) {
      return res.status(400).json({
        success: false,
        message: "Cannot set availability to true with 3 or more active orders",
      });
    }

    deliveryPartner.isAvailable = isAvailable;
    await deliveryPartner.save();

    res.status(200).json({
      success: true,
      message: `Availability updated to ${isAvailable ? "available" : "unavailable"}`,
      isAvailable: deliveryPartner.isAvailable,
    });
  } catch (error) {
    console.error("Update Availability Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating availability",
      error: error.message,
    });
  }
};

// @desc    Get delivery partner profile/stats
// @route   GET /api/delivery/profile
// @access  Private (Delivery Partner only)
export const getProfile = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findOne({
      user: req.user._id,
    })
      .populate("user", "name email phone")
      .populate("activeOrders");

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    res.status(200).json({
      success: true,
      profile: deliveryPartner,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile",
      error: error.message,
    });
  }
};

// @desc    Get delivery partner statistics
// @route   GET /api/delivery/statistics
// @access  Private (Delivery Partner only)
export const getDeliveryStatistics = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findOne(
      { user: req.user._id },
      {
        "statistics.totalEarnings": 1,
        "statistics.completedOrders": 1,
        activeOrders: 1,
        isAvailable: 1,
      },
    );

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner profile not found",
      });
    }

    const activeOrdersCount = deliveryPartner.activeOrders.length;

    res.status(200).json({
      success: true,
      statistics: {
        totalEarnings: deliveryPartner.statistics.totalEarnings,
        completedOrders: deliveryPartner.statistics.completedOrders,
        activeOrders: activeOrdersCount,
        canAcceptOrders: activeOrdersCount < 3,
        isAvailable: deliveryPartner.isAvailable,
      },
    });
  } catch (error) {
    console.error("Get Delivery Statistics Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching delivery statistics",
      error: error.message,
    });
  }
};
