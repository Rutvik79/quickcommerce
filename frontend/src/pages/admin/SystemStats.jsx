import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  LinearProgress,
} from "@mui/material";
import {
  TrendingUp as TrendingIcon,
  ShoppingCart as OrdersIcon,
  People as UsersIcon,
  LocalShipping as DeliveryIcon,
  AttachMoney as MoneyIcon,
  PendingActions as PendingIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

/*
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
  */

const mapAdminStats = (apiStats) => ({
  totalOrders: apiStats.orders?.total ?? 0,
  pendingOrders: apiStats.orders?.byStatus?.pending ?? 0,
  completedOrders: apiStats.orders?.byStatus?.completed ?? 0,
  totalRevenue: apiStats.orders?.totalRevenue ?? 0,
  todayOrders: apiStats.orders?.last24Hours ?? 0,
  todayRevenue: apiStats.orders?.deliveredLast24Hours ?? 0,
  totalCustomers: apiStats.users?.totalCustomers ?? 0,
  totalDeliveryPartners: apiStats.users?.totalDeliveryPartners ?? 0,
  activeDeliveryPartners: apiStats.users?.activePartners ?? 0,
  averageDeliveryTime: apiStats.orders?.averageDeliveryTime ?? 0,
});

const SystemStats = () => {
  const { on, connected } = useSocket();
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalDeliveryPartners: 0,
    activeDeliveryPartners: 0,
    averageDeliveryTime: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({
    customers: 0,
    delivery: 0,
    total: 0,
  });

  // Fetch stats
  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/admin/statistics");
      console.log(
        "response from system stats cause mapping error",
        response.data.statistics,
      );

      setStats(mapAdminStats(response.data.statistics) || {});
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setError("Failed to load statistics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribeOrder = on("order:created", () => {
      setStats((prev) => ({
        ...prev,
        totalOrders: prev.totalOrders + 1,
        pendingOrders: prev.pendingOrders + 1,
        todayOrders: prev.todayOrders + 1,
      }));
    });

    const unsubscribeCompleted = on("order:completed", (data) => {
      setStats((prev) => ({
        ...prev,
        completedOrders: prev.completedOrders + 1,
        pendingOrders: Math.max(0, prev.pendingOrders - 1),
        totalRevenue: prev.totalRevenue + (data.totalAmount || 0),
        todayRevenue: prev.todayRevenue + (data.totalAmount || 0),
      }));
    });

    return () => {
      unsubscribeOrder();
      unsubscribeCompleted();
    };
  }, [on]);

  // Track online users
  useEffect(() => {
    // Request online users count
    const requestOnlineUsers = () => {
      // This would need a backend endpoint
      axios
        .get("/api/admin/online-users")
        .then((response) => {
          setOnlineUsers(response.data.onlineUsers || {});
        })
        .catch((error) => {
          console.error("Failed to fetch online users:", error);
        });
    };

    requestOnlineUsers();
    const interval = setInterval(requestOnlineUsers, 10000);

    return () => clearInterval(interval);
  }, []);

  const StatCard = ({ title, value, icon, color, subtitle, progress }) => (
    <Card>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4">{value}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              bgcolor: `${color}.light`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {React.cloneElement(icon, {
              sx: { fontSize: 32, color: `${color}.main` },
            })}
          </Box>
        </Box>
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ mt: 1, height: 8, borderRadius: 4 }}
          />
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  const completionRate =
    stats.totalOrders > 0
      ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)
      : 0;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5">System Statistics</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: connected ? "success.main" : "error.main",
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {connected ? "Real-time updates active" : "Disconnected"}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Main Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<OrdersIcon />}
            color="primary"
            subtitle={`${stats.todayOrders} today`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`₹${(stats.totalRevenue || 0).toLocaleString()}`}
            icon={<MoneyIcon />}
            color="success"
            subtitle={`₹${stats.todayRevenue} today`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed Orders"
            value={stats.completedOrders ?? 0}
            icon={<TrendingIcon />}
            color="info"
            subtitle={`${completionRate}% completion rate`}
            progress={parseFloat(completionRate)}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={<PendingIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* User Stats */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Users
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers}
            icon={<UsersIcon />}
            color="primary"
            subtitle={`${onlineUsers.customers} online`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Delivery Partners"
            value={stats.totalDeliveryPartners}
            icon={<DeliveryIcon />}
            color="success"
            subtitle={`${stats.activeDeliveryPartners} active`}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Online Users"
            value={onlineUsers.total}
            icon={<UsersIcon />}
            color="info"
            subtitle={`${onlineUsers.delivery} partners online`}
          />
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Performance
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Average Delivery Time
            </Typography>
            <Typography variant="h3" color="primary">
              {stats.averageDeliveryTime || 0} min
            </Typography>
            <Typography variant="body2" color="text.secondary">
              From order placement to delivery
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Status Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Pending</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.pendingOrders}
                </Typography>
              </Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2">Completed</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.completedOrders}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">Total</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {stats.totalOrders ?? 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SystemStats;
