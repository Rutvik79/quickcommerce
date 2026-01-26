import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  CircularProgress,
  Alert,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import {
  LocalShipping as DeliveryIcon,
  NavigateNext as NextIcon,
  CheckCircle as CompleteIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

const ActiveOrders = () => {
  const { on, emit } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [completingOrder, setCompletingOrder] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [locationTracking, setLocationTracking] = useState({});

  // Fetch active orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get("/api/delivery/orders/active");
        setOrders(response.data.orders || []);
      } catch (error) {
        console.error("Failed to fetch active orders:", error);
        setError("Failed to load active orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Start location tracking for active orders
  useEffect(() => {
    orders.forEach((order) => {
      if (order.status === "on_the_way" && !locationTracking[order._id]) {
        startLocationTracking(order._id);
      }
    });
  }, [orders]);

  const startLocationTracking = (orderId) => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return;
    }

    // Get location every 5 seconds
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Send location update
          emit("delivery:location-update", {
            lat: latitude,
            lng: longitude,
            orderId,
          });

          console.log(
            `📍 Location sent for order ${orderId}: ${latitude}, ${longitude}`,
          );
        },
        (error) => {
          console.error("Location error:", error);
        },
      );
    }, 5000);

    setLocationTracking((prev) => ({
      ...prev,
      [orderId]: intervalId,
    }));
  };

  const stopLocationTracking = (orderId) => {
    if (locationTracking[orderId]) {
      clearInterval(locationTracking[orderId]);
      setLocationTracking((prev) => {
        const newTracking = { ...prev };
        delete newTracking[orderId];
        return newTracking;
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(locationTracking).forEach((intervalId) => {
        clearInterval(intervalId);
      });
    };
  }, [locationTracking]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdating(orderId);

    try {
      // /orders/:id/status
      // console.log("orderId from active orders", orderId);
      // console.log("status from active orders", newStatus);
      await axios.patch(`/api/delivery/orders/${orderId}/status`, {
        status: newStatus,
      });

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: newStatus } : order,
        ),
      );

      // Start tracking if moving to on_the_way
      if (newStatus === "on_the_way") {
        startLocationTracking(orderId);
      }
    } catch (error) {
      console.error("Status update failed:", error);
      alert(error.response?.data?.message || "Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const handleCompleteOrder = () => {
    if (!completingOrder) return;

    // Send completion via WebSocket
    emit("order:confirm-delivery", {
      orderId: completingOrder._id,
      confirmationCode: confirmationCode || undefined,
    });

    // Stop location tracking
    stopLocationTracking(completingOrder._id);

    // Remove from active orders
    setOrders((prev) =>
      prev.filter((order) => order._id !== completingOrder._id),
    );

    // Close dialog
    setCompletingOrder(null);
    setConfirmationCode("");

    alert("Order marked as delivered!");
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      accepted: "picked_up",
      picked_up: "on_the_way",
      on_the_way: "delivered",
    };
    return statusFlow[currentStatus];
  };

  const getStatusLabel = (status) => {
    const labels = {
      accepted: "Accepted",
      picked_up: "Picked Up",
      on_the_way: "On the Way",
      delivered: "Delivered",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      accepted: "info",
      picked_up: "warning",
      on_the_way: "primary",
      delivered: "success",
    };
    return colors[status] || "default";
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <DeliveryIcon />
        Active Orders ({orders.length})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center" }}>
          <DeliveryIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Active Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Accept orders from the Available Orders tab
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => {
            const nextStatus = getNextStatus(order.status);

            return (
              <Grid item xs={12} key={order._id}>
                <Card>
                  <CardContent>
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
                            label={getStatusLabel(order.status)}
                            color={getStatusColor(order.status)}
                            size="small"
                          />
                          {locationTracking[order._id] && (
                            <Chip
                              icon={<LocationIcon />}
                              label="Tracking"
                              color="success"
                              size="small"
                            />
                          )}
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Customer: {order.customer?.name || "Customer"}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          {order.deliveryAddress.street},{" "}
                          {order.deliveryAddress.city}
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                          Accepted: {formatDate(order.createdAt)}
                        </Typography>
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

                        <Typography variant="body2" color="text.secondary">
                          {order.items?.length || 0} item(s)
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>

                  <CardActions
                    sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                  >
                    <ButtonGroup variant="outlined">
                      {nextStatus && nextStatus !== "delivered" && (
                        <Button
                          startIcon={
                            updating === order._id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <NextIcon />
                            )
                          }
                          onClick={() =>
                            handleStatusUpdate(order._id, nextStatus)
                          }
                          disabled={updating === order._id}
                        >
                          Mark as {getStatusLabel(nextStatus)}
                        </Button>
                      )}
                      {nextStatus === "delivered" && (
                        <Button
                          startIcon={<CompleteIcon />}
                          onClick={() => setCompletingOrder(order)}
                        >
                          Complete Delivery
                        </Button>
                      )}
                    </ButtonGroup>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Complete Delivery Dialog */}
      <Dialog
        open={!!completingOrder}
        onClose={() => setCompletingOrder(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Complete Delivery</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Confirm that you have delivered the order to the customer.
          </Typography>

          <TextField
            fullWidth
            label="Confirmation Code (Optional)"
            placeholder="e.g., 1234"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            sx={{ mt: 2 }}
          />

          <Alert severity="info" sx={{ mt: 2 }}>
            Location tracking will stop after delivery is confirmed.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompletingOrder(null)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<CompleteIcon />}
            onClick={handleCompleteOrder}
          >
            Confirm Delivery
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ActiveOrders;
