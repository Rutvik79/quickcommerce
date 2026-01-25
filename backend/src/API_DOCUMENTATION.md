QuickCommerce API Documentation
Base URL
http://localhost:5000
Table of Contents

Authentication
Customer APIs
Delivery Partner APIs
Admin APIs
Health Check


Authentication
Register User
POST /api/auth/register
Request Body:
json{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "1234567890",
  "role": "customer", // "customer" | "delivery" | "admin"
  
  // Required for role="delivery" only
  "vehicleType": "bike", // "bike" | "scooter" | "bicycle" | "car" | "van"
  "vehicleNumber": "MH12AB1234",
  "licenseNumber": "DL123456789"
}
Response (201):
json{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "1234567890",
    "role": "customer"
  }
}

Login
POST /api/auth/login
Request Body:
json{
  "email": "user@example.com",
  "password": "password123"
}
Response (200):
json{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer"
  }
}

Get Current User
GET /api/auth/me
Headers:
Authorization: Bearer <token>
Response (200):
json{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "customer",
    "isActive": true,
    "createdAt": "2026-01-24T..."
  }
}

Refresh Token
POST /api/auth/refresh
Headers:
Authorization: Bearer <token>
Response (200):
json{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "new_jwt_token"
}

Logout
POST /api/auth/logout
Headers:
Authorization: Bearer <token>
Response (200):
json{
  "success": true,
  "message": "Logout successful. Please remove token from client."
}

Customer APIs
Get Products
GET /api/customer/products
Query Parameters:

category (optional): Filter by category
search (optional): Search in name/description
minPrice (optional): Minimum price
maxPrice (optional): Maximum price
inStock (optional): Only in-stock products (true/false)
page (optional): Page number (default: 1)
limit (optional): Items per page (default: 20)

Response (200):
json{
  "success": true,
  "count": 20,
  "total": 100,
  "page": 1,
  "pages": 5,
  "products": [
    {
      "_id": "product_id",
      "name": "Basmati Rice",
      "description": "Premium quality rice",
      "price": 450,
      "category": "groceries",
      "imageUrl": "https://...",
      "stock": 50,
      "isAvailable": true,
      "rating": 4.5,
      "reviewCount": 120
    }
  ]
}

Get Single Product
GET /api/customer/products/:id
Response (200):
json{
  "success": true,
  "product": {
    "_id": "product_id",
    "name": "Basmati Rice",
    "description": "Premium quality rice",
    "price": 450,
    "category": "groceries",
    "stock": 50
  }
}

Get Categories
GET /api/customer/categories
Response (200):
json{
  "success": true,
  "categories": ["groceries", "food", "beverages", "household", "electronics"],
  "categoriesWithCount": [
    { "name": "groceries", "count": 25 },
    { "name": "food", "count": 30 }
  ]
}

Place Order
POST /api/customer/orders
Headers:
Authorization: Bearer <customer_token>
Request Body:
json{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2
    }
  ],
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zipCode": "400001",
    "coordinates": {
      "lat": 19.0760,
      "lng": 72.8777
    }
  },
  "paymentMethod": "cash" // "cash" | "card" | "upi" | "wallet"
}
Response (201):
json{
  "success": true,
  "message": "Order placed successfully",
  "order": {
    "_id": "order_id",
    "customer": "customer_id",
    "items": [...],
    "totalAmount": 900,
    "status": "pending",
    "estimatedDeliveryTime": "2026-01-24T12:30:00Z"
  }
}

Get My Orders
GET /api/customer/orders
Headers:
Authorization: Bearer <customer_token>
Query Parameters:

status (optional): Filter by status
page (optional): Page number
limit (optional): Items per page

Response (200):
json{
  "success": true,
  "count": 5,
  "total": 10,
  "page": 1,
  "pages": 2,
  "orders": [...]
}


Get Order Details
GET /api/customer/orders/:id
Headers:
Authorization: Bearer <customer_token>
Response (200):
json{
  "success": true,
  "order": {
    "_id": "order_id",
    "customer": {...},
    "deliveryPartner": {...},
    "items": [...],
    "totalAmount": 900,
    "status": "pending",
    "deliveryAddress": {...},
    "statusHistory": [...]
  }
}

Cancel Order
DELETE /api/customer/orders/:id
Headers:
Authorization: Bearer <customer_token>
Request Body:
json{
  "reason": "Changed my mind"
}
Response (200):
json{
  "success": true,
  "message": "Order cancelled successfully",
  "order": {
    "status": "cancelled",
    "cancellationReason": "Changed my mind"
  }
}

