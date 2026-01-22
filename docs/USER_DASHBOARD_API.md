# User Dashboard API Guide

Bu sənəd First Ring AI User Dashboard üçün mövcud olan bütün API endpoint-larını, request və response formatlarını ətraflı şəkildə izah edir.

## 📋 Table of Contents

- [Authentication](#authentication)
- [User Profile](#user-profile)
- [Analytics](#analytics)
- [Bookings](#bookings)
- [Orders](#orders)
- [Services](#services)
- [FAQs](#faqs)
- [AI Agent Configuration](#ai-agent-configuration)
- [Calls](#calls)
- [Subscriptions](#subscriptions)

---

## 🔐 Authentication

Bütün dashboard endpoint-ları authentication tələb edir. Token-i `Authorization` header-də Bearer token kimi göndərin:

```
Authorization: Bearer <your-access-token>
```

### 1. Register

**POST** `/api/auth/register`

Yeni user qeydiyyatdan keçirir.

**Request Body:**
```json
{
  "email": "john@pizzahouse.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+994501234567",
  "tenantId": "f8f6c45c-9bd2-54d858645467",
  "role": "owner"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john@pizzahouse.com",
      "name": "John Doe",
      "role": "owner",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "emailVerified": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Errors:**
- `400` - Email already registered
- `404` - Tenant not found

---

### 2. Login

**POST** `/api/auth/login`

User daxil olur və access/refresh token alır.

**Request Body:**
```json
{
  "email": "john@pizzahouse.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "john@pizzahouse.com",
      "name": "John Doe",
      "role": "owner",
      "phone": "+994501234567",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "isActive": true,
      "lastLoginAt": "2024-01-15T10:30:00.000Z",
      "tenant": {
        "id": "f8f6c45c-9bd2-54d858645467",
        "name": "Pizza House",
        "businessType": "restaurant",
        "plan": "professional",
        "subscriptionStatus": "active"
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "subscription": {
      "status": "active",
      "expiryDate": "2024-02-15T10:30:00.000Z"
    }
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account inactive / Email not verified / Not admin approved / Subscription expired

---

### 3. Refresh Token

**POST** `/api/auth/refresh`

Access token-i yeniləyir.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `401` - Invalid refresh token

---

### 4. Get Profile

**GET** `/api/auth/me`

Mövcud user-in profil məlumatlarını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john@pizzahouse.com",
    "name": "John Doe",
    "role": "owner",
    "phone": "+994501234567",
    "avatar": null,
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "isActive": true,
    "lastLoginAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-01T08:00:00.000Z",
    "tenant": {
      "id": "f8f6c45c-9bd2-54d858645467",
      "name": "Pizza House",
      "businessType": "restaurant",
      "email": "contact@pizzahouse.com",
      "phone": "+994501234567",
      "plan": "professional",
      "subscriptionStatus": "active"
    }
  }
}
```

**Errors:**
- `401` - Unauthorized
- `404` - User not found

---

### 5. Logout

**POST** `/api/auth/logout`

User çıxış edir (client tərəfdə token silinməlidir).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## 📊 Analytics

### 1. Get Aggregated Analytics

**GET** `/api/analytics/:tenantId`

Tenant üçün ümumi analitik məlumatları alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `days` (optional) - Neçə günlük data (default: 30)

**Example:**
```
GET /api/analytics/f8f6c45c-9bd2-54d858645467?days=7
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalEvents": 245,
    "byType": {
      "call_completed": 120,
      "booking_made": 85,
      "order_placed": 40
    },
    "callMetrics": {
      "total": 120,
      "avgDuration": 185.5
    },
    "sentiments": {
      "positive": 95,
      "neutral": 20,
      "negative": 5
    },
    "dailyTrends": {
      "2024-01-15": 35,
      "2024-01-14": 42,
      "2024-01-13": 38
    }
  }
}
```

---

### 2. Get Events

**GET** `/api/analytics/:tenantId/events`

Event-lərin siyahısını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `eventType` (optional) - Event növü (call_completed, booking_made, etc.)
- `startDate` (optional) - Başlanğıc tarix (ISO format)
- `endDate` (optional) - Bitmə tarix (ISO format)

**Example:**
```
GET /api/analytics/f8f6c45c-9bd2-54d858645467/events?eventType=call_completed&startDate=2024-01-01
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt_123",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "eventType": "call_completed",
      "callDuration": 245,
      "callOutcome": "completed",
      "sentiment": "positive",
      "eventData": {
        "customerPhone": "+994501234567",
        "bookingCreated": true
      },
      "createdAt": "2024-01-15T14:30:00.000Z"
    }
  ]
}
```

---

### 3. Track Event

**POST** `/api/analytics/track`

Yeni event yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "tenantId": "f8f6c45c-9bd2-54d858645467",
  "eventType": "order_placed",
  "eventData": {
    "orderId": "ord_123",
    "total": 45.99
  },
  "sentiment": "positive"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "evt_456",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "eventType": "order_placed",
    "eventData": {
      "orderId": "ord_123",
      "total": 45.99
    },
    "sentiment": "positive",
    "createdAt": "2024-01-15T15:00:00.000Z"
  }
}
```

---

## 📅 Bookings

### 1. Get All Bookings

**GET** `/api/bookings`

Tenant-a aid bütün bookingleri alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `status` (optional) - pending, confirmed, cancelled, completed, no_show
- `dateFrom` (optional) - Başlanğıc tarix
- `dateTo` (optional) - Bitmə tarix

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "bk_123",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "customerName": "Jane Smith",
      "customerPhone": "+994501234568",
      "customerEmail": "jane@example.com",
      "serviceId": "svc_456",
      "serviceName": "Hair Styling",
      "dateTime": "2024-01-20T14:00:00.000Z",
      "duration": 60,
      "partySize": 2,
      "status": "confirmed",
      "notes": "Birthday celebration",
      "specialRequests": "Window seat preferred",
      "reminderSent": false,
      "confirmationSent": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### 2. Get Booking by ID

**GET** `/api/bookings/:id`

ID-yə görə booking məlumatını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "bk_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "customerName": "Jane Smith",
    "customerPhone": "+994501234568",
    "customerEmail": "jane@example.com",
    "serviceId": "svc_456",
    "serviceName": "Hair Styling",
    "dateTime": "2024-01-20T14:00:00.000Z",
    "duration": 60,
    "status": "confirmed",
    "notes": "Birthday celebration",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Booking not found

---

### 3. Create Booking

**POST** `/api/bookings`

Yeni booking yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "customerName": "Jane Smith",
  "customerPhone": "+994501234568",
  "customerEmail": "jane@example.com",
  "serviceId": "svc_456",
  "serviceName": "Hair Styling",
  "dateTime": "2024-01-20T14:00:00.000Z",
  "duration": 60,
  "partySize": 2,
  "notes": "Birthday celebration",
  "specialRequests": "Window seat"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "id": "bk_789",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "customerName": "Jane Smith",
    "status": "pending",
    "dateTime": "2024-01-20T14:00:00.000Z",
    "createdAt": "2024-01-15T15:30:00.000Z"
  }
}
```

---

### 4. Update Booking

**PUT** `/api/bookings/:id`

Booking məlumatını yeniləyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "dateTime": "2024-01-20T16:00:00.000Z",
  "notes": "Updated time",
  "status": "confirmed"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking updated successfully",
  "data": {
    "id": "bk_123",
    "dateTime": "2024-01-20T16:00:00.000Z",
    "status": "confirmed",
    "updatedAt": "2024-01-15T16:00:00.000Z"
  }
}
```

---

### 5. Confirm Booking

**POST** `/api/bookings/:id/confirm`

Booking-i təsdiq edir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking confirmed successfully",
  "data": {
    "id": "bk_123",
    "status": "confirmed"
  }
}
```

---

### 6. Cancel Booking

**POST** `/api/bookings/:id/cancel`

Booking-i ləğv edir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "cancelReason": "Customer requested cancellation"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "id": "bk_123",
    "status": "cancelled",
    "cancelledAt": "2024-01-15T16:30:00.000Z",
    "cancelReason": "Customer requested cancellation"
  }
}
```

---

### 7. Mark as No-Show

**POST** `/api/bookings/:id/no-show`

Booking-i no-show olaraq işarələyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking marked as no-show",
  "data": {
    "id": "bk_123",
    "status": "no_show"
  }
}
```

---

### 8. Get Booking Statistics

**GET** `/api/bookings/stats`

Booking statistikalarını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `dateFrom` (optional)
- `dateTo` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 245,
    "byStatus": {
      "pending": 15,
      "confirmed": 180,
      "completed": 40,
      "cancelled": 8,
      "no_show": 2
    },
    "upcomingToday": 12,
    "completionRate": 95.2
  }
}
```

---

### 9. Check Availability

**GET** `/api/bookings/availability`

Müəyyən vaxt üçün mövcudluğu yoxlayır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `dateTime` (required) - ISO format tarix
- `duration` (optional) - Dəqiqə ilə müddət
- `serviceId` (optional)

**Example:**
```
GET /api/bookings/availability?dateTime=2024-01-20T14:00:00.000Z&duration=60
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "available": true,
    "dateTime": "2024-01-20T14:00:00.000Z",
    "conflicts": []
  }
}
```

---

### 10. Get Available Slots

**GET** `/api/bookings/slots`

Müəyyən tarix üçün boş vaxt slotlarını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `date` (required) - Tarix (YYYY-MM-DD)
- `serviceId` (optional)
- `duration` (optional) - Dəqiqə ilə

**Example:**
```
GET /api/bookings/slots?date=2024-01-20&duration=60
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-20",
    "availableSlots": [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00",
      "16:00"
    ]
  }
}
```

---

## 🛒 Orders

### 1. Get All Orders

**GET** `/api/orders`

Tenant-a aid bütün sifarişləri alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `status` (optional) - pending, confirmed, preparing, ready, completed, cancelled
- `paymentStatus` (optional) - pending, paid, failed, refunded
- `dateFrom` (optional)
- `dateTo` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "ord_123",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "customerPhone": "+994501234567",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "items": [
        {
          "serviceId": "svc_789",
          "name": "Margherita Pizza",
          "price": 12.99,
          "quantity": 2,
          "modifiers": ["Extra cheese", "Thin crust"]
        },
        {
          "serviceId": "svc_790",
          "name": "Caesar Salad",
          "price": 8.99,
          "quantity": 1
        }
      ],
      "subtotal": 34.97,
      "tax": 2.80,
      "tip": 5.00,
      "discount": 0,
      "total": 42.77,
      "paymentStatus": "paid",
      "paymentMethod": "card",
      "deliveryType": "delivery",
      "deliveryAddress": "123 Main St, Baku",
      "scheduledFor": "2024-01-15T18:30:00.000Z",
      "status": "preparing",
      "notes": "No onions please",
      "createdAt": "2024-01-15T17:00:00.000Z",
      "updatedAt": "2024-01-15T17:15:00.000Z"
    }
  ]
}
```

---

### 2. Get Order by ID

**GET** `/api/orders/:id`

ID-yə görə sifariş məlumatını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "ord_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "customerPhone": "+994501234567",
    "customerName": "John Doe",
    "items": [...],
    "total": 42.77,
    "status": "preparing",
    "paymentStatus": "paid",
    "createdAt": "2024-01-15T17:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Order not found

---

### 3. Create Order

**POST** `/api/orders`

Yeni sifariş yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "customerPhone": "+994501234567",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "items": [
    {
      "serviceId": "svc_789",
      "name": "Margherita Pizza",
      "price": 12.99,
      "quantity": 2,
      "modifiers": ["Extra cheese"]
    }
  ],
  "subtotal": 25.98,
  "tax": 2.08,
  "tip": 5.00,
  "discount": 0,
  "total": 33.06,
  "deliveryType": "delivery",
  "deliveryAddress": "123 Main St",
  "scheduledFor": "2024-01-15T18:30:00.000Z",
  "notes": "Ring doorbell"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "ord_456",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "status": "pending",
    "paymentStatus": "pending",
    "total": 33.06,
    "createdAt": "2024-01-15T17:30:00.000Z"
  }
}
```

