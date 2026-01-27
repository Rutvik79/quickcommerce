import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "./models/User.js";

dotenv.config();

const users = [
  // Admin
  {
    email: "admin@test.com",
    password: "password123",
    name: "Sys Admin",
    phone: "9999999998",
    role: "admin",
  },

  // Customer
  {
    email: "customer@test.com",
    password: "password123",
    name: "Demo Customer",
    phone: "9999999997",
    role: "customer",
  },

  // Delivery Partner
  {
    email: "delivery@test.com",
    password: "password123",
    name: "Delivery Agent",
    phone: "9999999996",
    role: "delivery",
    vehicleType: "bike",
    vehicleNumber: "MH12AB1234",
    licenseNumber: "DL123456789",
  },
];

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });

      if (existing) {
        console.log(`⚠️  User already exists: ${userData.email}`);
        continue;
      }

      const user = new User(userData);
      await user.save();

      console.log(`✅ Created ${user.role}: ${user.email}`);
    }

    console.log("\n🎉 User seeding completed");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

seedUsers();
