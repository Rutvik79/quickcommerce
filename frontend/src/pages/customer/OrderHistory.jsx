import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Divider,
} from "@mui/material";
import {
  ShoppingBag as OrderIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

const OrderHistory = () => {
  const navigate = useNavigate();
  const { on } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get("/api/customer/orders");
        setOrders(response.data.orders || []);
      } catch (error) {
        console.error("Failed to fetch orders:", error);
        setError("Failed to load orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Listen for real-time order updates
  useEffect(() => {
    const unsubscribeAccepted = on("order:accepted", (data) => {
      console.log("Order accepted:", data);

      setOrders((prev) =>
        prev.map((order) =>
          order._id === data.orderId ? { ...order, status: "accepted" } : order,
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

  const getStatusText = (status) => {
    const texts = {
      pending: "Pending",
      accepted: "Accepted",
      picked_up: "Picked Up",
      on_the_way: "On the Way",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return texts[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <OrderIcon />
        My Orders
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center" }}>
          <OrderIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No orders yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Start shopping to place your first order
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/customer/dashboard")}
          >
            Browse Products
          </Button>
        </Paper>
      ) : (
        <List>
          {orders.map((order) => (
            <Paper key={order._id} sx={{ mb: 2, p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">
                      Order #{order._id.slice(-8)}
                    </Typography>
                    <Chip
                      label={getStatusText(order.status)}
                      color={getStatusColor(order.status)}
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Placed on: {formatDate(order.createdAt)}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Items: {order.items?.length || 0} item(s)
                  </Typography>

                  {order.deliveryPartner && (
                    <Typography variant="body2" color="text.secondary">
                      Delivery Partner:{" "}
                      {order.deliveryPartner.name || "Assigned"}
                    </Typography>
                  )}
                </Grid>

                <Grid
                  item
                  xs={12}
                  sm={4}
                  sx={{ textAlign: { xs: "left", sm: "right" } }}
                >
                  <Typography variant="h6" color="primary" gutterBottom>
                    ₹{order.totalAmount}
                  </Typography>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => navigate(`/customer/orders/${order._id}`)}
                  >
                    Track Order
                  </Button>
                </Grid>

                {order.items && order.items.length > 0 && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Order Items:
                    </Typography>
                    <List dense>
                      {order.items.map((item, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemText
                            primary={`${item.productName || "Product"} × ${item.quantity}`}
                            secondary={`₹${item.price} each`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
              </Grid>
            </Paper>
          ))}
        </List>
      )}
    </Container>
  );
};

export default OrderHistory;
