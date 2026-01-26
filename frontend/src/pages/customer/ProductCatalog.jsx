import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  MenuItem,
  Box,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ShoppingCart as CartIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import axios from "axios";

const ProductCatalog = ({ onAddToCart, cart = {} }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    inStock: "all",
  });
  const [categories, setCategories] = useState([]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get("/api/customer/categories");
        // console.log("Product categories missing", response.data);
        setCategories(response.data.categoriesWithCount || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {};
        if (filters.category) params.category = filters.category;
        if (filters.search) params.search = filters.search;
        if (filters.inStock === "true") params.inStock = "true";

        const response = await axios.get("/api/customer/products", { params });
        setProducts(response.data.products || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setError("Failed to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchInput,
      }));
    }, 400); // 400ms debounce

    return () => clearTimeout(delay);
  }, [searchInput]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const getCartQuantity = (productId) => {
    return cart[productId] || 0;
  };

  const handleQuantityChange = (product, change) => {
    const currentQty = getCartQuantity(product._id);
    const newQty = currentQty + change;

    if (newQty < 0) return;
    if (newQty > product.stock) {
      alert(`Only ${product.stock} items available`);
      return;
    }

    onAddToCart(product, newQty);
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
      {/* Filters */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Category"
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  minWidth: 150,
                },
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Availability"
              value={filters.inStock}
              onChange={(e) => handleFilterChange("inStock", e.target.value)}
            >
              <MenuItem value="all">All Products</MenuItem>
              <MenuItem value="true">In Stock Only</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Product Grid */}
      <Grid container spacing={3}>
        {products.length === 0 ? (
          <Grid item xs={12}>
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                No products found
              </Typography>
            </Box>
          </Grid>
        ) : (
          products.map((product) => {
            const cartQty = getCartQuantity(product._id);

            return (
              <Grid item xs={12} sm={6} md={4} key={product._id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={
                      product.imageUrl ||
                      "https://via.placeholder.com/300x200?text=No+Image"
                    }
                    alt={product.name}
                    sx={{ objectFit: "cover" }}
                  />

                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h6" component="h2">
                      {product.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      {product.description}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" color="primary">
                        ₹{product.price}
                      </Typography>
                      <Chip
                        label={product.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {product.isAvailable && product.stock > 0 ? (
                        <Chip
                          label={`${product.stock} in stock`}
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Chip label="Out of stock" size="small" color="error" />
                      )}
                      {product.rating > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          ⭐ {product.rating.toFixed(1)}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>

                  <CardActions
                    sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                  >
                    {cartQty === 0 ? (
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<CartIcon />}
                        onClick={() => handleQuantityChange(product, 1)}
                        disabled={!product.isAvailable || product.stock === 0}
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                          justifyContent: "space-between",
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(product, -1)}
                          color="primary"
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography variant="h6">{cartQty}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleQuantityChange(product, 1)}
                          disabled={cartQty >= product.stock}
                          color="primary"
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>
    </Container>
  );
};

export default ProductCatalog;
