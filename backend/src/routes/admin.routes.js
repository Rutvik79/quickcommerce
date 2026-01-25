import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import {
  deleteUser,
  getAllOrders,
  getAllPartners,
  getAllUsers,
  getDashboard,
  getOrderById,
  getPartnerById,
  getStatistics,
  updateOrderStatus,
  verifyPartner,
} from "../controllers/admin.controller.js";
const router = express.Router();

// all routes require authentication and admin role
const adminAuth = [protect, authorize("admin")];

// DASHBOARD

// Get dashboard summary
router.get("/dashboard", adminAuth, getDashboard);

// Get system statistics
router.get("/statistics", adminAuth, getStatistics);

// ORDER MANAGEMENT

// Get all orders
router.get("/orders", adminAuth, getAllOrders);

// Get single order
router.get("/orders/:id", adminAuth, getOrderById);

// Update order status (admin, override)
router.patch("/orders/:id", adminAuth, updateOrderStatus);

// DELIVERY PARTNER MANAGEMENT

// Get all delivery partners
router.get("/partners", adminAuth, getAllPartners);

// Get single delivery partner
router.get("/partners/:id", adminAuth, getPartnerById);

// Verify/Unverify delivery partner
router.patch("/partners/:id/verify", adminAuth, verifyPartner);

// USER MANAGEMENT

// Get all users
router.get("/users", adminAuth, getAllUsers);

// /Delete (deactivate user)
router.delete("/users/:id", adminAuth, deleteUser);

export default router;
