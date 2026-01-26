import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { on, joinOrder, leaveOrder } = useSocket();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveryLocation, setDeliveryLocation] = useState(null);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/api/customer/orders/${orderId}`);
        setOrder(response.data.order);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        setError("Failed to load order details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  // Join order room for real-time updates
  useEffect(() => {
    if (orderId) {
      joinOrder(orderId);

      return () => {
        leaveOrder(orderId);
      };
    }
  }, [orderId, joinOrder, leaveOrder]);

  // Listen for real-time updates
  useEffect(() => {
    const unsubscribeStatus = on("order:status-updated", (data) => {
      if (data.orderId === orderId) {
        console.log("Order status updated:", data);
        setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
      }
    });

    const unsubscribeCompleted = on("order:completed", (data) => {
      if (data.orderId === orderId) {
        console.log("Order completed:", data);
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                status: "delivered",
                actualDeliveryTime: data.actualDeliveryTime,
              }
            : prev,
        );
      }
    });

    const unsubscribeLocation = on("delivery:location", (data) => {
      if (data.orderId === orderId) {
        console.log("Delivery location updated:", data);
        setDeliveryLocation(data.location);
      }
    });

    const unsubscribeCancelled = on("order:cancelled", (data) => {
      if (data.orderId === orderId) {
        console.log("Order cancelled:", data);
        setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeCompleted();
      unsubscribeLocation();
      unsubscribeCancelled();
    };
  }, [on, orderId]);

  const steps = [
    { key: "pending", label: "Order Placed" },
    { key: "accepted", label: "Accepted" },
    { key: "picked_up", label: "Picked Up" },
    { key: "on_the_way", label: "On the Way" },
    { key: "delivered", label: "Delivered" },
  ];

  const getActiveStep = (status) => {
    const index = steps.findIndex((step) => step.key === status);
    return index >= 0 ? index : 0;
  };

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

  if (error || !order) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || "Order not found"}</Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate("/customer/orders")}
          sx={{ mt: 2 }}
        >
          Back to Orders
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate("/customer/orders")}
        sx={{ mb: 3 }}
      >
        Back to Orders
      </Button>

      <Typography variant="h4" gutterBottom>
        Track Order
      </Typography>

      <Grid container spacing={3}>
        {/* Order Status */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 3,
              }}
            >
              <Typography variant="h6">Order #{order._id.slice(-8)}</Typography>
              <Chip
                label={order.status.replace("_", " ").toUpperCase()}
                color={getStatusColor(order.status)}
              />
            </Box>

            {order.status !== "cancelled" && (
              <Stepper
                activeStep={getActiveStep(order.status)}
                alternativeLabel
              >
                {steps.map((step) => (
                  <Step key={step.key}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}

            {order.status === "cancelled" && (
              <Alert severity="error">This order has been cancelled</Alert>
            )}
          </Paper>
        </Grid>

        {/* Delivery Partner Info */}
        {order.deliveryPartner && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Delivery Partner
              </Typography>

              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography variant="body1">
                  {order.deliveryPartner.name}
                </Typography>
              </Box>

              {order.deliveryPartner.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {order.deliveryPartner.phone}
                  </Typography>
                </Box>
              )}

              {deliveryLocation && (
                <Box
                  sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LocationIcon color="primary" />
                    <Typography variant="body2">Live Location</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Lat: {deliveryLocation.lat.toFixed(4)}, Lng:{" "}
                    {deliveryLocation.lng.toFixed(4)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Updated in real-time
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        )}

        {/* Order Details */}
        <Grid item xs={12} md={order.deliveryPartner ? 6 : 12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              Placed on: {formatDate(order.createdAt)}
            </Typography>

            {order.estimatedDeliveryTime && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Estimated delivery: {formatDate(order.estimatedDeliveryTime)}
              </Typography>
            )}

            {order.actualDeliveryTime && (
              <Typography variant="body2" color="success.main" gutterBottom>
                Delivered at: {formatDate(order.actualDeliveryTime)}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Delivery Address:
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.deliveryAddress.street}, {order.deliveryAddress.city}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {order.deliveryAddress.state} - {order.deliveryAddress.zipCode}
            </Typography>
          </Paper>
        </Grid>

        {/* Order Items */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>

            <List>
              {order.items.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={item.productName}
                      secondary={`Quantity: ${item.quantity} × ₹${item.price}`}
                    />
                    <Typography variant="body1">
                      ₹{item.price * item.quantity}
                    </Typography>
                  </ListItem>
                  {index < order.items.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                ₹{order.totalAmount}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default OrderTracking;
