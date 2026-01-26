import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material";
import {
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

const AllOrders = () => {
  const { on } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
  });

  // Fetch all orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (filters.status !== "all") params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await axios.get("/api/admin/orders", { params });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOrders();
  }, [filters]);

  // Listen for real-time order updates
  useEffect(() => {
    const unsubscribeCreated = on("order:created", (data) => {
      console.log("New order created:", data);
      setOrders((prev) => [data.order, ...prev]);
    });

    const unsubscribeAccepted = on("order:accepted", (data) => {
      console.log("Order accepted:", data);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId
            ? { ...order, status: "accepted", deliveryPartner: data.partnerId }
            : order,
        ),
      );
    });
    const unsubscribeStatus = on("order:status-updated", (data) => {
      console.log("Order status updated:", data);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId
            ? { ...order, status: data.status }
            : order,
        ),
      );
    });

    const unsubscribeCompleted = on("order:completed", (data) => {
      console.log("Order completed:", data);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId
            ? {
                ...order,
                status: "delivered",
                actualDeliveryTime: data.actualDeliveryTime,
              }
            : order,
        ),
      );
    });

    const unsubscribeCancelled = on("order:cancelled", (data) => {
      console.log("Order cancelled:", data);
      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId
            ? { ...order, status: "cancelled" }
            : order,
        ),
      );
    });

    return () => {
      unsubscribeCreated();
      unsubscribeAccepted();
      unsubscribeStatus();
      unsubscribeCompleted();
      unsubscribeCancelled();
    };
  }, [on]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "warning",
      accepted: "info",
      picked_up: "info",
      on_the_way: "primary",
      delivered: "success",
      cancelled: "error",
    };
    return colors[status] || "default";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      accepted: "Accepted",
      picked_up: "Picked Up",
      on_the_way: "On the Way",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  if (loading && orders.length === 0) {
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

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5">All Orders ({orders.length})</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchOrders} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Order ID, Customer..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              select
              label="Status"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <MenuItem value="all">All Statuses</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="accepted">Accepted</MenuItem>
              <MenuItem value="picked_up">Picked Up</MenuItem>
              <MenuItem value="on_the_way">On the Way</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Delivery Partner</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No orders found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      #{order._id.slice(-8)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {order.customer?.name || "N/A"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.customer?.phone || ""}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {order.items?.length || 0} items
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      ₹{order.totalAmount}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={getStatusLabel(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    {order.deliveryPartner ? (
                      <>
                        <Typography variant="body2">
                          {order.deliveryPartner.name || "Assigned"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.deliveryPartner.phone || ""}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not assigned
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default AllOrders;
