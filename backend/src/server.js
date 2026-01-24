import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";

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
  res.json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: "connected",
  });
});

// api routes
app.use("/api/auth", authRoutes);
app.use("/api/customer", customerRoutes);

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`API: http://localhost:${PORT}`);
});