---

### 4. Update Order

**PUT** `/api/orders/:id`

Sifariş məlumatını yeniləyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "status": "ready",
  "notes": "Order ready for pickup"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "id": "ord_123",
    "status": "ready",
    "updatedAt": "2024-01-15T18:00:00.000Z"
  }
}
```

---

### 5. Create Checkout Link

**POST** `/api/orders/:id/checkout`

Sifariş üçün ödəniş linki yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_...",
    "orderId": "ord_123"
  }
}
```

---

### 6. Get Order Statistics

**GET** `/api/orders/stats`

Sifariş statistikalarını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `dateFrom` (optional)
- `dateTo` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalOrders": 523,
    "totalRevenue": 18543.50,
    "averageOrderValue": 35.45,
    "byStatus": {
      "pending": 12,
      "confirmed": 8,
      "preparing": 5,
      "ready": 3,
      "completed": 485,
      "cancelled": 10
    },
    "byPaymentStatus": {
      "pending": 15,
      "paid": 500,
      "failed": 5,
      "refunded": 3
    },
    "topItems": [
      {
        "name": "Margherita Pizza",
        "quantity": 245,
        "revenue": 3183.55
      }
    ]
  }
}
```

---

## 🛎️ Services

### 1. Get All Services

**GET** `/api/services`

Tenant-a aid bütün xidmətləri alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `category` (optional) - Kateqoriyaya görə filter
- `available` (optional) - true/false - Mövcudluğa görə filter

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "svc_123",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "name": "Margherita Pizza",
      "description": "Classic Italian pizza with tomato and mozzarella",
      "category": "Pizza",
      "price": 12.99,
      "duration": null,
      "available": true,
      "image": "https://...",
      "modifiers": {
        "size": ["Small", "Medium", "Large"],
        "crust": ["Thin", "Regular", "Stuffed"]
      },
      "stockQuantity": 50,
      "lowStockAlert": 10,
      "sortOrder": 1,
      "createdAt": "2024-01-01T08:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Service by ID

**GET** `/api/services/:id`

ID-yə görə xidmət məlumatını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "svc_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "name": "Margherita Pizza",
    "description": "Classic Italian pizza",
    "category": "Pizza",
    "price": 12.99,
    "available": true,
    "stockQuantity": 50
  }
}
```

