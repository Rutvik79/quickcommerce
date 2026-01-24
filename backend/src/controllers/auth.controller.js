import { User } from "../models/User.js";
import { DeliveryPartner } from "../models/DeliveryPartner.js";
import { generateAuthToken } from "../utils/jwt.js";

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      phone,
      role,
      vehicleType,
      vehicleNumber,
      licenseNumber,
    } = req.body;

    // Validate required fields
    if (!email || !password || !name || !phone) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required fields: email, password, name, phone",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      phone,
      role: role || "customer",
    });

    // If delivery partner, create delivery partner profile
    if (user.role === "delivery") {
      if (!vehicleType || !vehicleNumber || !licenseNumber) {
        // Delete user if delivery partner info is missing
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message:
            "Delivery partners must provide: vehicleType, vehicleNumber, licenseNumber",
        });
      }

      await DeliveryPartner.create({
        user: user._id,
        vehicleType,
        vehicleNumber,
        licenseNumber,
      });
    }

    // Generate JWT token
    const token = generateAuthToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error: ", error);
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        messsage: "User with this email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // find user and include password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        sucesss: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact support",
      });
    }

    // compare password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = generateAuthToken(user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // if delivery partner get their profile too
    let deliveryProfile = null;
    if (user.role === "delivery") {
      deliveryProfile = await DeliveryPartner.findOne({ user: user._id });
    }

    res.status(200).json({
      sucesss: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        ...(deliveryProfile && { deliveryProfile }),
      },
    });
  } catch (error) {
    console.error("Get me Error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching user data",
      error: error.message,
    });
  }
};

// @desc    Refresh JWT token
// @route   POST /api/auth/refresh
// @access  Private
export const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate new token
    const token = generateAuthToken(user);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      token,
    });
  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({
      success: false,
      message: "Error refreshing token",
      error: error.message,
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // in stateless jwt system, logout is handled at client-side
    // this endpoint is mainly for logging purpose
    res.status(200).json({
      success: true,
      message: "Logout successful. Please remove token from client",
    });
  } catch (error) {
    console.error("Logout error: ", error);
    res.status(500).json({
      success: false,
      message: "Error Logging out",
      error: error.message,
    });
  }
};
