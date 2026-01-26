import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  acceptOrder,
  getActiveOrders,
  getAllMyOrders,
  getAvailableOrders,
  getDeliveryStatistics,
  getProfile,
  updateAvailability,
  updateLocation,
  updateOrderStatus,
} from "../controllers/delivery.controller.js";

const router = express.Router();

const deliveryAuth = [protect, authorize("delivery")];

// ORDER ROUTES

// Get avaliable orders (unassigned, pending)
router.get("/orders/available", deliveryAuth, getAvailableOrders);

// Get active orders (assigned to this partner, in progress)
router.get("/orders/active", deliveryAuth, getActiveOrders);

// Get all orders (including completed)
router.get("/orders", deliveryAuth, getAllMyOrders);

// Accept an order
router.post("/orders/:id/accept", deliveryAuth, acceptOrder);

// Update order status (picked_up, on_the_way, delivered)
router.patch("/orders/:id/status", deliveryAuth, updateOrderStatus);

// PARTNER MANAGEMENT ROUTES

// Update current location
router.patch("/location", deliveryAuth, updateLocation);

// Update availability status
router.patch("/availability", deliveryAuth, updateAvailability);

// Get delivery partner profile and statistics
router.get("/profile", deliveryAuth, getProfile);

// Get delivery partner statistics
router.get("/statistics", deliveryAuth, getDeliveryStatistics);

export default router;