**Errors:**
- `404` - Service not found

---

### 3. Create Service

**POST** `/api/services`

Yeni xidmət yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "name": "Pepperoni Pizza",
  "description": "Classic pepperoni pizza",
  "category": "Pizza",
  "price": 14.99,
  "duration": null,
  "available": true,
  "image": "https://...",
  "modifiers": {
    "size": ["Small", "Medium", "Large"]
  },
  "stockQuantity": 30,
  "lowStockAlert": 10,
  "sortOrder": 2
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "svc_456",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "name": "Pepperoni Pizza",
    "price": 14.99,
    "available": true,
    "createdAt": "2024-01-15T18:00:00.000Z"
  }
}
```

---

### 4. Update Service

**PUT** `/api/services/:id`

Xidmət məlumatını yeniləyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "price": 15.99,
  "available": true,
  "stockQuantity": 45
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "id": "svc_123",
    "price": 15.99,
    "available": true,
    "stockQuantity": 45,
    "updatedAt": "2024-01-15T18:30:00.000Z"
  }
}
```

---

### 5. Delete Service

**DELETE** `/api/services/:id`

Xidməti silir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

**Errors:**
- `404` - Service not found

---

### 6. Get Categories

**GET** `/api/services/categories/list`

Bütün kateqoriyaların siyahısını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    "Pizza",
    "Pasta",
    "Salads",
    "Desserts",
    "Beverages"
  ]
}
```

---

### 7. Get Low Stock Services

**GET** `/api/services/stock/low`

Az qalmış ehtiyyatı olan xidmətləri alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "svc_789",
      "name": "Caesar Salad",
      "stockQuantity": 5,
      "lowStockAlert": 10,
      "category": "Salads"
    }
  ]
}
```