Delivery Partner APIs
Get Profile
GET /api/delivery/profile
Headers:
Authorization: Bearer <delivery_token>
Response (200):
json{
  "success": true,
  "profile": {
    "_id": "partner_id",
    "user": {...},
    "vehicleType": "bike",
    "vehicleNumber": "MH12AB1234",
    "isVerified": true,
    "isAvailable": true,
    "currentLocation": {...},
    "activeOrders": [],
    "statistics": {
      "completedOrders": 10,
      "totalEarnings": 1500,
      "averageRating": 4.5
    }
  }
}

Get Available Orders
GET /api/delivery/orders/available
Headers:
Authorization: Bearer <delivery_token>
Query Parameters:

city (optional): Filter by city
minAmount (optional): Minimum order amount
maxAmount (optional): Maximum order amount
page (optional): Page number
limit (optional): Items per page

Response (200):
json{
  "success": true,
  "count": 5,
  "total": 10,
  "partnerStatus": {
    "isAvailable": true,
    "activeOrdersCount": 1,
    "canAcceptMore": true
  },
  "orders": [...]
}

Accept Order
POST /api/delivery/orders/:id/accept
Headers:
Authorization: Bearer <delivery_token>
Response (200):
json{
  "success": true,
  "message": "Order accepted successfully",
  "order": {
    "_id": "order_id",
    "status": "accepted",
    "deliveryPartner": "partner_id",
    ...
  }
}

Update Order Status
PATCH /api/delivery/orders/:id/status
Headers:
Authorization: Bearer <delivery_token>
Request Body:
json{
  "status": "picked_up", // "picked_up" | "on_the_way" | "delivered"
  "note": "Package picked up from store"
}
Response (200):
json{
  "success": true,
  "message": "Order status updated to picked_up",
  "order": {
    "status": "picked_up",
    "statusHistory": [...]
  }
}

Get Active Orders
GET /api/delivery/orders/active
Headers:
Authorization: Bearer <delivery_token>
Response (200):
json{
  "success": true,
  "count": 2,
  "statistics": {
    "completedOrders": 10,
    "totalEarnings": 1500
  },
  "orders": [...]
}

Get All Orders
GET /api/delivery/orders
Headers:
Authorization: Bearer <delivery_token>
Query Parameters:

status (optional): Filter by status
page (optional): Page number
limit (optional): Items per page

Response (200):
json{
  "success": true,
  "count": 15,
  "total": 30,
  "orders": [...]
}


Update Location
PATCH /api/delivery/location
Headers:
Authorization: Bearer <delivery_token>
Request Body:
json{
  "lat": 19.0760,
  "lng": 72.8777
}
Response (200):
json{
  "success": true,
  "message": "Location updated successfully",
  "location": {
    "lat": 19.0760,
    "lng": 72.8777,
    "lastUpdated": "2026-01-24T12:00:00Z"
  }
}

Update Availability
PATCH /api/delivery/availability
Headers:
Authorization: Bearer <delivery_token>
Request Body:
json{
  "isAvailable": true // true | false
}
Response (200):
json{
  "success": true,
  "message": "Availability updated to available",
  "isAvailable": true
}

Admin APIs
Get Dashboard
GET /api/admin/dashboard
Headers:
Authorization: Bearer <admin_token>
Response (200):
json{
  "success": true,
  "dashboard": {
    "today": {
      "orders": 25,
      "revenue": 15000
    },
    "active": {
      "totalActiveOrders": 10,
      "pendingOrders": 5,
      "ongoingDeliveries": 3,
      "availablePartners": 8
    },
    "totals": {
      "totalOrders": 500,
      "totalCustomers": 100,
      "totalPartners": 20,
      "totalProducts": 150
    },
    "recentOrders": [...]
  }
}

Get Statistics
GET /api/admin/statistics
Headers:
Authorization: Bearer <admin_token>
Query Parameters:

startDate (optional): Start date (YYYY-MM-DD)
endDate (optional): End date (YYYY-MM-DD)

Response (200):
json{
  "success": true,
  "statistics": {
    "orders": {
      "total": 500,
      "byStatus": [...],
      "totalRevenue": 250000,
      "averageOrderValue": 500,
      "last24Hours": 25,
      "deliveredLast24Hours": 20
    },
    "users": {
      "totalCustomers": 100,
      "totalDeliveryPartners": 20,
      "verifiedPartners": 15,
      "availablePartners": 10
    },
    "products": {
      "total": 150,
      "available": 140,
      "outOfStock": 10
    },
    "topProducts": [...],
    "topPartners": [...],
    "peakHours": [...]
  },
  "dateRange": {
    "start": "2025-12-25",
    "end": "2026-01-24"
  }
}

