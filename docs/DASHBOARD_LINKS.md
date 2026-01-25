# Dashboard API Links Reference

All API endpoints for the user dashboard - quick reference.

---

## 🔐 Authentication

```
POST   /api/auth/register                      - Registration
POST   /api/auth/login                         - Login (subscription status included)
POST   /api/auth/logout                        - Logout
POST   /api/auth/request-otp                   - Password reset OTP
POST   /api/auth/set-password-after-otp        - Password change + email
GET    /api/auth/me                            - Current user
PUT    /api/auth/profile                       - Profile update
PUT    /api/auth/change-password               - Password change
```

---

## 🏢 Tenant Management

```
GET    /api/tenants                            - All tenants (admin)
POST   /api/tenants                            - New tenant (admin)
GET    /api/tenants/:id                        - Tenant details ⚠️ Whop
PUT    /api/tenants/:id                        - Tenant update ⚠️ Whop
DELETE /api/tenants/:id                        - Tenant deactivate (admin)
GET    /api/tenants/:id/stats                  - Tenant stats ⚠️ Whop
GET    /api/tenants/stats/all                  - All tenants stats (admin)
PUT    /api/tenants/:id/subscription           - Subscription update (admin)
```

---

## 🤖 AI Agent Configuration

```
GET    /api/tenants/:id/agent-config           - Read agent config
PATCH  /api/tenants/:id/agent-config           - Update agent config
                                                 • customAgentName
                                                 • agentVoiceGender (male/female)
                                                 • agentVoiceId
                                                 • agentTemperature (0.0-1.0)
                                                 • customAgentPrompt
                                                 • enabledTools []
```

---

## 🌐 Language Settings

```
GET    /api/tenants/languages                  - Supported languages
POST   /api/tenants/languages/test             - Translation test
PUT    /api/tenants/:id/language               - Set default language
```

---

## 📦 Orders

```
GET    /api/orders                             - Orders list ⚠️ Whop
POST   /api/orders                             - New order ⚠️ Whop
GET    /api/orders/:id                         - Order details ⚠️ Whop
PUT    /api/orders/:id                         - Order update ⚠️ Whop
DELETE /api/orders/:id                         - Order cancel ⚠️ Whop
GET    /api/orders/:id/status                  - Order status
```

---

## 📞 Calls (Call History)

```
GET    /api/calls                              - Call history ⚠️ Whop
GET    /api/calls/:id                          - Call details ⚠️ Whop
POST   /api/calls/:id/feedback                 - Call feedback
GET    /api/calls/stats                        - Call stats ⚠️ Whop
```

---

## 📅 Bookings

```
GET    /api/bookings                           - Bookings list ⚠️ Whop
POST   /api/bookings                           - New booking ⚠️ Whop
GET    /api/bookings/:id                       - Booking details ⚠️ Whop
PUT    /api/bookings/:id                       - Booking update ⚠️ Whop
DELETE /api/bookings/:id                       - Booking cancel ⚠️ Whop
GET    /api/bookings/calendar                  - Calendar view ⚠️ Whop
```

---

## 🛠️ Services

```
GET    /api/services                           - Services list ⚠️ Whop
POST   /api/services                           - New service ⚠️ Whop
GET    /api/services/:id                       - Service details ⚠️ Whop
PUT    /api/services/:id                       - Service update ⚠️ Whop
DELETE /api/services/:id                       - Service delete ⚠️ Whop
```

---

## 🏪 POS Integration (Toast, Square, Clover)

```
POST   /api/pos-integrations/tenants/:id/configure                - POS configure
GET    /api/pos-integrations/tenants/:id/config                   - Read POS config
POST   /api/pos-integrations/tenants/:id/test                     - Connection test
POST   /api/pos-integrations/tenants/:id/sync-menu                - Menu sync
POST   /api/pos-integrations/tenants/:id/orders/:orderId/push     - Order push to POS
POST   /api/pos-integrations/tenants/:id/orders/:orderId/cancel   - Order cancel
```

---

## 🔌 Integrations (Discord, WhatsApp)

```
GET    /api/integrations                       - Integrations list ⚠️ Whop
POST   /api/integrations/discord               - Discord connect ⚠️ Whop
DELETE /api/integrations/discord               - Discord disconnect ⚠️ Whop
POST   /api/integrations/whatsapp              - WhatsApp connect ⚠️ Whop
```

---

## 💳 Stripe Subscriptions

```
POST   /api/subscriptions/create-checkout      - Create checkout session
                                                 • priceId
                                                 • setupFeeAmount (optional, $1 = 100)
GET    /api/subscriptions/session/:sessionId   - Session details
GET    /api/subscriptions/customer/:customerId - Customer subscriptions
POST   /api/subscriptions/:id/cancel           - Subscription cancel
GET    /api/subscriptions/:id                  - Subscription details
```