---

### 8. Update Stock

**PUT** `/api/services/:id/stock`

Xidmətin ehtiyyatını yeniləyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "stockQuantity": 50,
  "operation": "set"
}
```

**or:**

```json
{
  "stockQuantity": 10,
  "operation": "increase"
}
```

**or:**

```json
{
  "stockQuantity": 5,
  "operation": "decrease"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Stock updated successfully",
  "data": {
    "id": "svc_123",
    "stockQuantity": 50
  }
}
```

---

### 9. Bulk Update Availability

**PUT** `/api/services/bulk/availability`

Bir neçə xidmətin mövcudluğunu eyni anda yeniləyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "serviceIds": ["svc_123", "svc_456", "svc_789"],
  "available": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Services availability updated",
  "data": {
    "updated": 3
  }
}
```

---

### 10. Duplicate Service

**POST** `/api/services/:id/duplicate`

Xidməti kopyalayır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Service duplicated successfully",
  "data": {
    "id": "svc_999",
    "name": "Margherita Pizza (Copy)",
    "price": 12.99
  }
}
```

---

## ❓ FAQs

### 1. Get All FAQs

**GET** `/api/faqs`

Tenant-a aid bütün FAQ-ları alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `category` (optional) - Kateqoriyaya görə filter
- `isActive` (optional) - true/false - Aktiv/deaktiv filter
- `search` (optional) - Sual və ya cavabda axtarış
- `page` (optional) - Səhifə nömrəsi (default: 1)
- `limit` (optional) - Səhifədə neçə nəticə (default: 50)

**Example:**
```
GET /api/faqs?category=Booking&isActive=true&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "faqs": [
      {
        "id": "faq_123",
        "tenantId": "f8f6c45c-9bd2-54d858645467",
        "question": "What are your business hours?",
        "answer": "We are open Monday to Friday from 9 AM to 10 PM, and weekends from 10 AM to 11 PM.",
        "keywords": ["hours", "open", "time", "schedule"],
        "category": "General",
        "viewCount": 125,
        "helpfulCount": 98,
        "isActive": true,
        "createdAt": "2024-01-01T08:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": "faq_456",
        "tenantId": "f8f6c45c-9bd2-54d858645467",
        "question": "How do I make a reservation?",
        "answer": "You can make a reservation by calling us or through our AI phone system. Just tell us your preferred date, time, and party size.",
        "keywords": ["reservation", "booking", "table"],
        "category": "Booking",
        "viewCount": 89,
        "helpfulCount": 76,
        "isActive": true,
        "createdAt": "2024-01-02T09:00:00.000Z",
        "updatedAt": "2024-01-10T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### 2. Get FAQ by ID

**GET** `/api/faqs/:id`

ID-yə görə FAQ məlumatını alır və view count-u artırır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "faq_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "question": "What are your business hours?",
    "answer": "We are open Monday to Friday from 9 AM to 10 PM, and weekends from 10 AM to 11 PM.",
    "keywords": ["hours", "open", "time", "schedule"],
    "category": "General",
    "viewCount": 126,
    "helpfulCount": 98,
    "isActive": true,
    "createdAt": "2024-01-01T08:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `404` - FAQ not found

---

### 3. Create FAQ

**POST** `/api/faqs`

Yeni FAQ yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "question": "Do you offer delivery?",
  "answer": "Yes, we offer delivery within a 5-mile radius. Delivery fee is $3.99 for orders under $25.",
  "keywords": ["delivery", "shipping", "distance"],
  "category": "Delivery"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "FAQ created successfully",
  "data": {
    "id": "faq_789",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "question": "Do you offer delivery?",
    "answer": "Yes, we offer delivery within a 5-mile radius. Delivery fee is $3.99 for orders under $25.",
    "keywords": ["delivery", "shipping", "distance"],
    "category": "Delivery",
    "viewCount": 0,
    "helpfulCount": 0,
    "isActive": true,
    "createdAt": "2024-01-15T18:00:00.000Z",
    "updatedAt": "2024-01-15T18:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Question and answer are required

**Note:** Keywords automatically generated from question/answer if not provided.

---

### 4. Update FAQ

**PUT** `/api/faqs/:id`

FAQ məlumatını yeniləyir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "question": "Do you offer delivery service?",
  "answer": "Yes, we offer delivery within a 5-mile radius. Delivery is free for orders over $30.",
  "keywords": ["delivery", "shipping", "distance", "free"],
  "category": "Delivery",
  "isActive": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FAQ updated successfully",
  "data": {
    "id": "faq_789",
    "question": "Do you offer delivery service?",
    "answer": "Yes, we offer delivery within a 5-mile radius. Delivery is free for orders over $30.",
    "keywords": ["delivery", "shipping", "distance", "free"],
    "category": "Delivery",
    "isActive": true,
    "updatedAt": "2024-01-15T19:00:00.000Z"
  }
}
```

**Errors:**
- `404` - FAQ not found

---

### 5. Delete FAQ

**DELETE** `/api/faqs/:id`

FAQ-ı silir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FAQ deleted successfully"
}
```

**Errors:**
- `404` - FAQ not found

---

### 6. Search FAQs

**POST** `/api/faqs/search`

FAQ-larda axtarış edir (sual, cavab və keyword-lərə baxır).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "query": "delivery"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "faq_789",
      "question": "Do you offer delivery service?",
      "answer": "Yes, we offer delivery within a 5-mile radius...",
      "keywords": ["delivery", "shipping", "distance", "free"],
      "category": "Delivery",
      "viewCount": 45,
      "helpfulCount": 38,
      "isActive": true,
      "relevanceScore": 0.95
    },
    {
      "id": "faq_234",
      "question": "What is the delivery time?",
      "answer": "Average delivery time is 30-45 minutes...",
      "keywords": ["delivery", "time", "estimate"],
      "category": "Delivery",
      "viewCount": 67,
      "helpfulCount": 54,
      "isActive": true,
      "relevanceScore": 0.87
    }
  ]
}
```

**Errors:**
- `400` - Query is required

**Note:** Results sorted by relevance score.

---

### 7. Get Categories

**GET** `/api/faqs/categories/list`

Bütün FAQ kateqoriyalarının siyahısını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    "General",
    "Booking",
    "Delivery",
    "Payment",
    "Menu",
    "Hours"
  ]
}
```

