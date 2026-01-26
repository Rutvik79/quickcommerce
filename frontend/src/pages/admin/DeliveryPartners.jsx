import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Refresh as RefreshIcon,
  DirectionsBike as BikeIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useSocket } from "../../context/SocketContext";

const DeliveryPartners = () => {
  const { on } = useSocket();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [onlinePartners, setOnlinePartners] = useState(new Set());

  // Fetch delivery partners
  const fetchPartners = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (filter !== "all") params.isAvailable = filter === "available";

      const response = await axios.get("/api/admin/partners", {
        params,
      });
      setPartners(response.data.partners || []);
    } catch (error) {
      console.error("Failed to fetch partners:", error);
      setError("Failed to load delivery partners. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPartners();
  }, [filter]);

  // Listen for partner availability updates
  useEffect(() => {
    const unsubscribe = on("delivery:availability-update", (data) => {
      console.log("Partner availability updated:", data);

      setPartners((prev) =>
        prev.map((partner) =>
          partner._id === data.partnerId
            ? { ...partner, isAvailable: data.isAvailable }
            : partner,
        ),
      );
    });

    return unsubscribe;
  }, [on]);

  // Track online partners
  useEffect(() => {
    const unsubscribeConnect = on("user:connected", (data) => {
      if (data.role === "delivery") {
        setOnlinePartners((prev) => new Set([...prev, data.userId]));
      }
    });

    const unsubscribeDisconnect = on("user:disconnected", (data) => {
      if (data.role === "delivery") {
        setOnlinePartners((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [on]);

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      const res = await axios.get("/api/admin/online-users");
      setOnlinePartners(new Set(res.data.onlineUsers.deliveryPartners));
    };
    fetchOnlineUsers();
  }, []);

  const getVehicleIcon = (vehicleType) => {
    return <BikeIcon />;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h5">
          Delivery Partners ({partners.length})
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchPartners} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          select
          label="Filter by Status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="all">All Partners</MenuItem>
          <MenuItem value="available">Available Only</MenuItem>
          <MenuItem value="unavailable">Unavailable Only</MenuItem>
        </TextField>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Partners Grid */}
      {partners.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center" }}>
          <PersonIcon sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No delivery partners found
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {partners.map((partner) => {
            console.log(
              "onlinePartners because both of then are showing offline",
              onlinePartners,
            );
            const isOnline = onlinePartners.has(partner.user?._id);

            return (
              <Grid item xs={12} sm={6} md={4} key={partner._id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          mr: 2,
                          bgcolor: "primary.main",
                        }}
                      >
                        {partner.user?.name?.charAt(0) || "D"}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                          {partner.user?.name || "N/A"}
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {isOnline ? (
                            <Chip
                              icon={<ActiveIcon />}
                              label="Online"
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip
                              icon={<InactiveIcon />}
                              label="Offline"
                              color="default"
                              size="small"
                            />
                          )}
                          {partner.isAvailable && (
                            <Chip label="Available" color="info" size="small" />
                          )}
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        📞 {partner.user?.phone || "N/A"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        📧 {partner.user?.email || "N/A"}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        <Box
                          component="span"
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {getVehicleIcon(partner.vehicleType)}
                          {partner.vehicleType || "N/A"} -{" "}
                          {partner.vehicleNumber || "N/A"}
                        </Box>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        License: {partner.licenseNumber || "N/A"}
                      </Typography>
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
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Completed
                        </Typography>
                        <Typography variant="h6">
                          {partner.completedOrders || 0}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Earnings
                        </Typography>
                        <Typography variant="h6" color="primary">
                          ₹{partner.totalEarnings || 0}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Rating
                        </Typography>
                        <Typography variant="h6">
                          {partner.rating || 0} ⭐
                        </Typography>
                      </Box>
                    </Box>

                    {partner.isVerified ? (
                      <Chip
                        label="Verified"
                        color="success"
                        size="small"
                        sx={{ mt: 2 }}
                      />
                    ) : (
                      <Chip
                        label="Not Verified"
                        color="warning"
                        size="small"
                        sx={{ mt: 2 }}
                      />
                    )}

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      Joined: {formatDate(partner.createdAt)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
};

export default DeliveryPartners;
