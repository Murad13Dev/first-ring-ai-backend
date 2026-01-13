# First Ring AI - Complete API Documentation for Frontend

## 📖 Table of Contents

1. [Public APIs](#public-apis) - Landing page, lead capture (no auth required)
2. [Authentication APIs](#authentication-apis) - Login, signup, password reset
3. [Admin Panel APIs](#admin-panel-apis) - Admin dashboard management
4. [Customer Dashboard APIs](#customer-dashboard-apis) - Tenant self-service
5. [Shared APIs](#shared-apis) - Used by both admin and customer

---

## 🌐 Base URL

```
Development: http://localhost:5000/api
Production: https://api.firstring.ai/api
```

---

## 🔓 Public APIs

### 1. Create Lead (Landing Page Form)

**Use Case:** Capture lead from landing page contact form

```http
POST /leads
Content-Type: application/json
```

**Request Body:**
```json
{
  "source": "landing_page_form",
  "contactName": "John Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "businessName": "John's Restaurant",
  "businessType": "restaurant",
  "selectedPlan": "professional",
  "callVolume": 50,
  "challenges": "Missing calls during peak hours",
  "website": "https://johnsrestaurant.com",
  "urgency": "week"
}
```

**Required Fields:**
- `source`, `contactName`, `email`, `phone`, `businessName`, `businessType`, `selectedPlan`

**Response (201):**
```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "lead-uuid",
    "contactName": "John Doe",
    "email": "john@example.com",
    "status": "new",
    "priority": "high"
  }
}
```

---

### 2. Get Subscription Plans (Pricing Page)

**Use Case:** Display pricing tiers on public pricing page

```http
GET /subscriptions/plans
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan-uuid",
      "slug": "starter",
      "name": "Starter Plan",
      "description": "Designed for small businesses",
      "price": 500,
      "callMinutes": 1000,
      "maxPhoneLines": 1,
      "overageRatePerMinute": 0.75,
      "features": [
        "One AI phone line",
        "Up to 1,000 monthly minutes",
        "Email support"
      ],
      "isActive": true,
      "isPopular": false
    },
    {
      "id": "plan-uuid-2",
      "slug": "professional",
      "name": "Professional Plan",
      "price": 1500,
      "callMinutes": 3000,
      "maxPhoneLines": 3,
      "isPopular": true,
      "features": [...]
    }
  ]
}
```

---

## 🔐 Authentication APIs

### 1. Login

```http
POST /auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "admin@firstring.ai",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "email": "admin@firstring.ai",
      "name": "Admin User",
      "role": "owner",
      "tenantId": "tenant-uuid"
    }
  }
}
```

**Store Token:**
```javascript
localStorage.setItem('token', data.token);
// Use in all authenticated requests:
headers: { 'Authorization': `Bearer ${token}` }
```

---

### 2. Register (Signup)

```http
POST /auth/register
Content-Type: application/json
```

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123",
  "name": "New User",
  "tenantName": "My Business",
  "businessType": "restaurant"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "jwt-token",
    "user": {...},
    "tenant": {...}
  }
}
```

---

## 👨‍💼 Admin Panel APIs

**All endpoints require:**
```javascript
headers: {
  'Authorization': 'Bearer <admin_token>',
  'Content-Type': 'application/json'
}
```

---

### 📊 Dashboard Overview

#### Get Admin Overview

**Use Case:** Display main dashboard statistics

```http
GET /admin/overview
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalTenants": 145,
    "activeTenants": 132,
    "totalCalls": 8947,
    "totalRevenue": 145000,
    "newTenantsThisMonth": 12,
    "churnRate": 2.5,
    "callsToday": 234,
    "revenueThisMonth": 67500
  }
}
```

**Frontend Display:**
```jsx
<DashboardCard title="Total Tenants" value={data.totalTenants} />
<DashboardCard title="Revenue" value={`$${data.totalRevenue}`} />
```

---

### 👥 Leads Management

#### 1. Get All Leads

```http
GET /leads?status=new&page=1&limit=20
Authorization: Bearer <token>
```

**Query Params:**
- `status`: new | contacted | qualified | converted | lost
- `priority`: low | normal | high | hot
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "lead-uuid",
      "contactName": "John Doe",
      "email": "john@example.com",
      "phone": "+15551234567",
      "businessName": "John's Restaurant",
      "businessType": "restaurant",
      "selectedPlan": "professional",
      "status": "new",
      "priority": "high",
      "qualificationScore": 85,
      "createdAt": "2026-01-13T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

**Frontend Table:**
```jsx
<Table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Business</th>
      <th>Plan</th>
      <th>Status</th>
      <th>Score</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {leads.map(lead => (
      <tr key={lead.id}>
        <td>{lead.contactName}</td>
        <td>{lead.businessName}</td>
        <td><Badge>{lead.selectedPlan}</Badge></td>
        <td><StatusBadge status={lead.status} /></td>
        <td>{lead.qualificationScore}</td>
        <td>
          <Button onClick={() => convertLead(lead.id)}>
            Convert
          </Button>
        </td>
      </tr>
    ))}
  </tbody>
</Table>
```

---

#### 2. Convert Lead to Tenant

**Use Case:** Admin converts qualified lead into paying tenant

```http
POST /leads/:leadId/convert
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Lead converted successfully. Payment link sent to email.",
  "data": {
    "tenant": {
      "id": "tenant-uuid",
      "name": "John's Restaurant",
      "email": "john@example.com",
      "subscriptionStatus": "pending_payment"
    },
    "user": {
      "id": "user-uuid",
      "email": "john@example.com"
    },
    "tempPassword": "FRA-X9K2M7P4"
  }
}
```

**Frontend Action:**
```javascript
async function convertLead(leadId) {
  const response = await fetch(`/api/leads/${leadId}/convert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    toast.success('Lead converted! Payment link sent.');
    refreshLeadsList();
  }
}
```

---

#### 3. Resend Payment Link

**Use Case:** Manually resend payment link if customer didn't receive email

```http
POST /leads/payment-link/resend
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "tenantId": "tenant-uuid",
  "email": "customer@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment link has been sent successfully"
}
```

**Frontend Button:**
```jsx
{tenant.subscriptionStatus === 'pending_payment' && (
  <Button onClick={() => resendPaymentLink(tenant.id, tenant.email)}>
    📧 Resend Payment Link
  </Button>
)}
```

---

### 🏢 Tenants Management

#### 1. Get All Tenants

```http
GET /admin/tenants?page=1&limit=20&search=restaurant
Authorization: Bearer <token>
```

**Query Params:**
- `page`, `limit`: pagination
- `search`: search by name/email

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "tenant-uuid",
        "name": "Pizza House",
        "email": "owner@pizzahouse.com",
        "plan": "professional",
        "subscriptionStatus": "active",
        "twilioNumber": "+15551234567",
        "callsCount": 234,
        "bookingsCount": 45,
        "ordersCount": 89,
        "createdAt": "2025-12-01T00:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

**Frontend Card:**
```jsx
<TenantCard>
  <h3>{tenant.name}</h3>
  <StatusBadge status={tenant.subscriptionStatus} />
  <p>Plan: {tenant.plan}</p>
  <Stats>
    <Stat label="Calls" value={tenant.callsCount} />
    <Stat label="Bookings" value={tenant.bookingsCount} />
  </Stats>
  {tenant.subscriptionStatus === 'pending_payment' && (
    <Button variant="warning">Resend Payment</Button>
  )}
</TenantCard>
```

---

#### 2. Get Tenant Details

```http
GET /admin/tenants/:tenantId
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "tenant-uuid",
    "name": "Pizza House",
    "email": "owner@pizzahouse.com",
    "phone": "+15551234567",
    "plan": "professional",
    "subscriptionStatus": "active",
    "twilioNumber": "+15559876543",
    "retellAgentId": "agent_xxxxx",
    "businessType": "restaurant",
    "createdAt": "2025-12-01T00:00:00Z",
    "subscription": {
      "planId": "plan-uuid",
      "status": "active",
      "currentPeriodEnd": "2026-02-01T00:00:00Z"
    },
    "counts": {
      "calls": 234,
      "bookings": 45,
      "orders": 89,
      "services": 12
    }
  }
}
```

---

### 📞 Calls Management

#### Get Tenant Orders

```http
GET /admin/tenants/:tenantId/orders?paymentStatus=paid
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "customerName": "Jane Smith",
      "customerPhone": "+15551111111",
      "total": 45.50,
      "paymentStatus": "paid",
      "status": "completed",
      "deliveryType": "delivery",
      "createdAt": "2026-01-13T12:30:00Z"
    }
  ]
}
```

---

### 💳 Certified Rep Management

#### 1. Get All Certified Reps

```http
GET /certified-reps?status=active&page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "rep-uuid",
      "user": {
        "name": "Sales Rep Name",
        "email": "rep@example.com"
      },
      "status": "active",
      "subscriptionActive": true,
      "totalClients": 5,
      "activeClients": 3,
      "totalRevenue": 4500,
      "createdAt": "2025-11-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

**Frontend Display:**
```jsx
<RepTable>
  {reps.map(rep => (
    <tr key={rep.id}>
      <td>{rep.user.name}</td>
      <td><Badge color={rep.status === 'active' ? 'green' : 'gray'}>
        {rep.status}
      </Badge></td>
      <td>{rep.totalClients} clients</td>
      <td>${rep.totalRevenue.toLocaleString()}</td>
      <td>
        <Button onClick={() => viewRepDetails(rep.id)}>
          View Details
        </Button>
      </td>
    </tr>
  ))}
</RepTable>
```

---

#### 2. Get Rep Statistics

```http
GET /certified-reps/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalReps": 45,
    "activeReps": 38,
    "inactiveReps": 7,
    "totalClients": 234,
    "activeClients": 189,
    "prospectClients": 45,
    "estimatedMonthlyRevenue": 56700
  }
}
```

---

#### 3. Add Client for Rep

```http
POST /certified-reps/:repId/clients
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "clientName": "Med Spa Beauty",
  "clientEmail": "owner@medspa.com",
  "clientPhone": "+15551234567",
  "businessType": "med_spa",
  "setupFee": 5000,
  "monthlyFee": 800,
  "status": "demo_scheduled",
  "notes": "Interested in booking integration"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Client added successfully",
  "data": {
    "id": "client-uuid",
    "repId": "rep-uuid",
    "clientName": "Med Spa Beauty",
    "status": "demo_scheduled"
  }
}
```

---

## 🏠 Customer Dashboard APIs

**For logged-in tenants (customers)**

### Dashboard Overview

```http
GET /dashboard/:tenantId/overview
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "plan": {
        "name": "Professional Plan",
        "price": 1500,
        "callMinutes": 3000,
        "maxPhoneLines": 3
      },
      "status": "active",
      "currentPeriodEnd": "2026-02-01T00:00:00Z"
    },
    "stats": {
      "callsThisMonth": 45,
      "bookingsThisMonth": 12,
      "ordersThisMonth": 23
    },
    "usage": {
      "callMinutes": 1250,
      "callMinutesLimit": 3000,
      "overageMinutes": 0,
      "overageCharges": 0
    },
    "overage": {
      "usedMinutes": 1250,
      "planLimit": 3000,
      "usagePercentage": 41.7,
      "isOverLimit": false,
      "usageStatus": {
        "status": "safe",
        "color": "green",
        "message": "Within usage limit (41.7%)"
      }
    }
  }
}
```

**Frontend Widget:**
```jsx
<UsageWidget>
  <ProgressBar
    value={overage.usagePercentage}
    color={overage.usageStatus.color}
  />
  <p>{overage.usageStatus.message}</p>
  <Stats>
    <Stat label="Used" value={`${usage.callMinutes} min`} />
    <Stat label="Limit" value={`${usage.callMinutesLimit} min`} />
  </Stats>
  {overage.isOverLimit && (
    <Alert type="warning">
      Overage charges: ${overage.overageCharges}
    </Alert>
  )}
