import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ShoppingBag as OrderIcon,
  CheckCircle as AcceptIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

const AvailableOrders = () => {
  const { on, emit } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch available orders
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get("/api/delivery/orders/available");
        setOrders(response.data.orders || []);
      } catch (error) {
        console.error("Failed to fetch available orders:", error);
        setError("Failed to load available orders. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Listen for new orders in real-time
  useEffect(() => {
    const unsubscribeCreated = on("order:created", (data) => {
      console.log("New order available:", data);

      // Add new order to the list
      setOrders((prev) => [data.order, ...prev]);
    });

    const unsubscribeNoLonger = on("order:no-longer-available", (data) => {
      console.log("Order no longer available:", data);

      // Remove order from list
      setOrders((prev) => prev.filter((order) => order._id !== data.orderId));
    });

    return () => {
      unsubscribeCreated();
      unsubscribeNoLonger();
    };
  }, [on]);

  const handleAcceptOrder = (orderId) => {
    setAccepting(orderId);

    // Emit WebSocket event to accept order
    emit("order:accept", { orderId });

    // Listen for acceptance result
    const handleSuccess = on("order:accepted-success", (data) => {
      if (data.orderId === orderId) {
        console.log("Order accepted successfully:", data);

        // Remove from available orders
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
        setAccepting(null);
        setSelectedOrder(null);

        // Show success
        alert("Order accepted successfully! Check Active Orders tab.");
      }
    });

    const handleFailed = on("order:accept-failed", (data) => {
      if (data.orderId === orderId) {
        console.log("Order acceptance failed:", data);
        setAccepting(null);

        // Show error
        alert(
          data.message ||
            "Failed to accept order. It may have been taken by another partner.",
        );

        // Remove from list if already assigned
        if (data.reason === "already-assigned") {
          setOrders((prev) => prev.filter((order) => order._id !== orderId));
        }
      }
    });

    // Cleanup listeners after 5 seconds
    setTimeout(() => {
      handleSuccess();
      handleFailed();
      if (accepting === orderId) {
        setAccepting(null);
      }
    }, 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDistance = (order) => {
    // Placeholder - in real app, calculate distance based on location
    return "2.5 km";
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
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="h5"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <OrderIcon />
          Available Orders ({orders.length})
        </Typography>
        <Chip
          label="🔴 Live"
          color="error"
          size="small"
          sx={{ animation: "pulse 2s infinite" }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {orders.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center" }}>
          <OrderIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Available Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            New orders will appear here in real-time
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {orders.map((order) => (
            <Grid item xs={12} md={6} key={order._id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6">
                      Order #{order._id.slice(-8)}
                    </Typography>
                    <Chip
                      label={`₹${order.totalAmount}`}
                      color="success"
                      size="small"
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(order.createdAt)}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatDistance(order)} away
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Delivery Address:
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {order.deliveryAddress.street}, {order.deliveryAddress.city}
                    <br />
                    {order.deliveryAddress.state} -{" "}
                    {order.deliveryAddress.zipCode}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom>
                    Items: {order.items?.length || 0}
                  </Typography>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setSelectedOrder(order)}
                    sx={{ mr: 1 }}
                  >
                    View Details
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={
                      accepting === order._id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <AcceptIcon />
                      )
                    }
                    onClick={() => handleAcceptOrder(order._id)}
                    disabled={accepting === order._id}
                  >
                    {accepting === order._id ? "Accepting..." : "Accept"}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Order Details Dialog */}
      <Dialog
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>Order #{selectedOrder._id.slice(-8)}</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Customer:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrder.customer?.name || "Customer"}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Delivery Address:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrder.deliveryAddress.street}
                  <br />
                  {selectedOrder.deliveryAddress.city},{" "}
                  {selectedOrder.deliveryAddress.state} -{" "}
                  {selectedOrder.deliveryAddress.zipCode}
                  {selectedOrder.deliveryAddress.landmark && (
                    <>
                      <br />
                      Landmark: {selectedOrder.deliveryAddress.landmark}
                    </>
                  )}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Order Items:
                </Typography>
                <List dense>
                  {selectedOrder.items?.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={`${item.productName || "Product"} × ${item.quantity}`}
                        secondary={`₹${item.price} each`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  pt: 2,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="h6">Total:</Typography>
                <Typography variant="h6" color="primary">
                  ₹{selectedOrder.totalAmount}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedOrder(null)}>Close</Button>
              <Button
                variant="contained"
                startIcon={<AcceptIcon />}
                onClick={() => {
                  handleAcceptOrder(selectedOrder._id);
                  setSelectedOrder(null);
                }}
                disabled={accepting === selectedOrder._id}
              >
                Accept Order
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AvailableOrders;
