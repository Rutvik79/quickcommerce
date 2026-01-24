import mongoose from "mongoose";

export const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      required: [true, "Product category is required"],
      enum: [
        "groceries",
        "electronics",
        "food",
        "beverages",
        "household",
        "other",
      ],
      default: "other",
    },
    imageUrl: {
      type: String,
      default: "https://via.placeholder.com/300x300?text=Product+Image",
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for better query performance
productSchema.index({ category: 1 });
productSchema.index({ isAvailable: 1 });
productSchema.index({ name: "text", description: "text" });

// Virtual to check if product is in stock
productSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// method to decrease stock
productSchema.methods.decreaseStock = function (quantity) {
  if (this.stock >= quantity) {
    this.stock -= quantity;
    if (this.stock == 0) {
      this.isAvailable = false;
    }
    return true;
  }

  return false;
};

// method to increase stock
productSchema.methods.increaseStock = function (quantity) {
  this.stock += quantity;
  if (this.stock > 0) {
    this.isAvailable = true;
  }
};

export const Product = mongoose.model("Product", productSchema);