---

### 8. Mark as Helpful

**POST** `/api/faqs/:id/helpful`

FAQ-ı "helpful" olaraq işarələyir (helpful count artırır).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "FAQ marked as helpful"
}
```

**Errors:**
- `404` - FAQ not found

---

### 9. Get FAQ Statistics

**GET** `/api/faqs/stats`

FAQ statistikalarını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalFAQs": 45,
    "activeFAQs": 42,
    "inactiveFAQs": 3,
    "totalViews": 3542,
    "totalHelpful": 2876,
    "avgHelpfulRate": 81.2,
    "byCategory": {
      "General": 8,
      "Booking": 12,
      "Delivery": 7,
      "Payment": 6,
      "Menu": 9,
      "Hours": 3
    },
    "mostViewed": [
      {
        "id": "faq_123",
        "question": "What are your business hours?",
        "viewCount": 456,
        "helpfulCount": 398,
        "category": "Hours"
      },
      {
        "id": "faq_456",
        "question": "How do I make a reservation?",
        "viewCount": 387,
        "helpfulCount": 325,
        "category": "Booking"
      }
    ],
    "mostHelpful": [
      {
        "id": "faq_789",
        "question": "Do you offer delivery service?",
        "helpfulCount": 412,
        "viewCount": 445,
        "helpfulRate": 92.6,
        "category": "Delivery"
      }
    ]
  }
}
```

---

## 🤖 AI Agent Configuration

AI Agent konfiqurasiyası tenant-ın AI asistentini fərdiləşdirməyə imkan verir. Retell AI ilə avtomatik sync olunur.

### 1. Get Agent Configuration

**GET** `/api/tenants/:tenantId/agent-config`

