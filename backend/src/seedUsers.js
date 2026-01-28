import axios from "axios";

const API_URL = "http://localhost:5000/api/auth/register";

const users = [
  {
    email: "admin@test.com",
    password: "password123",
    name: "Sys Admin",
    phone: "9999999998",
    role: "admin",
  },
  {
    email: "customer@test.com",
    password: "password123",
    name: "Demo Customer",
    phone: "9999999997",
    role: "customer",
  },
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

async function seed() {
  for (const user of users) {
    try {
      const res = await axios.post(API_URL, user);
      console.log(`✅ Seeded: ${user.email}`);
    } catch (err) {
      if (err.response?.status === 409) {
        console.log(`⚠️ Already exists: ${user.email}`);
      } else {
        console.error(
          `❌ Failed: ${user.email}`,
          err.response?.data || err.message,
        );
      }
    }
  }

  process.exit(0);
}

seed();
