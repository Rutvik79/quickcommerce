import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Badge,
  Paper,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Logout as LogoutIcon,
  ShoppingBag as OrderIcon,
  LocalShipping as ActiveIcon,
  AccountBalanceWallet as EarningsIcon,
  Notifications as NotificationIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import AvailableOrders from "./AvailableOrders";
import ActiveOrders from "./ActiveOrders";
import axios from "axios";

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected, on } = useSocket();

  const [currentTab, setCurrentTab] = useState(0);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedOrders: 0,
    activeOrders: 0,
  });
  const [notifications, setNotifications] = useState(0);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get("/api/delivery/statistics");
        setStats(response.data.statistics || {});
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
  }, []);

  // Listen for new order notifications
  useEffect(() => {
    const unsubscribe = on("order:created", (data) => {
      console.log("New order notification:", data);

      // Increment notification badge
      setNotifications((prev) => prev + 1);

      // Show browser notification if supported
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Order Available!", {
          body: `Order #${data.order._id.slice(-8)} - ₹${data.order.totalAmount}`,
          icon: "/logo192.png",
        });
      }
    });

    return unsubscribe;
  }, [on]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Clear notifications when viewing available orders
  useEffect(() => {
    if (currentTab === 0) {
      setNotifications(0);
    }
  }, [currentTab]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 0) {
      navigate("/delivery/dashboard");
    } else {
      navigate("/delivery/active");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* App Bar */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QuickCommerce Partner
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Connection Status */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: connected ? "success.main" : "error.main",
                mr: 1,
              }}
            />

            {/* Notifications */}
            <IconButton color="inherit">
              <Badge badgeContent={notifications} color="error">
                <NotificationIcon />
              </Badge>
            </IconButton>

            {/* User Info */}
            <Typography
              variant="body2"
              sx={{ ml: 2, display: { xs: "none", sm: "block" } }}
            >
              {user?.name}
            </Typography>

            {/* Logout */}
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Stats Cards */}
      <Box sx={{ bgcolor: "primary.main", color: "white", py: 3 }}>
        <Box sx={{ maxWidth: "lg", mx: "auto", px: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Paper
                sx={{ p: 2, bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <EarningsIcon />
                  <Typography variant="body2">Total Earnings</Typography>
                </Box>
                <Typography variant="h5">
                  ₹{stats.totalEarnings || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                sx={{ p: 2, bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <OrderIcon />
                  <Typography variant="body2">Completed</Typography>
                </Box>
                <Typography variant="h5">
                  {stats.completedOrders || 0}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper
                sx={{ p: 2, bgcolor: "rgba(255,255,255,0.1)", color: "white" }}
              >
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <ActiveIcon />
                  <Typography variant="body2">Active Orders</Typography>
                </Box>
                <Typography variant="h5">{stats.activeOrders || 0}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: "lg", mx: "auto" }}>
          <Tabs value={currentTab} onChange={handleTabChange}>
            <Tab
              label={
                <Badge badgeContent={notifications} color="error">
                  Available Orders
                </Badge>
              }
            />
            <Tab label="Active Orders" />
          </Tabs>
        </Box>
      </Box>

      {/* Main Content */}
      <Box component="main">
        <Routes>
          <Route path="/" element={<AvailableOrders />} />
          <Route path="dashboard" element={<AvailableOrders />} />
          <Route path="active" element={<ActiveOrders />} />
          <Route
            path="*"
            element={<Navigate to="/delivery/dashboard" replace />}
          />
        </Routes>
      </Box>
    </Box>
  );
};

export default DeliveryDashboard;
