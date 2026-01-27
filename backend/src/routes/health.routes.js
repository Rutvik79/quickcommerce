import express from "express";
import mongoose from "mongoose";

const router = express.Router();

// @desc    Health check endpoint
// @route   GET /health
// @access  Public
router.get("/health", async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus[dbState],
        connected: dbState === 1,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
      environment: process.env.NODE_ENV || "development",
    };

    // If database is not connected, return 503
    if (dbState !== 1) {
      return res.status(503).json({
        ...health,
        status: "error",
        message: "Database not connected",
      });
    }

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: "error",
      message: "Health check failed",
      error: error.message,
    });
  }
});

export default router;