---

## 🪝 Webhooks (External)

```
POST   /api/webhooks/stripe                    - Stripe webhook (payment, subscription)
POST   /api/webhooks/whop                      - Whop webhook (membership)
POST   /api/webhooks/retell                    - Retell AI webhook (calls)
POST   /api/webhooks/toast                     - Toast POS webhook (orders)
```

---

## 📊 Admin

```
GET    /api/tenants/stats/all                  - All tenants stats (admin only)
GET    /api/admin/dashboard                    - Admin dashboard (admin only)
GET    /api/admin/revenue                      - Revenue stats (admin only)
GET    /api/admin/users                        - User stats (admin only)
```

---

## 📰 Blog & Marketing (Public)

```
GET    /api/blog/posts                         - Blog posts list
GET    /api/blog/posts/:slug                   - Blog post details
GET    /api/partners/logos                     - Partner logos
```

---

## 🎯 Legend

- ⚠️ **Whop** - Requires Whop subscription verification
  - Active subscription: Full access
  - Expired + Grace period (7 days): Access with warnings
  - Grace period ended: 403 Forbidden

- **(admin)** - Requires admin role
- **(public)** - No authentication required

---

## 📋 Frontend Dashboard Structure (Recommended)

```
/dashboard
  ├── /                          → Overview (stats, activity)
  ├── /calls                     → Call history
  ├── /orders                    → Orders management
  ├── /bookings                  → Bookings calendar
  ├── /services                  → Services CRUD
  ├── /customers                 → Customer database
  ├── /settings
  │   ├── /general               → Tenant settings
  │   ├── /agent                 → AI Agent customization ⭐
  │   ├── /language              → Language settings
  │   ├── /integrations          → POS, Discord, WhatsApp
  │   └── /billing               → Subscription management ⭐
  ├── /subscription
  │   ├── /plans                 → Pricing (monthly/yearly)
  │   ├── /checkout              → Stripe checkout
  │   ├── /success               → Payment success
  │   └── /cancel                → Payment cancelled
  └── /profile                   → User profile

/admin
  ├── /                          → Admin dashboard
  ├── /tenants                   → Tenants management
  ├── /users                     → Users management
  └── /revenue                   → Revenue analytics
```

---

## 🔥 Most Important Endpoints

### **User Dashboard Must-Haves:**

1. **Authentication:**
   - `POST /api/auth/login` - Login with subscription status
   - `GET /api/auth/me` - Current user info

2. **Tenant Stats:**
   - `GET /api/tenants/:id/stats` - Dashboard overview data

3. **Agent Customization:**
   - `GET /api/tenants/:id/agent-config` - Load current config
   - `PATCH /api/tenants/:id/agent-config` - Save changes

4. **Subscription Management:**
   - `POST /api/subscriptions/create-checkout` - Start subscription
   - Check `_subscription` field in login response

5. **Call History:**
   - `GET /api/calls` - Recent calls list

6. **Orders:**
   - `GET /api/orders` - Orders list
   - `POST /api/orders` - Create order

7. **POS Integration:**
   - `POST /api/pos-integrations/tenants/:id/configure` - Setup Toast POS
   - `POST /api/pos-integrations/tenants/:id/test` - Test connection

---

## 💡 Quick Integration Examples

### **Login with Subscription Check:**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const data = await response.json();

// Check subscription status
if (data._subscription?.status === 'expired') {
  showWarningBanner(data._subscription.warning);
}
```

### **Load Dashboard Stats:**
```typescript
const stats = await fetch(`/api/tenants/${tenantId}/stats`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### **Agent Customization:**
```typescript
// Load config
const config = await fetch(`/api/tenants/${tenantId}/agent-config`);

// Update
await fetch(`/api/tenants/${tenantId}/agent-config`, {
  method: 'PATCH',
  body: JSON.stringify({
    customAgentName: 'Mario',
    agentVoiceGender: 'male',
    agentTemperature: 0.8
  })
});
```

### **Stripe Checkout:**
```typescript
const { checkoutUrl } = await fetch('/api/subscriptions/create-checkout', {
  method: 'POST',
  body: JSON.stringify({
    priceId: 'price_1OabcDef...',
    setupFeeAmount: 100 // $1.00
  })
});

window.location.href = checkoutUrl;
```

---

## 📚 Documentation Files

- `/docs/FEATURE_IMPLEMENTATION_GUIDE.md` - Full implementation guide
- `/docs/STRIPE_SETUP.md` - Stripe integration guide
- `/docs/TOAST_POS_SETUP.md` - Toast POS setup guide
- `/docs/DASHBOARD_LINKS.md` - This file (quick reference)

---

**Last Updated:** January 20, 2026
