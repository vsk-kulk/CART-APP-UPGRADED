# ShopHub E-Commerce API Documentation

## Overview
Complete RESTful API for the ShopHub e-commerce platform with Spring Boot backend integration.

### Base URL
```
http://localhost:8080/api
```

### Authentication
All protected endpoints require Bearer token in Authorization header:
```
Authorization: Bearer {token}
```

---

## 1. Authentication Endpoints

### POST /auth/register
Register a new user

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "role": "user",
  "whatsappNumber": "+919876543210"
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user-001",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "whatsappNumber": "+919876543210",
      "createdDate": "2024-05-12T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /auth/login
Authenticate user and get JWT token

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "...",
    "refreshToken": "..."
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /auth/refresh
Refresh expired JWT token

**Request Body:**
```json
{
  "refreshToken": "..."
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Token refreshed successfully",
  "data": {
    "token": "..."
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /auth/logout
Logout user (requires authentication)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Logout successful",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### PUT /auth/profile
Update user profile (requires authentication)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "whatsappNumber": "+919876543211"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "user": { ... }
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

---

## 2. Product Endpoints

### GET /products
Get all products with filtering and pagination

**Query Parameters:**
- `minPrice` (optional): Minimum price filter
- `maxPrice` (optional): Maximum price filter
- `sortBy` (optional): `price-low`, `price-high`, `newest`, `rating`
- `sellerId` (optional): Filter by seller ID
- `category` (optional): Filter by category
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Products retrieved successfully",
  "data": [
    {
      "id": "product-001",
      "name": "Product Name",
      "description": "Product description",
      "price": 999.99,
      "category": "Electronics",
      "image": "https://...",
      "sellerName": "Seller Name",
      "sellerId": "seller-001",
      "rating": 4.5,
      "reviews": 120,
      "stock": 50,
      "createdDate": "2024-05-01T10:30:00Z"
    }
  ],
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /products/search
Search products by keyword

**Query Parameters:**
- `q` (required): Search query

**Response (200 OK):**
Same as GET /products

### GET /products/{id}
Get single product by ID

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Product retrieved successfully",
  "data": { ... },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /products
Add new product (requires authentication, seller or admin)

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 999.99,
  "category": "Electronics",
  "image": "https://...",
  "stock": 100
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Product added successfully. Awaiting admin approval.",
  "data": { ... },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### PUT /products/{id}
Update product (requires authentication, product owner or admin)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Product updated successfully",
  "data": { ... },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### DELETE /products/{id}
Delete product (requires authentication, product owner or admin)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Product deleted successfully",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /products/sellers
Get list of all product sellers

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Sellers retrieved successfully",
  "data": [
    {
      "id": "seller-001",
      "name": "Seller Name"
    }
  ],
  "timestamp": "2024-05-12T10:30:00Z"
}
```

---

## 3. Cart Endpoints (Requires Authentication)

