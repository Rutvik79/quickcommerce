import React, { useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Badge,
  IconButton,
  Box,
} from "@mui/material";
import {
  ShoppingCart as CartIcon,
  History as HistoryIcon,
  Logout as LogoutIcon,
  Home as HomeIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import ProductCatalog from "./ProductCatalog";
import Checkout from "./Checkout.jsx";
import OrderHistory from "./OrderHistory";
import OrderTracking from "./OrderTracking";
import ShoppingCart from "../../components/ShoppingCart";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);

  // Convert cart object to array for display
  const cartItems = Object.entries(cart)
    .filter(([_, quantity]) => quantity > 0)
    .map(([productId, quantity]) => {
      const product = cart[`${productId}_product`];
      return { product, quantity };
    });

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Add/update item in cart
  const handleAddToCart = (product, quantity) => {
    setCart((prev) => ({
      ...prev,
      [product._id]: quantity,
      [`${product._id}_product`]: product,
    }));
  };

  // Clear cart
  const handleClearCart = () => {
    setCart({});
  };

  // Navigate to checkout
  const handleCheckout = () => {
    setCartOpen(false);
    navigate("/customer/checkout");
  };

  // After order placed
  const handleOrderPlaced = () => {
    handleClearCart();
    navigate("/customer/orders");
  };

  // Back to products
  const handleBackToProducts = () => {
    navigate("/customer/dashboard");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* App Bar */}
      <AppBar position="sticky">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            QuickCommerce
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

            {/* Navigation Buttons */}
            <Button
              color="inherit"
              startIcon={<HomeIcon />}
              onClick={() => navigate("/customer/dashboard")}
            >
              Products
            </Button>

            <Button
              color="inherit"
              startIcon={<HistoryIcon />}
              onClick={() => navigate("/customer/orders")}
            >
              Orders
            </Button>

            {/* Cart Button */}
            <IconButton color="inherit" onClick={() => setCartOpen(true)}>
              <Badge badgeContent={totalItems} color="error">
                <CartIcon />
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

      {/* Main Content */}
      <Box component="main">
        <Routes>
          <Route
            path="/"
            element={
              <ProductCatalog onAddToCart={handleAddToCart} cart={cart} />
            }
          />
          <Route
            path="dashboard"
            element={
              <ProductCatalog onAddToCart={handleAddToCart} cart={cart} />
            }
          />
          <Route
            path="checkout"
            element={
              <Checkout
                cartItems={cartItems}
                onOrderPlaced={handleOrderPlaced}
              />
            }
          />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orders/:orderId" element={<OrderTracking />} />
          <Route
            path="*"
            element={<Navigate to="/customer/dashboard" replace />}
          />
        </Routes>
      </Box>

      {/* Shopping Cart Drawer */}
      <ShoppingCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        cartItems={cartItems}
        onUpdateQuantity={handleAddToCart}
        onCheckout={handleCheckout}
      />
    </Box>
  );
};

export default CustomerDashboard;
