import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";

const Register = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, user, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    // Delivery partner specific fields
    vehicleType: "",
    vehicleNumber: "",
    licenseNumber: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const routes = {
        customer: "/customer/dashboard",
        delivery: "/delivery/dashboard",
        admin: "/admin/dashboard",
      };
      navigate(routes[user.role] || "/", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setLocalError("");
    clearError();
  };

  const validateForm = () => {
    // Basic validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password
    ) {
      setLocalError("Please fill in all required fields");
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setLocalError("Please enter a valid email address");
      return false;
    }

    // Phone validation (basic)
    if (formData.phone.length < 10) {
      setLocalError("Please enter a valid phone number");
      return false;
    }

    // Password validation
    if (formData.password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return false;
    }

    // Password confirmation
    if (formData.password !== formData.confirmPassword) {
      setLocalError("Passwords do not match");
      return false;
    }

    // Delivery partner specific validation
    if (formData.role === "delivery") {
      if (
        !formData.vehicleType ||
        !formData.vehicleNumber ||
        !formData.licenseNumber
      ) {
        setLocalError("Please fill in all delivery partner details");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data based on role
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      };

      // Add delivery partner specific fields
      if (formData.role === "delivery") {
        userData.vehicleType = formData.vehicleType;
        userData.vehicleNumber = formData.vehicleNumber;
        userData.licenseNumber = formData.licenseNumber;
      }

      const result = await register(userData);

      if (result.success) {
        setSuccess(true);
        // Navigation is handled by useEffect
      } else {
        setLocalError(result.error || "Registration failed");
      }
    } catch (err) {
      setLocalError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          marginBottom: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Logo/Icon */}
          <Box
            sx={{
              backgroundColor: "primary.main",
              borderRadius: "50%",
              padding: 2,
              marginBottom: 2,
            }}
          >
            <PersonAddIcon sx={{ fontSize: 40, color: "white" }} />
          </Box>

          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Create Account
          </Typography>

          {displayError && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {displayError}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
              Registration successful! Redirecting...
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            {/* Role Selection */}
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-label">I am a</InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={formData.role}
                label="I am a"
                onChange={handleChange}
                disabled={loading}
              >
                <MenuItem value="customer">Customer</MenuItem>
                <MenuItem value="delivery">Delivery Partner</MenuItem>
              </Select>
            </FormControl>

            {/* Name */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Full Name"
              name="name"
              autoComplete="name"
              autoFocus
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />

            {/* Email */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />

            {/* Phone */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="phone"
              label="Phone Number"
              name="phone"
              autoComplete="tel"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />

            {/* Delivery Partner Fields */}
            <Collapse in={formData.role === "delivery"}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                <Select
                  labelId="vehicle-type-label"
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  label="Vehicle Type"
                  onChange={handleChange}
                  disabled={loading}
                  required={formData.role === "delivery"}
                >
                  <MenuItem value="bike">Bike</MenuItem>
                  <MenuItem value="scooter">Scooter</MenuItem>
                  <MenuItem value="bicycle">Bicycle</MenuItem>
                  <MenuItem value="car">Car</MenuItem>
                  <MenuItem value="van">Van</MenuItem>
                </Select>
              </FormControl>

              <TextField
                margin="normal"
                fullWidth
                id="vehicleNumber"
                label="Vehicle Number"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                disabled={loading}
                required={formData.role === "delivery"}
                placeholder="e.g., MH12AB1234"
              />

              <TextField
                margin="normal"
                fullWidth
                id="licenseNumber"
                label="License Number"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                disabled={loading}
                required={formData.role === "delivery"}
                placeholder="e.g., DL123456789"
              />
            </Collapse>

            {/* Password */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Confirm Password */}
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Sign Up"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2">
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{ textDecoration: "none", color: "#1976d2" }}
                >
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
