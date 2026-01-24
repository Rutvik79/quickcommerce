import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "./models/Product.js";
import { User } from "./models/User.js";

dotenv.config();

// Sample products data
const products = [
  // Groceries
  {
    name: "Basmati Rice",
    description: "Premium quality long grain basmati rice, 5kg pack",
    price: 450,
    category: "groceries",
    imageUrl:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300",
    stock: 50,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 120,
  },
  {
    name: "Whole Wheat Flour",
    description: "Stone ground whole wheat flour, 10kg pack",
    price: 380,
    category: "groceries",
    imageUrl:
      "https://images.unsplash.com/photo-1628158879732-85d07f49ae1f?w=300",
    stock: 30,
    isAvailable: true,
    rating: 4.3,
    reviewCount: 85,
  },
  {
    name: "Organic Toor Dal",
    description: "Organic yellow split pigeon peas, 1kg",
    price: 150,
    category: "groceries",
    imageUrl:
      "https://images.unsplash.com/photo-1596040033229-a0b4a9f3a5f8?w=300",
    stock: 100,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 200,
  },

  // Food
  {
    name: "Pizza Margherita",
    description: "Fresh homemade pizza with mozzarella and basil",
    price: 350,
    category: "food",
    imageUrl:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300",
    stock: 20,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 450,
  },
  {
    name: "Chicken Biryani",
    description: "Authentic hyderabadi chicken biryani, serves 2",
    price: 450,
    category: "food",
    imageUrl:
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=300",
    stock: 15,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 550,
  },
  {
    name: "Paneer Butter Masala",
    description: "Creamy paneer curry with butter and spices",
    price: 280,
    category: "food",
    imageUrl:
      "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=300",
    stock: 25,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 320,
  },

  // Beverages
  {
    name: "Fresh Orange Juice",
    description: "Freshly squeezed orange juice, 500ml",
    price: 80,
    category: "beverages",
    imageUrl:
      "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300",
    stock: 40,
    isAvailable: true,
    rating: 4.4,
    reviewCount: 180,
  },
  {
    name: "Cold Coffee",
    description: "Chilled coffee with ice cream and chocolate",
    price: 120,
    category: "beverages",
    imageUrl:
      "https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=300",
    stock: 35,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 290,
  },
  {
    name: "Mango Lassi",
    description: "Traditional mango yogurt drink, 300ml",
    price: 90,
    category: "beverages",
    imageUrl:
      "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=300",
    stock: 50,
    isAvailable: true,
    rating: 4.8,
    reviewCount: 410,
  },

  // Household
  {
    name: "Dish Soap Liquid",
    description: "Lemon fresh dishwashing liquid, 1L",
    price: 150,
    category: "household",
    imageUrl:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300",
    stock: 60,
    isAvailable: true,
    rating: 4.2,
    reviewCount: 95,
  },
  {
    name: "Toilet Paper Roll",
    description: "Soft and strong toilet paper, pack of 12",
    price: 280,
    category: "household",
    imageUrl:
      "https://images.unsplash.com/photo-1584556326561-c8746083993b?w=300",
    stock: 80,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 150,
  },
  {
    name: "Laundry Detergent",
    description: "Concentrated laundry detergent, 2kg",
    price: 320,
    category: "household",
    imageUrl:
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=300",
    stock: 45,
    isAvailable: true,
    rating: 4.3,
    reviewCount: 110,
  },

  // Electronics
  {
    name: "Wireless Earbuds",
    description: "Bluetooth 5.0 wireless earbuds with charging case",
    price: 1999,
    category: "electronics",
    imageUrl:
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300",
    stock: 25,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 380,
  },
  {
    name: "Power Bank 10000mAh",
    description: "Fast charging portable power bank",
    price: 1299,
    category: "electronics",
    imageUrl:
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300",
    stock: 30,
    isAvailable: true,
    rating: 4.4,
    reviewCount: 220,
  },
  {
    name: "USB-C Cable",
    description: "Durable USB-C charging cable, 2m length",
    price: 299,
    category: "electronics",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300",
    stock: 100,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 540,
  },

  // Additional products
  {
    name: "Brown Bread",
    description: "Whole grain brown bread, 400g pack",
    price: 45,
    category: "groceries",
    imageUrl:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300",
    stock: 60,
    isAvailable: true,
    rating: 4.6,
    reviewCount: 175,
  },
  {
    name: "Fresh Milk",
    description: "Full cream fresh milk, 1L pack",
    price: 60,
    category: "beverages",
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300",
    stock: 70,
    isAvailable: true,
    rating: 4.7,
    reviewCount: 310,
  },
  {
    name: "Chocolate Cake",
    description: "Rich chocolate cake with ganache, 500g",
    price: 450,
    category: "food",
    imageUrl:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300",
    stock: 12,
    isAvailable: true,
    rating: 4.9,
    reviewCount: 625,
  },
  {
    name: "Hand Sanitizer",
    description: "Antibacterial hand sanitizer, 500ml",
    price: 120,
    category: "household",
    imageUrl:
      "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=300",
    stock: 90,
    isAvailable: true,
    rating: 4.5,
    reviewCount: 200,
  },
  {
    name: "Smartphone Stand",
    description: "Adjustable phone holder for desk",
    price: 399,
    category: "electronics",
    imageUrl:
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300",
    stock: 40,
    isAvailable: true,
    rating: 4.3,
    reviewCount: 145,
  },
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to mongodb");

    // clear existing products
    await Product.deleteMany({});
    console.log("Cleared existing products");

    // Insert sample products
    const createdProducts = await Product.insertMany(products);
    console.log(`Created ${createdProducts.length} products`);

    // Display summary
    console.log("\n Product Summary: ");
    const categories = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    categories.forEach((cat) => {
      console.log(`    ${cat._id}: ${cat.count} products`);
    });

    console.log("\n🎉 Database seeded successfully!");
    console.log("💡 You can now test the customer APIs\n");
  } catch (error) {
    console.error("Error seeding database", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();
