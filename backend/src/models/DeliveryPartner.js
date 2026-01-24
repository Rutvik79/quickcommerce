import mongoose from "mongoose";

export const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ["bike", "scooter", "bicycle", "car", "van"],
      required: [true, "Vehicle type is required"],
    },
    vehicleNumber: {
      type: String,
      required: [true, "Vehicle number is required"],
      trim: true,
      uppercase: true,
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      trim: true,
      uppercase: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      lat: {
        type: Number,
        default: 0,
      },
      lng: {
        type: Number,
        default: 0,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
    activeOrders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
      },
    ],
    statistics: {
      completedOrders: {
        type: Number,
        default: 0,
        min: 0,
      },
      cancelledOrders: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalEarnings: {
        type: Number,
        default: 0,
        min: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    workingHours: {
      start: {
        type: String,
        default: "09:00",
      },
      end: {
        type: String,
        default: "21:00",
      },
    },
    documents: {
      profilePhoto: String,
      licensePhoto: String,
      vehiclePhoto: String,
      aadharCard: String,
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      upiId: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relation: String,
    },
  },
  {
    timestamps: true,
  },
);

// deliveryPartnerSchema.index({ user: 1 });
deliveryPartnerSchema.index({ isAvailable: 1, isVerified: 1 });
deliveryPartnerSchema.index({
  "currentLocation.lat": 1,
  "currentLocation.lng": 1,
});

deliveryPartnerSchema.virtual("canAcceptOrders").get(function () {
  return this.isAvailable && this.isVerified && this.activeOrders.length < 3; // Max 3 active orders
});

deliveryPartnerSchema.methods.updateLocation = function (lat, lng) {
  this.currentLocation = {
    lat,
    lng,
    lastUpdated: new Date(),
  };
  return this.save();
};

deliveryPartnerSchema.methods.addActiveOrder = function (orderId) {
  if (!this.activeOrders.includes(orderId)) {
    this.activeOrders.push(orderId);
    if (this.activeOrders.length >= 3) {
      this.isAvailable = false;
    }
  }
  return this.save();
};

deliveryPartnerSchema.methods.removeActiveOrder = function (orderId) {
  this.activeOrders = this.activeOrders.filter(
    (id) => id.toString() !== orderId.toString(),
  );
  if (this.activeOrders.length < 3) {
    this.isAvailable = true;
  }
  return this.save();
};

deliveryPartnerSchema.methods.completeOrder = function (orderAmount) {
  this.statistics.completedOrders += 1;
  this.statistics.totalEarnings += orderAmount * 0.1;
  return this.save();
};

deliveryPartnerSchema.methods.updateRating = function (newRating) {
  const currentTotal =
    this.statistics.averageRating * this.statistics.totalRatings;
  this.statistics.totalRatings += 1;
  this.statistics.averageRating =
    (currentTotal + newRating) / this.statistics.totalRatings;
  return this.save();
};

deliveryPartnerSchema.statics.findNearby = async function (
  lat,
  lng,
  radiusInKm = 10,
) {
  // Simple distance calculation (for production, use geospatial queries)
  const partners = await this.find({
    isAvailable: true,
    isVerified: true,
  }).populate("user", "name phone");

  return partners.filter((partner) => {
    const distance = this.calculateDistance(
      lat,
      lng,
      partner.currentLocation.lat,
      partner.currentLocation.lng,
    );
    return distance <= radiusInKm;
  });
};

deliveryPartnerSchema.statics.calculateDistance = function (
  lat1,
  lng1,
  lat2,
  lng2,
) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const DeliveryPartner = mongoose.model(
  "DeliveryPartner",
  deliveryPartnerSchema,
);
