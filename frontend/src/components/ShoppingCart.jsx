import React from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  Badge,
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
} from "@mui/icons-material";

const ShoppingCart = ({
  open,
  onClose,
  cart,
  cartItems,
  onUpdateQuantity,
  onCheckout,
}) => {
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: "100%", sm: 400 } },
      }}
    >
      <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CartIcon color="primary" />
            <Typography variant="h6">Shopping Cart</Typography>
            <Badge badgeContent={totalItems} color="primary" />
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flexGrow: 1, overflow: "auto", p: 2 }}>
          {cartItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <CartIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Your cart is empty
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add some products to get started
              </Typography>
            </Box>
          ) : (
            <List>
              {cartItems.map((item, index) => (
                <React.Fragment key={item.product._id}>
                  <ListItem
                    sx={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 1,
                      py: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", width: "100%", gap: 2 }}>
                      <ListItemAvatar>
                        <Avatar
                          variant="rounded"
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          sx={{ width: 60, height: 60 }}
                        />
                      </ListItemAvatar>

                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">
                          {item.product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ₹{item.product.price} each
                        </Typography>
                        <Typography
                          variant="h6"
                          color="primary"
                          sx={{ mt: 0.5 }}
                        >
                          ₹{item.product.price * item.quantity}
                        </Typography>
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        mt: 1,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            onUpdateQuantity(item.product, item.quantity - 1)
                          }
                          color="primary"
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>

                        <Typography
                          variant="body1"
                          sx={{ minWidth: 30, textAlign: "center" }}
                        >
                          {item.quantity}
                        </Typography>

                        <IconButton
                          size="small"
                          onClick={() =>
                            onUpdateQuantity(item.product, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.product.stock}
                          color="primary"
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <IconButton
                        size="small"
                        onClick={() => onUpdateQuantity(item.product, 0)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>

                  {index < cartItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {cartItems.length > 0 && (
          <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
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
              onClick={onCheckout}
            >
              Proceed to Checkout
            </Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
export default ShoppingCart;
