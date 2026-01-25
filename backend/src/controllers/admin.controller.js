import { DeliveryPartner } from "../models/DeliveryPartner.js";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";
import mongoose from "mongoose";
import { User } from "../models/User.js";

// @desc    Get all orders (system-wide)
// @route   GET /api/admin/orders
// @access  Private (Admin only)
export const getAllOrders = async (req, res) => {
  try {
    const {
      status,
      customerId,
      partnerId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      city,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    let query = {};

    // Status filter
    if (status) {
      query.status = status;
    }

    // Customer filter
    if (customerId) {
      query.customer = customerId;
    }

    // Delivery partner filter
    if (partnerId) {
      query.deliveryPartner = partnerId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Amount filter
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = Number(minAmount);
      if (maxAmount) query.totalAmount.$lte = Number(maxAmount);
    }

    // City filter
    if (city) {
      query["deliveryAddress.city"] = { $regex: city, $options: "i" };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get orders
    const orders = await Order.find(query)
      .populate("customer", "name email phone")
      .populate("deliveryPartner", "name phone")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    //   Get total count
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
    console.error("Get All Orders Error: ", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    });
  }
};

// @desc    Get single order (admin can view any order)
// @route   GET /api/admin/orders/:id
// @access  Private (Admin only)
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("deliveryPartner", "name phone email")
      .populate("items.product", "name description price imageUrl");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Order Error: ", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(505).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    });
  }
};

// @desc    Get all delivery partners
// @route   GET /api/admin/partners
// @access  Private (Admin only)
export const getAllPartners = async (req, res) => {
  try {
    const {
      isVerified,
      isAvailable,
      vehicleType,
      minRating,
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    let query = {};

    // Verification filter
    if (isVerified !== undefined) {
      query.isVerified = isVerified === "true";
    }

    // Availability filter
    if (isAvailable !== undefined) {
      query.isAvailable = isAvailable === "true";
    }

    // Vehicle type filter
    if (vehicleType) {
      query.vehicleType = vehicleType;
    }

    // Rating filter
    if (minRating) {
      query["statistics.averageRating"] = { $gte: Number(minRating) };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get delivery partners
    const partners = await DeliveryPartner.find(query)
      .populate("user", "name email phone")
      .populate("activeOrders")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    //   Get total count
    const total = await DeliveryPartner.countDocuments(query);

    res.status(200).json({
      success: true,
      count: partners.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      partners,
    });
  } catch (error) {
    console.error("Get All Partners Error: ", error);
    res.status(500).json({
      success: false,
      message: "Error fetching delivery partners",
      error: error.message,
    });
  }
};

// @desc    Get single delivery partner details
// @route   GET /api/admin/partners/:id
// @access  Private (Admin only)
export const getPartnerById = async (req, res) => {
  try {
    const partner = await DeliveryPartner.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("activeOrders");

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    // Get partner's order history
    const orderHistory = await Order.find({ deliveryPartner: partner.user })
      .select("status totalAmount createdAt actualDeliveryTime")
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      partner,
      recentOrders: orderHistory,
    });
  } catch (error) {
    console.error("Get Partner Error: ", error);

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error fetching delivery partner",
      error: error.message,
    });
  }
};

