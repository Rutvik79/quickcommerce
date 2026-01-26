import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from "@mui/icons-material";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const from =
        location.state?.from?.pathname || getDashboardRoute(user.role);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  // Clear errors on unmount
  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const getDashboardRoute = (role) => {
    const routes = {
      customer: "/customer/dashboard",
      delivery: "/delivery/dashboard",
      admin: "/admin/dashboard",
    };
    return routes[role] || "/";
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setLocalError("");
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    clearError();

    // Validation
    if (!formData.email || !formData.password) {
      setLocalError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Navigation is handled by useEffect
        console.log("Login successful");
      } else {
        setLocalError(result.error || "Login failed");
      }
    } catch (err) {
      setLocalError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || error;

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
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
            <LoginIcon sx={{ fontSize: 40, color: "white" }} />
          </Box>

          <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
            Sign In
          </Typography>

          {displayError && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {displayError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
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

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Sign In"}
            </Button>

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  style={{ textDecoration: "none", color: "#1976d2" }}
                >
                  Sign Up
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Demo Credentials */}
        <Paper elevation={1} sx={{ mt: 3, p: 2, width: "100%" }}>
          <Typography variant="subtitle2" gutterBottom>
            Demo Credentials:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Customer:</strong> customer@test.com / password123
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Delivery:</strong> delivery@test.com / password123
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Admin:</strong> admin@test.com / password123
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