</UsageWidget>
```

---

### Get Call History

```http
GET /dashboard/:tenantId/calls?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call-uuid",
        "from": "+15551111111",
        "duration": 145,
        "status": "completed",
        "recordingUrl": "https://...",
        "transcript": "Customer called to make a reservation...",
        "createdAt": "2026-01-13T14:30:00Z"
      }
    ],
    "total": 145,
    "page": 1,
    "pages": 8
  }
}
```

---

## 🔧 Services Management (Menu/Catalog)

### 1. Get Services

```http
GET /services?available=true&category=pizza
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "service-uuid",
        "name": "Pizza Margarita",
        "category": "pizza",
        "price": 12.00,
        "duration": null,
        "available": true,
        "image": "https://example.com/pizza.jpg",
        "modifiers": {
          "size": ["Small", "Medium", "Large"],
          "toppings": ["Extra Cheese", "Olives"]
        },
        "stockQuantity": 50
      }
    ],
    "pagination": {...}
  }
}
```

---

### 2. Create Service

```http
POST /services
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Caesar Salad",
  "description": "Fresh romaine lettuce with Caesar dressing",
  "category": "salads",
  "price": 8.50,
  "available": true,
  "stockQuantity": 20,
  "modifiers": {
    "extras": ["Grilled Chicken +$3", "Shrimp +$5"]
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "service-uuid",
    "name": "Caesar Salad",
    "price": 8.50
  }
}
```

---

## 📦 Orders Management

### Create Order

```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json
```

**Request:**
```json
{
  "customerPhone": "+15551234567",
  "customerName": "Jane Doe",
  "items": [
    {
      "serviceId": "service-uuid",
      "name": "Pizza Margarita",
      "price": 12.00,
      "quantity": 2
    }
  ],
  "deliveryType": "delivery",
  "deliveryAddress": "123 Main St, City",
  "notes": "Extra sauce please"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order-uuid",
    "customerPhone": "+15551234567",
    "subtotal": 24.00,
    "tax": 4.32,
    "total": 28.32,
    "status": "pending",
    "paymentStatus": "pending"
  }
}
```

---

## 📊 Analytics

### Get Revenue Analytics

```http
GET /admin/analytics/revenue?period=monthly&months=6
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 145000,
    "monthlyBreakdown": [
      { "month": "2025-08", "revenue": 18000 },
      { "month": "2025-09", "revenue": 22000 },
      { "month": "2025-10", "revenue": 25000 }
    ],
    "topTenants": [
      { "name": "Pizza House", "revenue": 4500 }
    ]
  }
}
```

**Frontend Chart:**
```jsx
<LineChart data={monthlyBreakdown}>
  <XAxis dataKey="month" />
  <YAxis />
  <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
