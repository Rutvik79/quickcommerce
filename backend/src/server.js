import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import mongoose from "mongoose";
import { createServer } from "http";
import { initializeSocketServer } from "./socket/socketServer.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import deliveryRoutes from "./routes/delivery.routes.js";
import adminroutes from "./routes/admin.routes.js";

// Load env variables
dotenv.config();

// init express app
export const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route for testing
app.get("/", (req, res) => {
  res.json({
    message: "QuickCommerce API Server",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// health check endpoint
app.get("/health", (req, res) => {
  const healthcheck = {
    status: "OK",
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || "development",
    database: "connected",
    version: "1.0.0",
  };

  try {
    if (mongoose.connection.readyState !== 1) {
      healthcheck.database = "disconnected";
      return res.status(503).json({
        status: "UNHEALTHY",
        ...healthcheck,
      });
    }

    res.status(200).json({
      status: "HEALTHY",
      ...healthcheck,
    });
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).json({
      status: "UNHEALTHY",
      ...healthcheck,
    });
  }
});

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/admin", adminroutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (process.env.NODE_ENV === "development") {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
      stack: err.stack,
    });
  } else {
    if (process.env.NODE_ENV === "development") {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    }
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocketServer(httpServer);

// start listening
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`API: http://localhost:${PORT}`);
});

export { app, io };