Tenant-ın AI agent konfiqurasiyasını və mövcud seçimləri alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "config": {
      "customAgentName": "Pizza House Virtual Assistant",
      "customAgentPrompt": "You are a professional and friendly AI assistant for Pizza House, a popular Italian restaurant. You help customers with:\n- Making table reservations\n- Taking food orders\n- Answering questions about menu, hours, location\n- Providing information about delivery and catering\n\nBe warm, helpful, and efficient. Always confirm details before finalizing bookings or orders.",
      "agentVoiceGender": "female",
      "agentVoiceId": "11labs-Rachel",
      "agentTemperature": 0.8,
      "enabledTools": ["booking", "ordering", "faq", "check_availability"]
    },
    "defaults": {
      "agentName": "Pizza House AI Agent",
      "voiceGender": "male",
      "temperature": 0.7,
      "enabledTools": ["booking", "ordering", "faq", "check_availability"]
    },
    "options": {
      "voices": [
        {
          "id": "11labs-Rachel",
          "name": "Rachel",
          "gender": "female",
          "language": "en-US",
          "preview": "https://..."
        },
        {
          "id": "11labs-Adam",
          "name": "Adam",
          "gender": "male",
          "language": "en-US",
          "preview": "https://..."
        }
      ],
      "tools": [
        {
          "name": "booking",
          "description": "Handle table reservations and appointment scheduling",
          "enabled": true
        },
        {
          "name": "ordering",
          "description": "Take food/product orders from customers",
          "enabled": true
        },
        {
          "name": "faq",
          "description": "Answer frequently asked questions about the business",
          "enabled": true
        },
        {
          "name": "check_availability",
          "description": "Check availability for bookings or services",
          "enabled": true
        },
        {
          "name": "end_call",
          "description": "Politely end the conversation",
          "enabled": false
        }
      ],
      "temperatureRange": {
        "min": 0.0,
        "max": 1.0,
        "step": 0.1,
        "description": "Controls creativity: 0.0 = Conservative, 1.0 = Creative"
      }
    }
  }
}
```

**Errors:**
- `404` - Tenant not found

---

### 2. Update Agent Configuration

**PATCH** `/api/tenants/:tenantId/agent-config`

AI agent konfiqurasiyasını yeniləyir və Retell AI-a sync edir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "customAgentName": "Pizza House Virtual Assistant",
  "customAgentPrompt": "You are a professional and friendly AI assistant for Pizza House, a popular Italian restaurant in downtown Baku.\n\nYour responsibilities:\n- Answer questions about menu, prices, and specials\n- Take table reservations (confirm date, time, party size, name, phone)\n- Process delivery orders (confirm items, address, payment method)\n- Provide information about business hours, location, and parking\n- Handle customer complaints professionally\n\nPersonality:\n- Warm and welcoming\n- Patient and helpful\n- Professional but not robotic\n- Use simple, clear language\n\nImportant:\n- Always repeat back important details for confirmation\n- If unsure, offer to transfer to a staff member\n- Mention current promotions when relevant",
  "agentVoiceGender": "female",
  "agentVoiceId": "11labs-Rachel",
  "agentTemperature": 0.75,
  "enabledTools": ["booking", "ordering", "faq", "check_availability"]
}
```

**Request Body Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `customAgentName` | string | No | Agent adı (default: "{TenantName} AI Agent") |
| `customAgentPrompt` | string | No | AI davranış prompt-u (system prompt) |
| `agentVoiceGender` | string | No | Səs cinsi: "male" or "female" |
| `agentVoiceId` | string | No | Spesifik voice ID (11labs-Rachel, etc.) |
| `agentTemperature` | number | No | Yaradıcılıq səviyyəsi (0.0 - 1.0) |
| `enabledTools` | array | No | Aktiv funksiyalar listası |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Agent configuration updated successfully",
  "data": {
    "customAgentName": "Pizza House Virtual Assistant",
    "customAgentPrompt": "You are a professional and friendly AI assistant...",
    "agentVoiceGender": "female",
    "agentVoiceId": "11labs-Rachel",
    "agentTemperature": 0.75,
    "enabledTools": ["booking", "ordering", "faq", "check_availability"]
  }
}
```

**Errors:**
- `400` - Invalid temperature (must be 0.0 - 1.0)
- `400` - Invalid voice gender (must be "male" or "female")
- `400` - Invalid tools (must be from available tools list)
- `404` - Tenant not found

**Note:**
- Dəyişikliklər avtomatik olaraq Retell AI-a sync olunur
- Əgər Retell sync uğursuz olarsa, dəyişikliklər database-də saxlanır amma warning log edilir

---

### Available Tools

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `booking` | Table reservations & appointments | Restaurants, salons, clinics |
| `ordering` | Food/product orders | Restaurants, retail |
| `faq` | Answer common questions | All business types |
| `check_availability` | Check booking availability | Restaurants, hotels, services |
| `end_call` | Politely end conversation | All business types |

---

### Agent Temperature Guide

**Temperature** yaradıcılıq və randomness-i idarə edir:

| Range | Behavior | Best For | Example |
|-------|----------|----------|---------|
| **0.0 - 0.3** | Çox konservativ, deterministic | Legal, medical, formal | "Your reservation is confirmed for..." |
| **0.4 - 0.6** | Balanslaşdırılmış, professional | Most businesses | "Great! I've booked that for you..." |
| **0.7 - 0.9** | Natural, conversational | Casual restaurants, retail | "Awesome! You're all set for dinner on Friday!" |
| **1.0** | Çox yaradıcı, unpredictable | Not recommended | Risky - can hallucinate |

**Tövsiyə:**
- Restaurant/Service: **0.7**
- Professional services: **0.5**
- Healthcare/Legal: **0.3**

---

### Custom Prompt Best Practices

#### ✅ Yaxşı Prompt Nümunəsi:

```
You are a friendly AI assistant for "Bella Vista Restaurant", an upscale Italian restaurant.

RESPONSIBILITIES:
- Take table reservations (date, time, party size, name, phone, special requests)
- Answer menu questions (ingredients, prices, portions, dietary options)
- Provide business information (hours: Mon-Sat 11am-11pm, location, parking)
- Handle delivery orders within 5km radius ($3.99 fee)

PERSONALITY:
- Professional but warm
- Patient and helpful
- Use simple, clear language
- Avoid slang

IMPORTANT RULES:
- Always repeat back reservation details for confirmation
- Ask about allergies for food orders
- If you don't know something, say so and offer to transfer
- Mention daily specials when taking orders

