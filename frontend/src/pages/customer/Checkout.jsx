import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from "@mui/material";
import {
  ArrowBack as BackIcon,
  ShoppingCart as CartIcon,
} from "@mui/icons-material";
import axios from "axios";

const Checkout = ({ cartItems, onOrderPlaced }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
    landmark: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("cash");

  const handleAddressChange = (field, value) => {
    setDeliveryAddress((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  };

  const validateForm = () => {
    if (
      !deliveryAddress.street ||
      !deliveryAddress.city ||
      !deliveryAddress.state ||
      !deliveryAddress.zipCode
    ) {
      setError("Please fill in all required address fields");
      return false;
    }

    if (deliveryAddress.zipCode.length < 5) {
      setError("Please enter a valid ZIP code");
      return false;
    }

    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const orderData = {
        items: cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          street: deliveryAddress.street,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          zipCode: deliveryAddress.zipCode,
          landmark: deliveryAddress.landmark || undefined,
        },
        paymentMethod,
      };

      const response = await axios.post("/api/customer/orders", orderData);

      setSuccess(true);
      onOrderPlaced();

      // Redirect to order tracking after 2 seconds
      setTimeout(() => {
        navigate("/customer/orders");
      }, 2000);
    } catch (error) {
      console.error("Order placement failed:", error);
      setError(
        error.response?.data?.message ||
          "Failed to place order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h4" color="success.main" gutterBottom>
            Order Placed Successfully! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your order has been placed and is being processed.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Redirecting to orders page...
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate("/customer/dashboard")}
        sx={{ mb: 3 }}
      >
        Back to Products
      </Button>

      <Typography variant="h4" gutterBottom>
        Checkout
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Delivery Address */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Delivery Address
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="Street Address"
                  value={deliveryAddress.street}
                  onChange={(e) =>
                    handleAddressChange("street", e.target.value)
                  }
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="City"
                  value={deliveryAddress.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="State"
                  value={deliveryAddress.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="ZIP Code"
                  value={deliveryAddress.zipCode}
                  onChange={(e) =>
                    handleAddressChange("zipCode", e.target.value)
                  }
                  disabled={loading}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Landmark (Optional)"
                  value={deliveryAddress.landmark}
                  onChange={(e) =>
                    handleAddressChange("landmark", e.target.value)
                  }
                  disabled={loading}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Payment Method */}
          <Paper sx={{ p: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Payment Method</FormLabel>
              <RadioGroup
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <FormControlLabel
                  value="cash"
                  control={<Radio />}
                  label="Cash on Delivery"
                  disabled={loading}
                />
                <FormControlLabel
                  value="card"
                  control={<Radio />}
                  label="Card (Coming Soon)"
                  disabled
                />
                <FormControlLabel
                  value="upi"
                  control={<Radio />}
                  label="UPI (Coming Soon)"
                  disabled
                />
              </RadioGroup>
            </FormControl>
          </Paper>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, position: "sticky", top: 20 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>

            <List>
              {cartItems.map((item, index) => (
                <React.Fragment key={item.product._id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={item.product.name}
                      secondary={`Qty: ${item.quantity} × ₹${item.product.price}`}
                    />
                    <Typography variant="body1">
                      ₹{item.product.price * item.quantity}
                    </Typography>
                  </ListItem>
                  {index < cartItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">
                ₹{calculateTotal().toFixed(2)}
              </Typography>
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body1">Delivery Fee:</Typography>
              <Typography variant="body1" color="success.main">
                FREE
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}
            >
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                ₹{calculateTotal().toFixed(2)}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handlePlaceOrder}
              disabled={loading || cartItems.length === 0}
              startIcon={
                loading ? <CircularProgress size={20} /> : <CartIcon />
              }
            >
              {loading ? "Placing Order..." : "Place Order"}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Checkout;