// @desc    Verify/Unverify delivery partner
// @route   PATCH /api/admin/partners/:id/verify
// @access  Private (Admin only)
export const verifyPartner = async (req, res) => {
  try {
    const { isVerified } = req.body;

    if (typeof isVerified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVerified must be a boolean value",
      });
    }

    const partner = await DeliveryPartner.findById(req.params.id).populate(
      "user",
      "name email phone",
    );

    if (!partner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    partner.isVerified = isVerified;
    await partner.save();

    res.status(200).json({
      success: true,
      message: `Delivery partner ${isVerified ? "verified" : "unverified"}`,
      partner,
    });
  } catch (error) {
    console.error("Verify Partner Error: ", error);

    res.status(500).json({
      success: false,
      message: "Error updating partner verification",
      error: error.message,
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/statistics
// @access  Private (Admin only)
export const getStatistics = async (req, res) => {
  try {
    // Get date range from query (default: last 30 days)
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    } else {
      // Default: last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.createdAt = { $gte: thirtyDaysAgo };
    }

    // Order Statistics
    const orderStats = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    // Total orders
    const totalOrders = await Order.countDocuments(dateFilter);

    // Total revenue
    const revenueResult = await Order.aggregate([
      { $match: { ...dateFilter, paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // User statistics
    const totalCustomers = await User.countDocuments({ role: "customer" });
    const totalDeliveryPartners = await DeliveryPartner.countDocuments();
    const verifiedPartners = await DeliveryPartner.countDocuments({
      isVerified: true,
    });
    const availablePartners = await DeliveryPartner.countDocuments({
      isVerified: true,
      isAvailable: true,
    });

    // Product statistics
    const totalProducts = await Product.countDocuments();
    const availableProducts = await Product.countDocuments({
      isAvailable: true,
    });
    const outOfStock = await Product.countDocuments({ stock: 0 });

    // Top products by order frequency
    const topProducts = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          orderCount: { $sum: 1 },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ]);

    // Populate product details
    await Product.populate(topProducts, {
      path: "_id",
      select: "name category price",
    });

    // Top delivery partners
    const topPartners = await DeliveryPartner.find({ isVerified: true })
      .sort({ "statistics.completedOrders": -1 })
      .limit(10)
      .populate("user", "name email phone")
      .select("user statistics vehicleType");

    //   Recent activity (last 24 hrs)
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentOrderCount = await Order.countDocuments({
      createdAt: { $gte: last24Hours },
    });

    const recentDeliveries = await Order.countDocuments({
      status: "delivered",
      actualDeliveryTime: { $gte: last24Hours },
    });

    // peak hours analysis
    const peakHours = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Response
    res.status(200).json({
      success: true,
      statistics: {
        orders: {
          total: totalOrders,
          byStatus: orderStats,
          totalRevenue,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          last24Hours: recentOrderCount,
          deliveredLast24Hours: recentDeliveries,
        },
        users: {
          totalCustomers,
          totalDeliveryPartners,
          verifiedPartners,
          availablePartners,
          activePartners: availablePartners,
        },
        products: {
          total: totalProducts,
          available: availableProducts,
          outOfStock,
        },
        topProducts: topProducts.map((p) => ({
          product: p._id,
          orderCount: p.orderCount,
          totalQuantity: p.totalQuantity,
          totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        })),
        topPartners: topPartners.map((p) => ({
          id: p._id,
          name: p.user.name,
          email: p.user.email,
          completedOrders: p.statistics.completedOrders,
          totalEarnings: Math.round(p.statistics.totalEarnings * 100) / 100,
          averageRating: Math.round(p.statistics.averageRating * 10) / 10,
          vehicleType: p.vehicleType,
        })),
        peakHours: peakHours.map((p) => ({
          hour: p._id,
          orderCount: p.count,
        })),
      },
      dateRange: {
        start: startDate || "Last 30 days",
        end: endDate || "Now",
      },
    });
  } catch (error) {
    console.error("Get Statistics Error: ", error);
    res.status(500).json({
      success: false,
      message: "Error fetching statistics",
      error: error.message,
    });
  }
};

// @desc    Get all users (customers, partners, admins)
// @route   GET /api/admin/users
// @access  Private (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;

    // Build query
    let query = {};

    // Role filter
    if (role) {
      query.role = role;
    }

    // Active status filter
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get users
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      users,
    });
  } catch (error) {
    console.error("Get All Users Error: ", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

// @desc    Update order status (admin override)
// @route   PATCH /api/admin/orders/:id
// @access  Private (Admin only)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    // validate status
    const validStatuses = [
      "pending",
      "accepted",
      "picked_up",
      "on_the_way",
      "delivered",
      "cancelled",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")} `,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // update status
    order.status = status;

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      note: note || `Admin updated status to ${status}`,
    });

    // Handle delivery completion
    if (status === "delivered" && !order.actualDeliveryTime) {
      order.actualDeliveryTime = new Date();
      order.paymentStatus = "completed";

      if (order.deliveryPartner) {
        const partner = await DeliveryPartner.findOne({
          user: order.deliveryPartner,
        });
        if (partner) {
          await partner.completeOrder(order.totalAmount);
          await partner.removeActiveOrder(order._id);
        }
      }
    }

    // Handle cancellation - restore stock
    if (status === "cancelled") {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.increaseStock(item.quantity);
          await product.save();
        }
      }

      if (!order.cancellationReason) {
        order.cancellationReason = note || "Cancelled by admin";
      }

      //   Remove from partner's active orders if assigned
      if (order.deliveryPartner) {
        const partner = await DeliveryPartner.findOne({
          user: order.deliveryPartner,
        });
        if (partner) {
          await partner.removeActiveOrder(order._id);
          partner.statistics.cancelledOrders += 1;
          await partner.save();
        }
      }
    }

    await order.save();

    await order.populate("customer", "name email phone");
    await order.populate("deliveryPartner", "name phone");

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order status",
      error: error.message,
    });
  }
};

// @desc    Delete user (soft delete - set isActive to false)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Soft delete - set isActive to false
    user.isActive = false;
    await user.save();

    // if delivery partner, set unavailable
    if (user.role === "delivery") {
      await DeliveryPartner.findOneAndUpdate(
        { user: user._id },
        { isAvailable: false },
      );
    }

    res.status(200).json({
      success: true,
      message: "User deactivated successfully",
      user: {
        id: user._id,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Delete User Error: ", error);
    res.status(500).json({
      success: false,
      message: "Error deactivating user",
      error: error.message,
    });
  }
};

// @desc    Get dashboard summary
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
export const getDashboard = async (req, res) => {
  try {
    // Today's  statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today },
    });

    const todayRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: today },
          paymentStatus: "completed",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$totalAmount",
          },
        },
      },
    ]);

    // Active statistics
    const activeOrders = await Order.countDocuments({
      status: { $in: ["pending", "accepted", "picked_up", "on_the_way"] },
    });

    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const ongoingDeliveries = await Order.countDocuments({
      status: { $in: ["picked_up", "on_the_way"] },
    });

    // Recent orders
    const recentOrders = await Order.find()
      .populate("customer", "name")
      .populate("deliveryPartner", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .select("customer deliveryPartner status totalAmount createdAt");

    res.status(200).json({
      success: true,
      dashboard: {
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.total || 0,
        },
        active: {
          totalActiveOrders: activeOrders,
          pendingOrders,
          ongoingDeliveries,
          availablePartners: await DeliveryPartner.countDocuments({
            isAvailable: true,
            isVerified: true,
          }),
        },
        totals: {
          totalOrders: await Order.countDocuments(),
          totalCustomers: await User.countDocuments({ role: "customer" }),
          totalPartners: await DeliveryPartner.countDocuments(),
          totalProducts: await Product.countDocuments(),
        },
        recentOrders,
      },
    });
  } catch (error) {
    console.error("Get Dashboard Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data",
      error: error.message,
    });
  }
};