</LineChart>
```

---

## 🎨 Frontend Code Examples

### React Hooks Pattern

```javascript
// useFetch.js
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch(`https://api.firstring.ai/api${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        setData(data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}

// Component usage
function LeadsPage() {
  const { data: leads, loading } = useFetch('/leads?status=new');

  if (loading) return <Spinner />;

  return (
    <LeadsTable leads={leads} />
  );
}
```

---

### Admin Panel Layout

```jsx
// AdminLayout.jsx
function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <Sidebar>
        <SidebarLink to="/admin/dashboard" icon={<DashboardIcon />}>
          Dashboard
        </SidebarLink>
        <SidebarLink to="/admin/leads" icon={<LeadsIcon />}>
          Leads
        </SidebarLink>
        <SidebarLink to="/admin/tenants" icon={<TenantsIcon />}>
          Tenants
        </SidebarLink>
        <SidebarLink to="/admin/certified-reps" icon={<RepIcon />}>
          Certified Reps
        </SidebarLink>
      </Sidebar>

      <MainContent>
        <Topbar>
          <UserMenu />
        </Topbar>
        {children}
      </MainContent>
    </div>
  );
}
```

---

## 🚨 Error Handling

All APIs return consistent error format:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [...]
  }
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

**Frontend Error Handler:**
```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API Error');
    }

    return data;
  } catch (error) {
    toast.error(error.message);
    throw error;
  }
}
```

---

## 📱 Quick Reference - Most Used Endpoints

### Admin Panel Priority

```
1. GET  /admin/overview              - Dashboard stats
2. GET  /leads                       - Leads list
3. POST /leads/:id/convert           - Convert lead
4. GET  /admin/tenants               - Tenants list
5. POST /leads/payment-link/resend   - Resend payment
6. GET  /certified-reps              - Reps list
```

### Customer Dashboard Priority

```
1. GET  /dashboard/:tenantId/overview   - Dashboard
2. GET  /services                       - Menu/catalog
3. POST /orders                         - Create order
4. GET  /dashboard/:tenantId/calls      - Call history
```

### Public Website Priority

```
1. POST /leads                     - Contact form
2. GET  /subscriptions/plans       - Pricing page
```

---

## 🎯 Next Steps

1. **Set up Axios instance** with base URL and interceptors
2. **Create API service layer** (services/api.js)
3. **Implement authentication flow** with token refresh
4. **Build reusable components** (Table, Card, Form, etc.)
5. **Add state management** (Context API or Redux)
6. **Implement real-time updates** (WebSocket for live data)

---

**Complete API Documentation**
**Version:** 1.0
**Last Updated:** 2026-01-13
