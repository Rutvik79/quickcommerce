import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getMe,
  login,
  logout,
  refreshToken,
  register,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (require authentication)
router.get("/me", protect, getMe);
router.post("/refresh", protect, refreshToken);
router.post("/logout", protect, logout);

export default router;
