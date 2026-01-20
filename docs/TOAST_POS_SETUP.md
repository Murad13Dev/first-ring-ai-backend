# Toast POS Integration Setup Guide

Complete guide for integrating Toast POS with First Ring AI platform.

---

## 📋 **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Toast API Credentials](#toast-api-credentials)
3. [Configuration](#configuration)
4. [Testing Connection](#testing-connection)
5. [API Endpoints](#api-endpoints)
6. [Troubleshooting](#troubleshooting)

---

## 🔑 **Prerequisites**

Before setting up Toast POS integration, ensure you have:

- ✅ Active Toast POS account
- ✅ Toast Partner API access (contact Toast support to enable)
- ✅ Toast Restaurant External ID (GUID)
- ✅ Toast Access Token
- ✅ First Ring AI tenant account

---

## 🎫 **Toast API Credentials**

### **Step 1: Get Toast API Access**

1. **Contact Toast Support:**
   - Email: partnersupport@toasttab.com
   - Request: Partner API access for third-party integration
   - Provide: Your restaurant details and integration use case

2. **Obtain Credentials:**
   - **Restaurant External ID:** UUID format (e.g., `a7b8c9d0-1234-5678-90ab-cdef12345678`)
   - **Access Token:** Long bearer token starting with `TOAST`
   - **Environment:** `sandbox` or `production`

### **Step 2: Save Credentials Securely**

```bash
# Add to your .env file
TOAST_RESTAURANT_ID=your-restaurant-external-id
TOAST_ACCESS_TOKEN=your-toast-access-token
TOAST_ENVIRONMENT=sandbox  # or 'production'
```

---

## ⚙️ **Configuration**

### **Option A: Via API** (Recommended)

Use the following API endpoint to configure Toast POS for a tenant:

**Endpoint:** `POST /api/pos-integrations/tenants/:tenantId/configure`

**Headers:**
```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider": "toast",
  "apiKey": "your-toast-access-token",
  "merchantId": "your-restaurant-external-id",
  "environment": "sandbox"
}
```

**Example with cURL:**
```bash
curl -X POST http://localhost:8000/api/pos-integrations/tenants/tenant-id-here/configure \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "toast",
    "apiKey": "TOAST_ACCESS_TOKEN_HERE",
    "merchantId": "RESTAURANT_EXTERNAL_ID_HERE",
    "environment": "sandbox"
  }'
```

**Response:**
```json
{
  "id": "tenant-id",
  "name": "Mario's Butcher",
  "posConfig": {
    "provider": "toast",
    "apiKey": "TOAST_...",
    "merchantId": "a7b8c9d0-...",
    "environment": "sandbox"
  }
}
```

### **Option B: Direct Database Update** (For Testing)

```sql
UPDATE tenants
SET "posConfig" = '{
  "provider": "toast",
  "apiKey": "your-toast-access-token",
  "merchantId": "your-restaurant-external-id",
  "environment": "sandbox"
}'::jsonb
WHERE id = 'your-tenant-id';
```

---

## 🧪 **Testing Connection**

### **Test API Connection**

**Endpoint:** `POST /api/pos-integrations/tenants/:tenantId/test`

**Example:**
```bash
curl -X POST http://localhost:8000/api/pos-integrations/tenants/tenant-id/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response:**
```json
{
  "success": true,
  "message": "POS connection successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Authentication failed: Invalid access token"
}
```

---

## 🔌 **API Endpoints**

### **1. Configure POS**
```http
POST /api/pos-integrations/tenants/:tenantId/configure
```

**Body:**
```json
{
  "provider": "toast",
  "apiKey": "string",
  "merchantId": "string",
  "environment": "sandbox" | "production"
}
```

---

### **2. Get POS Configuration**
```http
GET /api/pos-integrations/tenants/:tenantId/config
```

**Response:**
```json
{
  "provider": "toast",
  "merchantId": "a7b8c9d0-...",
  "environment": "sandbox"
}
```

---

### **3. Test Connection**
```http
POST /api/pos-integrations/tenants/:tenantId/test
```

**Response:**
```json
{
  "success": true,
  "message": "POS connection successful"
}
```

---

### **4. Push Order to Toast**
```http
POST /api/pos-integrations/tenants/:tenantId/orders/:orderId/push
```

**Response:**
```json
{
  "externalOrderId": "toast-order-guid",
  "status": "approved"
}
```

**Order Flow:**
1. Customer places order via First Ring AI call
2. Order saved in First Ring AI database
3. Call this endpoint to push order to Toast POS
4. Toast processes order and returns external ID
5. External ID saved in order record

---

### **5. Sync Menu from Toast**
```http
POST /api/pos-integrations/tenants/:tenantId/sync-menu
```

**Response:**
```json
[
  {
    "guid": "menu-item-guid",
    "name": "Ribeye Steak",
    "price": 29.99,
    "category": "Meats"
  },
  ...
]
```

---

### **6. Cancel Order**
```http
POST /api/pos-integrations/tenants/:tenantId/orders/:orderId/cancel
```

**Response:**
```json
{
  "success": true
}
```

---

## 🛠️ **Toast API Details**

### **Endpoints Used**

| Endpoint | Purpose | Documentation |
|----------|---------|---------------|
| `POST /orders/v2/orders` | Create order | [Toast Orders API](https://doc.toasttab.com/openapi/orders/operation/ordersPost/) |
| `GET /orders/v2/orders/:id` | Get order details | [Toast Orders API](https://doc.toasttab.com/openapi/orders/operation/ordersOrdersGuidGet/) |
| `POST /orders/v2/orders/:id/void` | Void/cancel order | [Toast Orders API](https://doc.toasttab.com/openapi/orders/operation/ordersOrdersGuidVoidPost/) |
| `GET /menus/v2/menus` | Get restaurant menus | [Toast Menus API](https://doc.toasttab.com/openapi/menus/) |

### **Request Headers**
```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Toast-Restaurant-External-ID: YOUR_RESTAURANT_ID
Content-Type: application/json
```

### **Base URLs**
- **Sandbox:** `https://api.sandbox.toasttab.com`
- **Production:** `https://api.toasttab.com`

---

## 🐛 **Troubleshooting**

### **Error: "Authentication failed"**

**Cause:** Invalid or expired access token

**Solution:**
1. Verify access token is correct
2. Check if token has expired (contact Toast support)
3. Ensure Restaurant External ID matches the token

---

### **Error: "Restaurant not found"**

**Cause:** Invalid Restaurant External ID

**Solution:**
1. Verify Restaurant External ID is correct UUID format
2. Confirm ID matches your Toast account
3. Contact Toast support to verify restaurant setup

---

### **Error: "POS not configured"**

**Cause:** Tenant doesn't have POS configuration

**Solution:**
Run configuration endpoint (see [Configuration](#configuration))

---

### **Error: "Failed to create Toast order"**

**Possible Causes:**
- Invalid menu item GUIDs
- Missing required customer information
- Invalid price format

**Solution:**
1. Sync menu first to get valid item GUIDs
2. Ensure customer name, phone, email are provided
3. Check that prices are in correct format (dollars, not cents)

---

## 📞 **Support**

### **Toast Support**
- **Email:** partnersupport@toasttab.com
- **Portal:** https://pos.toasttab.com/
- **Documentation:** https://doc.toasttab.com/

### **First Ring AI Support**
- **Email:** support@firstringai.com
- **Documentation:** https://docs.firstringai.com/

---

## 🎯 **Quick Start for Mario's Butcher**

```bash
# 1. Configure Toast POS
curl -X POST http://localhost:8000/api/pos-integrations/tenants/MARIO_TENANT_ID/configure \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "toast",
    "apiKey": "MARIO_TOAST_TOKEN",
    "merchantId": "MARIO_RESTAURANT_ID",
    "environment": "production"
  }'

# 2. Test connection
curl -X POST http://localhost:8000/api/pos-integrations/tenants/MARIO_TENANT_ID/test \
  -H "Authorization: Bearer JWT_TOKEN"

# 3. Sync menu
curl -X POST http://localhost:8000/api/pos-integrations/tenants/MARIO_TENANT_ID/sync-menu \
  -H "Authorization: Bearer JWT_TOKEN"

# 4. Ready to receive orders! 🎉
```

---

## ✅ **Checklist**

- [ ] Toast API access enabled
- [ ] Access token obtained
- [ ] Restaurant External ID obtained
- [ ] Configuration endpoint called
- [ ] Connection test successful
- [ ] Menu synced successfully
- [ ] Test order placed successfully

---

**Last Updated:** January 2026
**Version:** 1.0.0