### GET /cart
Get user's cart

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Cart retrieved successfully",
  "data": {
    "id": "cart-001",
    "userId": "user-001",
    "items": [
      {
        "productId": "product-001",
        "product": { ... },
        "quantity": 2,
        "addedDate": "2024-05-12T10:30:00Z"
      }
    ],
    "totalPrice": 1999.98,
    "lastUpdated": "2024-05-12T10:30:00Z",
    "isFavorite": false
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /cart/add
Add item to cart

**Request Body:**
```json
{
  "productId": "product-001",
  "quantity": 2
}
```

**Response (201 Created):**
Same as GET /cart

### PUT /cart/update/{productId}
Update cart item quantity

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (200 OK):**
Same as GET /cart

### DELETE /cart/{productId}
Remove item from cart

**Response (200 OK):**
Same as GET /cart

### DELETE /cart/clear
Clear entire cart

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Cart cleared successfully",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /cart/save
Save cart for later

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Cart saved successfully",
  "data": { ... },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /cart/favorites
Add product to favorites

**Request Body:**
```json
{
  "productId": "product-001"
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Added to favorites",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### DELETE /cart/favorites/{productId}
Remove from favorites

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Removed from favorites",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /cart/favorites
Get user's favorite products

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Favorites retrieved successfully",
  "data": [ ... ],
  "timestamp": "2024-05-12T10:30:00Z"
}
```

---

## 4. Payment Endpoints (Requires Authentication)

### POST /payments/initiate
Initiate payment and get Stripe session URL

**Request Body:**
```json
{
  "cartId": "cart-001",
  "amount": 1999.98,
  "currency": "INR",
  "email": "user@example.com"
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Payment session created successfully",
  "data": {
    "sessionId": "cs_live_xxx",
    "paymentUrl": "https://checkout.stripe.com/pay/cs_live_xxx",
    "timestamp": "2024-05-12T10:30:00Z"
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /payments/confirm
Confirm payment after Stripe redirect

**Request Body:**
```json
{
  "sessionId": "cs_live_xxx"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Payment successful",
  "data": {
    "paymentId": "pay-001",
    "status": "success",
    "orderId": "order-001",
    "amount": 1999.98,
    "transactionId": "txn_1234567890"
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /payments/status/{paymentId}
Get payment status

**Response (200 OK):**
Same as /payments/confirm

### POST /payments/cancel/{paymentId}
Cancel payment

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Payment cancelled successfully",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /payments/history
Get payment history

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Payment history retrieved",
  "data": [ ... ],
  "timestamp": "2024-05-12T10:30:00Z"
}
```

---

## 5. WhatsApp Notification Endpoints

### POST /notifications/whatsapp/send
Send WhatsApp notification

**Request Body:**
```json
{
  "recipientNumber": "+919876543210",
  "type": "product_added",
  "productId": "product-001",
  "productName": "New Product",
  "sellerName": "Seller Name"
}
```

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Notification sent successfully",
  "data": {
    "id": "notif-001",
    "recipientNumber": "+919876543210",
    "type": "product_added",
    "message": "New product 'Product Name' added by Seller Name",
    "status": "sent",
    "createdDate": "2024-05-12T10:30:00Z",
    "sentDate": "2024-05-12T10:30:01Z"
  },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /notifications/admin/approval-request
Send approval request to admin via WhatsApp

**Response (201 Created):**
```json
{
  "statusCode": 201,
  "message": "Approval request sent to admin",
  "data": { ... },
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### POST /notifications/admin/process-approval
Process admin approval/rejection via WhatsApp

**Request Body:**
```json
{
  "notificationId": "notif-001",
  "action": "approve",
  "reason": "Product meets quality standards"
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Approval processed successfully",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /notifications/whatsapp/history
Get notification history

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Notification history retrieved",
  "data": [ ... ],
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### GET /notifications/admin/pending-approvals
Get pending approvals for admin

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Pending approvals retrieved",
  "data": [ ... ],
  "timestamp": "2024-05-12T10:30:00Z"
}
```

### PUT /notifications/whatsapp/{notificationId}/read
Mark notification as read

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "message": "Notification marked as read",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

---

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - User doesn't have permission |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 500 | Server Error - Internal server error |

---

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Error description",
  "timestamp": "2024-05-12T10:30:00Z"
}
```

---

## Cache Eviction

- Product cache is automatically evicted after 30 minutes
- Cache is also evicted when products are added, updated, or deleted
- Cache check runs every 5 minutes

---

## Authentication Token Expiry

- JWT tokens expire after 1 hour
- Refresh tokens are valid for 7 days
- Use `/auth/refresh` endpoint to get a new access token

---

## Rate Limiting

- Standard rate limit: 100 requests per minute per IP
- Payment endpoints: 10 requests per minute per user

---

## CORS Configuration

The API supports CORS requests from:
- `http://localhost:4200` (Development)
- `https://yourdomain.com` (Production)

---

## WebSocket Notifications (Real-time)

WebSocket connection for real-time notifications:
```
ws://localhost:8080/ws/notifications
```

Subscribe to channels:
- `user:user-id` - User-specific notifications
- `admin:approvals` - Admin approval requests
- `seller:seller-id` - Seller-specific notifications