CURRENT PROMOTIONS:
- 20% off lunch Mon-Fri 11am-3pm
- Free dessert for birthdays (mention ID required)
```

#### ❌ Pis Prompt Nümunələri:

**Çox qısa:**
```
You are a restaurant AI. Take orders and reservations.
```
*Problem: Yetərincə kontekst yoxdur*

**Çox uzun/qarışıq:**
```
You are an AI and you work for this restaurant and sometimes customers call and...
[3 paragraphs of rambling text]
```
*Problem: Fokus itir, AI qarışır*

**Kontradiktiv:**
```
Be very formal and professional. Also be super casual and fun!
```
*Problem: Ziddiyyətli təlimatlar*

---

### Retell AI Sync

Konfiqurasiya dəyişdirildikdə avtomatik sync olunur:

1. **Database-ə yazılır** (həmişə)
2. **Retell AI API-a göndərilir** (əgər `retellAgentId` varsa)
3. Sync uğursuz olarsa:
   - Dəyişikliklər DB-də saxlanır ✅
   - Error log edilir 📝
   - User-ə warning görsənmir (background process)

**Testing:**
Dəyişiklikləri test etmək üçün:
1. Agent config update edin
2. 1-2 dəqiqə gözləyin (sync üçün)
3. Test zəngi edin tenant phone-a
4. Yeni prompt/voice/behavior test edin

---

### Example: Complete Configuration Flow

#### Step 1: Get Current Config
```bash
curl -X GET https://api.firstring.ai/api/tenants/tenant_123/agent-config \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Step 2: Review Options
```json
{
  "options": {
    "voices": [...],
    "tools": [...],
    "temperatureRange": {...}
  }
}
```

#### Step 3: Update Configuration
```bash
curl -X PATCH https://api.firstring.ai/api/tenants/tenant_123/agent-config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customAgentName": "Bella Vista Assistant",
    "customAgentPrompt": "You are a friendly AI assistant...",
    "agentVoiceGender": "female",
    "agentVoiceId": "11labs-Rachel",
    "agentTemperature": 0.7,
    "enabledTools": ["booking", "ordering", "faq"]
  }'
```

#### Step 4: Verify & Test
- Config database-də saxlanılır ✅
- Retell AI-a sync olunur ✅
- Test zəngi edərək yoxlayın 📞

---

## 📞 Calls

### 1. Get All Calls

**GET** `/api/calls`

Tenant-a aid bütün zəngləri alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `intent` (optional) - faq, booking, order, escalation, unknown
- `outcome` (optional) - completed, escalated, failed, voicemail
- `dateFrom` (optional)
- `dateTo` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "call_123",
      "tenantId": "f8f6c45c-9bd2-54d858645467",
      "fromNumber": "+994501234567",
      "toNumber": "+994551111111",
      "direction": "inbound",
      "duration": 245,
      "recordingUrl": "https://recordings.twilio.com/...",
      "transcript": "Customer: Hi, I'd like to make a reservation...",
      "intent": "booking",
      "outcome": "completed",
      "aiConfidence": 0.95,
      "sentiment": "positive",
      "bookingId": "bk_456",
      "orderId": null,
      "leadId": null,
      "callQuality": 5,
      "metadata": {
        "bookingCreated": true,
        "partySize": 4
      },
      "createdAt": "2024-01-15T14:30:00.000Z"
    }
  ]
}
```

---

### 2. Get Call by ID

**GET** `/api/calls/:id`

ID-yə görə zəng məlumatını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "call_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "fromNumber": "+994501234567",
    "toNumber": "+994551111111",
    "direction": "inbound",
    "duration": 245,
    "transcript": "...",
    "intent": "booking",
    "outcome": "completed",
    "sentiment": "positive",
    "createdAt": "2024-01-15T14:30:00.000Z"
  }
}
```

**Errors:**
- `404` - Call not found

---

### 3. Create Call

**POST** `/api/calls`

Yeni zəng məlumatı yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "fromNumber": "+994501234567",
  "toNumber": "+994551111111",
  "direction": "inbound",
  "duration": 180,
  "recordingUrl": "https://...",
  "transcript": "Transcript text...",
  "intent": "order",
  "outcome": "completed",
  "sentiment": "positive",
  "orderId": "ord_789",
  "callQuality": 4
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Call created successfully",
  "data": {
    "id": "call_456",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "duration": 180,
    "intent": "order",
    "createdAt": "2024-01-15T19:00:00.000Z"
  }
}
```

---

### 4. Get Call Statistics

**GET** `/api/calls/stats`

Zəng statistikalarını alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `dateFrom` (optional)
- `dateTo` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalCalls": 1245,
    "totalMinutes": 5320,
    "avgDuration": 256,
    "byIntent": {
      "booking": 520,
      "order": 380,
      "faq": 290,
      "escalation": 35,
      "unknown": 20
    },
    "byOutcome": {
      "completed": 1150,
      "escalated": 45,
      "failed": 30,
      "voicemail": 20
    },
    "bySentiment": {
      "positive": 980,
      "neutral": 220,
      "negative": 45
    },
    "avgCallQuality": 4.3,
    "completionRate": 92.4
  }
}
```

---

## 💳 Subscriptions

### 1. Get All Plans

**GET** `/api/subscriptions/plans`

