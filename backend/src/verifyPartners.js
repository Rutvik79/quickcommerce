import mongoose from "mongoose";
import dotenv from "dotenv";
import { DeliveryPartner } from "./models/DeliveryPartner.js";
import { User } from "./models/User.js";

dotenv.config();

// Script to verify all delivery partners for testing purposes
const verifyAllPartners = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Find all delivery partners
    const partners = await DeliveryPartner.find({});

    if (partners.length === 0) {
      console.log("No delivery partners found");
      console.log("Register a delivery partner first using the auth API");
      return;
    }

    // Verify all partners
    const updateResult = await DeliveryPartner.updateMany(
      {},
      {
        $set: {
          isVerified: true,
          isAvailable: true,
        },
      },
    );

    console.log(`Verified ${updateResult.modifiedCount} delivery partners`);

    // Display all delivery partners
    console.log(`\n Delivery partners`);
    for (const partner of partners) {
      const user = await User.findById(partner.user);
      console.log(`    -${user.name} (${user.email})`);
      console.log(
        `      Vehicle: ${partner.vehicleType} - ${partner.vehicleNumber}`,
      );
      console.log(`    Verified: YES | Available: YES`);
    }

    console.log(`\n All delivery partners are now verified and available`);
  } catch (error) {
    console.error("Error: ", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n Database connection closed");
    process.exit(0);
  }
};

// Run the script
verifyAllPartners();
