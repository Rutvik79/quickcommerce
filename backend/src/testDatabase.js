import mongoose from "mongoose";
import dotenv from "dotenv";

// Load env varibles
dotenv.config();

import { DeliveryPartner } from "./models/DeliveryPartner.js";
import { Order } from "./models/Order.js";
import { Product } from "./models/Product.js";
import { User } from "./models/User.js";

async function testDatabaseConnection() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected Sucessfully!");
    console.log(`Database: ${mongoose.connection.name}`);

    // test creating simple user
    console.log(`\n Testing User Model...`);
    const testUser = new User({
      email: "test@example.com",
      password: "testpassword123",
      name: "Test user",
      phone: "1234567890",
      role: "customer",
    });

    await testUser.validate();
    console.log(`User model validation successful`);

    // test product mode
    console.log(`\n Testing Product Model...`);
    const testProduct = new Product({
      name: "Test Product",
      description: "This is a test product",
      price: 99.99,
      category: "groceries",
      stock: 10,
    });

    await testProduct.validate();
    console.log(" Product model validation successful");

    // test order model
    console.log(`\n testing order model...`);
    const testOrder = new Order({
      customer: new mongoose.Types.ObjectId(),
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          productName: "Test Product",
          quantity: 2,
          price: 99.99,
        },
      ],
      totalAmount: 199.98,
      deliveryAddress: {
        street: "123 Test St",
        city: "Test City",
        state: "Test State",
        zipCode: "12345",
      },
    });

    await testOrder.validate();
    console.log("Order model validadtion sucessful");

    // test delivery partner
    console.log("Testing Delivery Partner model...");
    const testPartner = new DeliveryPartner({
      user: new mongoose.Types.ObjectId(),
      vehicleType: "bike",
      vehicleNumber: "TEST1234",
      licenseNumber: "DL123456",
    });

    await testPartner.validate();
    console.log("DeliveryPartner model validation successfull ");

    // list all collections
    console.log("\n Avaliable Collections: ");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });

    console.log(`\n All database test passed`);
    console.log(`Database is ready for use.`);
  } catch (error) {
    console.error("\n Database Test Failed");
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("\n Database connection closed");
    process.exit(0);
  }
}

testDatabaseConnection();