Bütün abunəlik planlarını alır.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_123",
      "slug": "starter",
      "name": "Starter Plan",
      "description": "Designed for small businesses",
      "price": 500,
      "callMinutes": 1000,
      "maxUsers": 1,
      "maxPhoneLines": 1,
      "hasUnlimitedPhoneLines": false,
      "overageRatePerMinute": 0.75,
      "features": [
        "One AI phone line",
        "Up to 1,000 monthly minutes",
        "Inbound call answering"
      ],
      "isActive": true,
      "isPopular": false
    },
    {
      "id": "plan_456",
      "slug": "professional",
      "name": "Professional Plan",
      "description": "Designed for growing businesses",
      "price": 1500,
      "callMinutes": 3000,
      "maxUsers": 5,
      "maxPhoneLines": 3,
      "hasUnlimitedPhoneLines": false,
      "overageRatePerMinute": 0.75,
      "features": [
        "Up to three AI phone lines",
        "Up to 3,000 monthly minutes",
        "Advanced call flows"
      ],
      "isActive": true,
      "isPopular": true
    }
  ]
}
```

---

### 2. Get Tenant Subscription

**GET** `/api/subscriptions/:tenantId`

Tenant-ın mövcud abunəliyini alır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sub_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "planId": "plan_456",
    "status": "active",
    "billingCycle": "monthly",
    "currentPeriodStart": "2024-01-01T00:00:00.000Z",
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z",
    "cancelAtPeriodEnd": false,
    "trialEndsAt": null,
    "plan": {
      "id": "plan_456",
      "slug": "professional",
      "name": "Professional Plan",
      "price": 1500,
      "callMinutes": 3000,
      "features": [...]
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `404` - Subscription not found

---

### 3. Create Subscription

**POST** `/api/subscriptions`

Yeni abunəlik yaradır.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "tenantId": "f8f6c45c-9bd2-54d858645467",
  "planId": "plan_456",
  "billingCycle": "monthly"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "sub_789",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "planId": "plan_456",
    "status": "active",
    "billingCycle": "monthly",
    "currentPeriodStart": "2024-01-15T19:30:00.000Z",
    "currentPeriodEnd": "2024-02-15T19:30:00.000Z",
    "plan": {...},
    "createdAt": "2024-01-15T19:30:00.000Z"
  }
}
```

---

### 4. Update Subscription (Upgrade/Downgrade)

**PUT** `/api/subscriptions/:tenantId`

Abunəliyi yeniləyir (plan dəyişikliyi).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "planId": "plan_789"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription updated successfully",
  "data": {
    "id": "sub_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "planId": "plan_789",
    "status": "active",
    "plan": {
      "name": "Enterprise Plan",
      "price": 3000
    },
    "updatedAt": "2024-01-15T20:00:00.000Z"
  }
}
```

---

### 5. Cancel Subscription

**POST** `/api/subscriptions/:tenantId/cancel`

Abunəliyi ləğv edir.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "cancelAtPeriodEnd": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "data": {
    "id": "sub_123",
    "tenantId": "f8f6c45c-9bd2-54d858645467",
    "status": "active",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2024-02-01T00:00:00.000Z"
  }
}
```

---

## 📌 Common Response Formats

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error description",
  "statusCode": 400
}
```

### Common Error Codes

- `400` - Bad Request (məsələn: validation error)
- `401` - Unauthorized (authentication tələb olunur)
- `403` - Forbidden (icazə yoxdur)
- `404` - Not Found (resurs tapılmadı)
- `409` - Conflict (məsələn: email artıq mövcuddur)
- `500` - Internal Server Error

---

## 🔒 Authentication Notes

1. **Access Token**: API sorğuları üçün istifadə olunur (7 gün keçərlidir)
2. **Refresh Token**: Access token-i yeniləmək üçün (30 gün keçərlidir)
3. **Token Yeniləmə**: Access token expire olduqda, `/api/auth/refresh` endpoint-indən istifadə edin

### Token Expiry Handling

```javascript
// Example: Token yeniləmə mexanizmi
async function apiCall(endpoint, options) {
  let response = await fetch(endpoint, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  // Əgər 401 alınırsa, token yenilənməlidir
  if (response.status === 401) {
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: { 'Content-Type': 'application/json' }
    });

    const { data } = await refreshResponse.json();
    accessToken = data.accessToken;

    // Yenidən cəhd et
    response = await fetch(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  return response.json();
}
```

---

## 🚀 Quick Start

### 1. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. Get Profile

```bash
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Get Bookings

```bash
curl -X GET http://localhost:4000/api/bookings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📝 Notes

- Bütün tarixlər ISO 8601 formatında olmalıdır: `2024-01-15T14:30:00.000Z`
- Telefon nömrələri beynəlxalq formatda olmalıdır: `+994501234567`
- Pul məbləğləri USD-də dollar və sentlər ilə (float): `12.99`
- Boolean dəyərlər: `true` və ya `false` (string deyil)

---

## 🆘 Support

API ilə bağlı problemlər və ya suallar üçün:
- Email: support@firstringai.com
- Documentation: https://docs.firstringai.com

---

**Last Updated:** January 2024
**API Version:** v1