Get All Orders
GET /api/admin/orders
Headers:
Authorization: Bearer <admin_token>
Query Parameters:

status (optional): Filter by status
customerId (optional): Filter by customer
partnerId (optional): Filter by delivery partner
city (optional): Filter by city
startDate (optional): Filter by start date
endDate (optional): Filter by end date
minAmount (optional): Minimum order amount
maxAmount (optional): Maximum order amount
page (optional): Page number
limit (optional): Items per page

Response (200):
json{
  "success": true,
  "count": 20,
  "total": 500,
  "page": 1,
  "pages": 25,
  "orders": [...]
}

Get Order by ID
GET /api/admin/orders/:id
Headers:
Authorization: Bearer <admin_token>
Response (200):
json{
  "success": true,
  "order": {
    "_id": "order_id",
    "customer": {...},
    "deliveryPartner": {...},
    "items": [...],
    "totalAmount": 900,
    "status": "delivered",
    "statusHistory": [...]
  }
}

Update Order Status (Admin Override)
PATCH /api/admin/orders/:id
Headers:
Authorization: Bearer <admin_token>
Request Body:
json{
  "status": "cancelled", // Any valid status
  "note": "Admin cancelled order due to customer request"
}
Response (200):
json{
  "success": true,
  "message": "Order status updated to cancelled",
  "order": {...}
}

Get All Delivery Partners
GET /api/admin/partners
Headers:
Authorization: Bearer <admin_token>
Query Parameters:

isVerified (optional): Filter by verification status
isAvailable (optional): Filter by availability
vehicleType (optional): Filter by vehicle type
minRating (optional): Minimum rating
page (optional): Page number
limit (optional): Items per page

Response (200):
json{
  "success": true,
  "count": 10,
  "total": 20,
  "partners": [...]
}

Get Partner by ID
GET /api/admin/partners/:id
Headers:
Authorization: Bearer <admin_token>
Response (200):
json{
  "success": true,
  "partner": {
    "_id": "partner_id",
    "user": {...},
    "vehicleType": "bike",
    "statistics": {...},
    "activeOrders": [...]
  },
  "recentOrders": [...]
}

Verify/Unverify Partner
PATCH /api/admin/partners/:id/verify
Headers:
Authorization: Bearer <admin_token>
Request Body:
json{
  "isVerified": true // true | false
}
Response (200):
json{
  "success": true,
  "message": "Delivery partner verified successfully",
  "partner": {...}
}


Get All Users
GET /api/admin/users
Headers:
Authorization: Bearer <admin_token>
Query Parameters:

role (optional): Filter by role
isActive (optional): Filter by active status
search (optional): Search by name/email/phone
page (optional): Page number
limit (optional): Items per page

Response (200):
json{
  "success": true,
  "count": 50,
  "total": 120,
  "users": [...]
}

Delete User (Soft Delete)
DELETE /api/admin/users/:id
Headers:
Authorization: Bearer <admin_token>
Response (200):
json{
  "success": true,
  "message": "User deactivated successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "isActive": false
  }
}

Health Check
Check Server Health
GET /health
Response (200):
json{
  "status": "HEALTHY",
  "uptime": 3600.5,
  "message": "OK",
  "timestamp": 1706123456789,
  "environment": "development",
  "database": "connected",
  "version": "1.0.0"
}

Error Responses
400 Bad Request
json{
  "success": false,
  "message": "Validation error message"
}
401 Unauthorized
json{
  "success": false,
  "message": "Not authorized. Please login to access this resource."
}
403 Forbidden
json{
  "success": false,
  "message": "Role 'customer' is not authorized to access this resource."
}
404 Not Found
json{
  "success": false,
  "message": "Resource not found"
}
500 Internal Server Error
json{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (only in development)"
}

Status Codes Summary
CodeMeaning200Success201Created400Bad Request401Unauthorized403Forbidden404Not Found500Internal Server Error503Service Unavailable

Order Status Flow
pending → accepted → picked_up → on_the_way → delivered
         ↓
      cancelled (can happen at pending/accepted)

Total API Count

Authentication: 5 endpoints
Customer: 7 endpoints
Delivery Partner: 8 endpoints
Admin: 11 endpoints
Health Check: 1 endpoint

Total: 32 API Endpoints