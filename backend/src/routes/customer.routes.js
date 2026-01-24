import express from "express";
import {
  getProducts,
  getProductById,
  placeOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getCategories,
} from "../controllers/customer.controller.js";
import { optionalAuth, protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";

const router = express.Router();

// PRODUCT ROUTES

// Get all products - Public (anyone can view)
// Optinal auth allows for personalized results if logged in
router.get("/products", optionalAuth, getProducts);

// Get single product - Public
router.get("/products/:id", getProductById);

// Get product categories - Public
router.get("/categories", getCategories);

// ORDER ROUTES (customer only)

// place new order - Customer only
router.post("/orders", protect, authorize("customer"), placeOrder);

// Get all orders for logged-in customer - Customer only
router.get("/orders", protect, authorize("customer"), getMyOrders);

// Get specific order details - Customer only (own orders)
router.get("/orders/:id", protect, authorize("customer"), getOrderById);

// cancel order - customer only (own orders)
router.delete("/orders/:id", protect, authorize("customer"), cancelOrder);

export default router;
