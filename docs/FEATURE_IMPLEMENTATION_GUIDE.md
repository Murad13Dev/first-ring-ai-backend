# Feature Implementation Guide - First Ring AI

Step-by-step usage guide for all new features

---

## 📋 **Table of Contents**

1. [Password Change Confirmation Email](#1-password-change-confirmation-email)
2. [Whop Subscription Access Control](#2-whop-subscription-access-control)
3. [Toast POS Integration (Mario's Butcher)](#3-toast-pos-integration-marios-butcher)
4. [AI Agent Customization](#4-ai-agent-customization)
5. [Stripe Yearly Subscriptions + Setup Fee](#5-stripe-yearly-subscriptions--setup-fee)
6. [Dashboard Links Reference](#6-dashboard-links-reference)

---

## 1. Password Change Confirmation Email

### **What does it do?**
When a user changes their password via OTP, a confirmation email is automatically sent.

### **Usage flow:**

#### **Frontend Flow:**
```
1. User clicks "Forgot Password" button
2. Sends email → POST /api/auth/request-otp
3. Enters OTP code
4. Sets new password → POST /api/auth/set-password-after-otp
5. ✅ Backend automatically sends confirmation email
6. User checks email and receives confirmation
```

#### **API Endpoint:**
```http
POST /api/auth/set-password-after-otp
Content-Type: application/json

{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NewSecurePassword123!"
}
```

#### **Backend Flow (Automatic):**
```typescript
// src/modules/auth/auth.service.ts:697-711
async setPasswordAfterOTP(sessionToken, newPassword) {
  // 1. Token is verified
  // 2. Password is hashed and updated
  // 3. ✅ Email is automatically sent
  await this.emailService.sendPasswordChangeConfirmationEmail(
    user.email,
    user.name
  );
  // 4. Success response is returned
}
```

#### **Email Template:**
- **Subject:** "Password Changed Successfully - First Ring AI"
- **Content:**
  - Confirmation message
  - Date and time of change
  - Security warning (if you didn't make this change)
  - "Login Now" button
  - Security tips
  - Support email

### **Testing:**
```bash
# 1. Send OTP request
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Change password
curl -X POST http://localhost:5000/api/auth/set-password-after-otp \
  -H "Content-Type: application/json" \
  -d '{
    "sessionToken": "your_session_token",
    "newPassword": "NewPassword123!"
  }'

# 3. Check email (test@example.com)
```

---

## 2. Whop Subscription Access Control

### **What does it do?**
Checks Whop subscription status for all tenant owners and applies access control.

### **Strategy: SOFT BLOCK (7-day Grace Period)**

```
Active Subscription ✅
  ↓
Expires 🔴
  ↓
7-Day Grace Period ⚠️ (SOFT BLOCK - access with warnings)
  ↓
Grace Period Ends 🚫 (HARD BLOCK - no access)
```

### **Usage flow:**

#### **1. Webhook Setup (One-time):**

Configure webhook in Whop Dashboard:
```
URL: https://your-domain.com/api/webhooks/whop
Events:
  - membership_went_valid
  - membership_went_invalid
  - payment_succeeded
Secret: Copy and add to .env
```

**.env file:**
```bash
WHOP_API_KEY=your_whop_api_key
WHOP_WEBHOOK_SECRET=whsec_xxxxx
WHOP_COMPANY_ID=your_company_id
```

#### **2. Subscription Flow:**

**A. User subscribes (on Whop):**
```
1. User purchases plan from Whop
2. Whop sends webhook: payment_succeeded
3. Backend receives webhook
4. User model is updated for tenant owner:
   - whopSubscriptionActive = true
   - whopSubscriptionExpiry = date
   - whopGracePeriodEnds = null
5. ✅ User gets full access
```

**B. Subscription expires:**
```
1. Subscription expires
2. Whop sends webhook: membership_went_invalid
3. Backend starts 7-day grace period:
   - whopSubscriptionActive = false
   - whopGracePeriodEnds = today + 7 days
4. ⚠️ SOFT BLOCK activates
5. User can access APIs, but every response includes a warning message
```

**C. Grace period ends:**
```
1. 7 days pass
2. Middleware checks: now > whopGracePeriodEnds
3. 🚫 HARD BLOCK activates
4. User gets 403 error: "Subscription expired"
```

#### **3. Middleware Protection:**

**On all protected routes:**
```typescript
// src/modules/tenants/tenants.routes.ts
router.get('/:id',
  authenticateToken,           // 1. JWT check
  checkWhopSubscription,       // 2. Subscription check
  injectSubscriptionStatus,    // 3. Add warning
  tenantsController.getTenantById
);
```

**Protected APIs:**
- `/api/tenants/*` (tenant CRUD)
- `/api/orders/*` (order management)
- `/api/calls/*` (call history)
- `/api/bookings/*` (booking system)
- `/api/services/*` (services)
- `/api/integrations/*` (POS, Discord, etc)

#### **4. Login Response (Subscription Status):**

**Active Subscription:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": { ... },
  "_subscription": {
    "status": "active",
    "expiresAt": "2026-02-20T00:00:00Z",
    "daysRemaining": 31
  }
}
```

**Expired (Grace Period):**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "user": { ... },
  "_subscription": {
    "status": "expired",
    "inGracePeriod": true,
    "gracePeriodEnds": "2026-01-27T00:00:00Z",
    "warning": "Your subscription has expired. You have 7 days remaining to renew."
  }
}
```

**Expired (Grace Period Ended):**
```json
{
  "error": "Subscription expired",
  "code": "SUBSCRIPTION_EXPIRED",
  "message": "Your subscription has expired. Please renew to continue using First Ring AI."
}
```

#### **5. Frontend Integration:**

**Check subscription status on login:**
```typescript
// Frontend - Login response
const response = await fetch('/api/auth/login', { ... });
const data = await response.json();

if (data._subscription) {
  if (data._subscription.status === 'expired') {
    // Show banner: "Subscription expired! X days remaining"
    showWarningBanner(data._subscription.warning);
  }

  if (data._subscription.daysRemaining <= 3) {
    // Show: "Subscription expires in 3 days"
    showExpiryWarning(data._subscription.daysRemaining);
  }
}
```

**Check warning in API responses:**
```typescript
// Frontend - API calls
const response = await fetch('/api/tenants/123', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();

if (data._subscription?.warning) {
  // Show persistent banner
  showSubscriptionWarning(data._subscription.warning);
}
```

### **Testing:**

```bash
# 1. Add Whop subscription to user in database
UPDATE users
SET
  "whopSubscriptionActive" = true,
  "whopSubscriptionExpiry" = NOW() + INTERVAL '30 days',
  "whopMembershipId" = 'mem_test123'
WHERE email = 'test@example.com';

# 2. Login and check subscription status
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 3. Expire subscription and test grace period
UPDATE users
SET
  "whopSubscriptionActive" = false,
  "whopSubscriptionExpiry" = NOW() - INTERVAL '1 day',
  "whopGracePeriodEnds" = NOW() + INTERVAL '6 days'
WHERE email = 'test@example.com';

# 4. Make API call and see warning
curl -X GET http://localhost:5000/api/tenants/tenant_id \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response will include _subscription.warning

# 5. End grace period and test hard block
UPDATE users
SET "whopGracePeriodEnds" = NOW() - INTERVAL '1 day'
WHERE email = 'test@example.com';

# 6. Make API call - will get 403 error
curl -X GET http://localhost:5000/api/tenants/tenant_id \
  -H "Authorization: Bearer YOUR_TOKEN"
# Response: 403 Forbidden - "Subscription expired"
```

---

## 3. Toast POS Integration (Mario's Butcher)

### **What does it do?**
Integration with restaurant POS system - create orders, sync menu, cancel orders.

### **Usage flow:**

#### **1. Get Toast API Credentials:**

```
1. Send email to Toast support: partnersupport@toasttab.com
2. Request Partner API access
3. Get credentials:
   - Restaurant External ID (UUID format)
   - Access Token (starts with TOAST)
   - Environment: sandbox / production
```

#### **2. Configure Toast POS for tenant:**

**API Call:**
```bash
curl -X POST http://localhost:5000/api/pos-integrations/tenants/TENANT_ID/configure \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "toast",
    "apiKey": "TOAST_ACCESS_TOKEN_HERE",
    "merchantId": "RESTAURANT_EXTERNAL_ID_HERE",
    "environment": "production"
  }'
```

**Response:**
```json
{
  "id": "tenant_123",
  "name": "Mario's Butcher",
  "posConfig": {
    "provider": "toast",
    "apiKey": "TOAST_...",
    "merchantId": "a7b8c9d0-...",
    "environment": "production"
  }
}
```

#### **3. Test connection:**

```bash
curl -X POST http://localhost:5000/api/pos-integrations/tenants/TENANT_ID/test \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Success:**
```json
{
  "success": true,
  "message": "POS connection successful"
}
```

#### **4. Sync menu (from Toast):**

```bash
curl -X POST http://localhost:5000/api/pos-integrations/tenants/TENANT_ID/sync-menu \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Response:**
```json
[
  {
    "guid": "menu-item-abc123",
    "name": "Ribeye Steak",
    "price": 29.99,
    "category": "Meats",
    "description": "Premium cut ribeye",
    "available": true
  },
  {
    "guid": "menu-item-def456",
    "name": "Ground Beef (1lb)",
    "price": 8.99,
    "category": "Ground Meats"
  }
]
```

#### **5. Push order (to Toast):**

**Scenario:** Customer talks to AI and places order

```typescript
// 1. Order is created in First Ring AI (from AI call)
const order = await prisma.order.create({
  data: {
    tenantId: 'mario_butcher',
    customerName: 'John Doe',
    customerPhone: '+1234567890',
    items: [
      { name: 'Ribeye Steak', quantity: 2, price: 29.99 },
      { name: 'Ground Beef', quantity: 3, price: 8.99 }
    ],
    total: 86.95,
    status: 'pending'
  }
});

// 2. Order is pushed to Toast
```

**API Call:**
```bash
curl -X POST http://localhost:5000/api/pos-integrations/tenants/TENANT_ID/orders/ORDER_ID/push \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Response:**
```json
{
  "externalOrderId": "toast-order-guid-12345",
  "status": "approved",
  "estimatedTime": "15-20 minutes"
}
```

**Database update:**
```typescript
// Toast order ID is added to order
await prisma.order.update({
  where: { id: order.id },
  data: {
    externalOrderId: 'toast-order-guid-12345',
    status: 'approved',
    pushedToPosAt: new Date()
  }
});
```

#### **6. Cancel order:**

```bash
curl -X POST http://localhost:5000/api/pos-integrations/tenants/TENANT_ID/orders/ORDER_ID/cancel \
  -H "Authorization: Bearer JWT_TOKEN"
```

### **Complete Flow (Mario's Butcher):**

```
1. Customer calls Mario's Butcher
2. AI agent answers
3. Customer places order: "2 ribeye steak, 3lb ground beef"
4. AI confirms order details
5. Order is created in First Ring AI
6. Order is automatically pushed to Toast POS
7. Mario sees the order on Toast POS
8. Order is prepared and customer picks up
9. ✅ Done
```

### **Documentation:**
Full setup guide: `/docs/TOAST_POS_SETUP.md`

---

## 4. AI Agent Customization

### **What does it do?**
Tenant can customize their AI agent: voice, name, prompt, temperature, tools.

### **Customization Options:**

| Field | Type | Options | Default |
|-------|------|---------|---------|
| Agent Name | String | Any name | Tenant name + "Assistant" |
| Voice Gender | Enum | male / female | female |
| Voice ID | String | Retell voice IDs | Default female voice |
| Temperature | Float | 0.0 - 1.0 | 0.7 |
| System Prompt | Text | Custom prompt | Auto-generated |
| Enabled Tools | Array | booking, ordering, faq, etc | All enabled |

### **Usage flow:**

#### **1. Get current config:**

```bash
curl -X GET http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN"
```

**Response:**
```json
{
  "config": {
    "customAgentName": null,
    "customAgentPrompt": null,
    "agentVoiceGender": null,
    "agentVoiceId": null,
    "agentTemperature": null,
    "enabledTools": null
  },
  "defaults": {
    "agentName": "Mario's Butcher Assistant",
    "voiceGender": "female",
    "voiceId": "default_female_voice_id",
    "temperature": 0.7,
    "systemPrompt": "You are a helpful assistant for Mario's Butcher...",
    "tools": ["booking", "ordering", "faq", "general"]
  },
  "options": {
    "voices": {
      "male": [
        { "id": "voice_male_1", "name": "Professional Male", "description": "Clear, professional male voice" },
        { "id": "voice_male_2", "name": "Friendly Male", "description": "Warm, friendly male voice" }
      ],
      "female": [
        { "id": "voice_female_1", "name": "Professional Female", "description": "Clear, professional female voice" },
        { "id": "voice_female_2", "name": "Friendly Female", "description": "Warm, friendly female voice" }
      ]
    },
    "tools": [
      { "id": "booking", "name": "Appointment Booking", "description": "Schedule appointments" },
      { "id": "ordering", "name": "Order Taking", "description": "Take customer orders" },
      { "id": "faq", "name": "FAQ Answering", "description": "Answer common questions" },
      { "id": "general", "name": "General Conversation", "description": "Handle general queries" }
    ],
    "temperatureRange": {
      "min": 0.0,
      "max": 1.0,
      "description": "Lower = more focused, Higher = more creative"
    }
  }
}
```

#### **2. Update config:**

**Scenario A: Wants male voice**
```bash
curl -X PATCH http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentVoiceGender": "male",
    "agentVoiceId": "voice_male_1"
  }'
```

**Scenario B: Custom agent name + temperature**
```bash
curl -X PATCH http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customAgentName": "Mario",
    "agentTemperature": 0.8
  }'
```

**Scenario C: Custom system prompt**
```bash
curl -X PATCH http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customAgentPrompt": "You are Mario, the owner of Mario'\''s Butcher Shop. You are friendly, knowledgeable about meats, and always ready to help customers choose the perfect cut. You speak with a warm Italian-American accent and often share cooking tips."
  }'
```

**Scenario D: Only ordering and faq tools**
```bash
curl -X PATCH http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabledTools": ["ordering", "faq"]
  }'
```

**Scenario E: Full customization**
```bash
curl -X PATCH http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customAgentName": "Mario",
    "agentVoiceGender": "male",
    "agentVoiceId": "voice_male_1",
    "agentTemperature": 0.75,
    "customAgentPrompt": "Custom prompt here...",
    "enabledTools": ["ordering", "faq", "general"]
  }'
```

**Success Response:**
```json
{
  "id": "tenant_123",
  "name": "Mario's Butcher",
  "customAgentName": "Mario",
  "agentVoiceGender": "male",
  "agentVoiceId": "voice_male_1",
  "agentTemperature": 0.75,
  "customAgentPrompt": "Custom prompt...",
  "enabledTools": ["ordering", "faq", "general"],
  "updatedAt": "2026-01-20T10:30:00Z",
  "_message": "Agent configuration updated and synced to Retell AI"
}
```

#### **3. Retell AI Sync (Automatic):**

Backend automatically syncs to Retell AI:

```typescript
// src/modules/tenants/tenants.service.ts:965-1030
async updateAgentConfig(tenantId, config) {
  // 1. Update tenant in database
  const tenant = await prisma.tenant.update({ ... });

  // 2. If Retell agent exists, sync it
  if (tenant.retellAgentId) {
    await this.syncAgentConfigToRetell(tenant);
  }

  return tenant;
}

private async syncAgentConfigToRetell(tenant) {
  // Custom config → Retell API format
  const retellConfig = {
    agent_name: tenant.customAgentName || defaultName,
    voice_id: tenant.agentVoiceId || defaultVoice,
    voice_temperature: tenant.agentTemperature || 0.7,
    general_prompt: tenant.customAgentPrompt || generatedPrompt,
    // ... tools config
  };

  await retellService.updateAgent(tenant.retellAgentId, retellConfig);
}
```

### **Frontend Integration:**

**Settings Page - Agent Customization:**

```typescript
// 1. Load config
const { data } = await fetch('/api/tenants/tenant_id/agent-config');

// 2. Show form
<Form>
  <Input
    label="Agent Name"
    value={data.config.customAgentName || data.defaults.agentName}
  />

  <Select
    label="Voice Gender"
    options={data.options.voices}
    value={data.config.agentVoiceGender}
  />

  <Slider
    label="Temperature"
    min={0.0}
    max={1.0}
    step={0.1}
    value={data.config.agentTemperature || data.defaults.temperature}
  />

  <Textarea
    label="Custom System Prompt"
    value={data.config.customAgentPrompt}
    placeholder={data.defaults.systemPrompt}
  />

  <CheckboxGroup
    label="Enabled Tools"
    options={data.options.tools}
    value={data.config.enabledTools || data.defaults.tools}
  />

  <Button onClick={handleSave}>Save Configuration</Button>
</Form>

// 3. Save
const handleSave = async () => {
  await fetch('/api/tenants/tenant_id/agent-config', {
    method: 'PATCH',
    body: JSON.stringify(formData)
  });

  showSuccess('Agent configuration updated!');
};
```

### **Testing:**

```bash
# 1. Get default config
curl -X GET http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN"

# 2. Update
curl -X PATCH http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customAgentName": "TestBot", "agentTemperature": 0.9}'

# 3. Read again and verify change
curl -X GET http://localhost:5000/api/tenants/TENANT_ID/agent-config \
  -H "Authorization: Bearer JWT_TOKEN"

# 4. Make test call and verify new config works
# (Check agent on Retell dashboard)
```

---

## 5. Stripe Yearly Subscriptions + Setup Fee

### **What does it do?**
Yearly subscription with Stripe + $1 one-time setup fee.

### **Usage flow:**

#### **1. Stripe Setup (One-time):**

**.env Configuration:**
```bash
# Stripe keys
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Product ID (already created)
# prod_Tp9UDaztizJSBf

# Price IDs (will be created)
STRIPE_PRICE_ID_STARTER_YEARLY=price_xxxxx
STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_xxxxx
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_xxxxx
STRIPE_PRICE_ID_EXECUTIVE_YEARLY=price_xxxxx
```

#### **2. Create Yearly Prices:**

**Automated Script:**
```bash
npx ts-node scripts/create-stripe-yearly-prices.ts
```

**Output:**
```
🚀 Starting Stripe YEARLY price creation...

📋 Found 4 plans to create yearly prices for:

💳 Creating YEARLY price for Starter...
   Product ID: prod_Tp9UDaztizJSBf
   Monthly: $500/month
   Yearly: $6000/year
   ✅ Yearly price created: price_1OabcDefGhiJkLmN

💳 Creating YEARLY price for Professional...
   Product ID: prod_xxxxxxxxxxxxx
   Monthly: $1500/month
   Yearly: $18000/year
   ✅ Yearly price created: price_1OabcDefGhiJkLmO

📝 Add these to your .env file:

STRIPE_PRICE_ID_STARTER_YEARLY=price_1OabcDefGhiJkLmN
STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_1OabcDefGhiJkLmO
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_1OabcDefGhiJkLmP
STRIPE_PRICE_ID_EXECUTIVE_YEARLY=price_1OabcDefGhiJkLmQ

✅ .env file updated successfully!
```

#### **3. Create Subscription Checkout (with Setup Fee):**

**Backend API:**
```typescript
import stripeService from './services/stripe.service';

// Create checkout session
const session = await stripeService.createSubscriptionCheckout({
  tenantId: tenant.id,
  customerEmail: user.email,
  customerName: user.name,
  priceId: process.env.STRIPE_PRICE_ID_STARTER_YEARLY, // Yearly price
  setupFeeAmount: 100, // $1.00 in cents
  metadata: {
    plan: 'starter',
    billingCycle: 'yearly',
    userId: user.id
  },
  successUrl: `${process.env.FRONTEND_URL}/subscription/success`,
  cancelUrl: `${process.env.FRONTEND_URL}/subscription/cancel`
});

// Redirect user to checkout
return {
  checkoutUrl: session.checkoutUrl,
  sessionId: session.sessionId
};
```

**API Endpoint:**
```bash
curl -X POST http://localhost:5000/api/subscriptions/create-checkout \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_1OabcDefGhiJkLmN",
    "setupFeeAmount": 100
  }'
```

**Response:**
```json
{
  "sessionId": "cs_test_abc123...",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_abc123...",
  "customer": "cus_abc123"
}
```

#### **4. Checkout Flow:**

```
1. User clicks "Upgrade to Yearly" button
2. Backend creates checkout session (with $1 setup fee)
3. User is redirected to Stripe Checkout
4. Checkout page shows:

   Line Items:
   - Setup Fee: $1.00 (one-time)
   - Starter Plan: $6000.00/year

   Total today: $6,001.00
   Next payment: $6,000.00 (in 1 year)

5. User enters card details
6. Payment is processed
7. User is redirected to Success/Cancel URL
```

#### **5. Webhook Handling:**

**Stripe sends webhook:**
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "customer": "cus_abc123",
      "subscription": "sub_abc123",
      "amount_total": 600100, // $6001.00 (6000 + 1)
      "metadata": {
        "tenantId": "tenant_123",
        "plan": "starter"
      }
    }
  }
}
```

**Backend webhook handler:**
```typescript
// src/controllers/webhook.controller.ts
async handleStripeWebhook(req, res) {
  const event = stripeService.constructWebhookEvent(
    req.body,
    req.headers['stripe-signature']
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Update tenant subscription
    await prisma.tenant.update({
      where: { id: session.metadata.tenantId },
      data: {
        subscriptionStatus: 'active',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        subscriptionPlan: session.metadata.plan,
        subscriptionStartDate: new Date(),
        subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    // Send confirmation email
    await emailService.sendSubscriptionConfirmationEmail(user.email);
  }

  res.json({ received: true });
}
```

#### **6. Frontend Integration:**

**Pricing Page:**
```typescript
const plans = [
  {
    name: 'Starter',
    monthlyPrice: 500,
    yearlyPrice: 6000,
    priceId: 'price_1OabcDefGhiJkLmN',
    setupFee: 1
  },
  // ...
];

const handleSubscribe = async (plan, billingCycle) => {
  const setupFeeAmount = billingCycle === 'yearly' ? 100 : 0;
  const priceId = billingCycle === 'yearly'
    ? plan.priceId
    : plan.monthlyPriceId;

  const response = await fetch('/api/subscriptions/create-checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      priceId,
      setupFeeAmount
    })
  });

  const { checkoutUrl } = await response.json();

  // Redirect to Stripe Checkout
  window.location.href = checkoutUrl;
};
```

**Pricing Display:**
```jsx
<PricingCard plan="Starter">
  <Toggle onChange={setBillingCycle} options={['monthly', 'yearly']}>

  {billingCycle === 'monthly' && (
    <Price>
      <Amount>$500</Amount>
      <Period>/month</Period>
    </Price>
  )}

  {billingCycle === 'yearly' && (
    <div>
      <Price>
        <Amount>$6000</Amount>
        <Period>/year</Period>
      </Price>
      <SetupFee>+ $1 one-time setup fee</SetupFee>
      <Savings>Save $0/year vs monthly</Savings>
      <FirstPayment>First payment: $6,001</FirstPayment>
    </div>
  )}

  <Button onClick={() => handleSubscribe(plan, billingCycle)}>
    Subscribe Now
  </Button>
</PricingCard>
```

### **Payment Breakdown:**

| Billing Cycle | Setup Fee | Subscription | First Payment | Recurring Payment |
|--------------|-----------|--------------|---------------|-------------------|
| Monthly | $0 | $500/mo | $500 | $500/month |
| Yearly | $1 | $6000/yr | **$6001** | $6000/year |

### **Testing:**

```bash
# 1. Create test checkout session
curl -X POST http://localhost:5000/api/subscriptions/create-checkout \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "priceId": "price_1OabcDefGhiJkLmN",
    "setupFeeAmount": 100
  }'

# 2. Go to checkout URL and pay with test card
# Test Card: 4242 4242 4242 4242
# Expiry: any future date
# CVC: any 3 digits

# 3. Test webhook (Stripe CLI)
stripe listen --forward-to localhost:5000/api/webhooks/stripe

# 4. Make test payment and see webhook event
stripe trigger checkout.session.completed

# 5. Check subscription in database
SELECT * FROM tenants WHERE id = 'tenant_123';
```

### **Documentation:**
Full guide: `/docs/STRIPE_SETUP.md`

---

## 6. Dashboard Links Reference

### **🔗 User Dashboard API Endpoints**

All API links needed for dashboard:

#### **Authentication:**
```
POST   /api/auth/register              - Registration
POST   /api/auth/login                 - Login (subscription status included)
POST   /api/auth/logout                - Logout
POST   /api/auth/request-otp           - Password reset OTP
POST   /api/auth/set-password-after-otp - Password change + email
GET    /api/auth/me                    - Current user info
PUT    /api/auth/profile               - Profile update
PUT    /api/auth/change-password       - Password change
```

#### **Tenant Management:**
```
GET    /api/tenants                    - All tenants (admin only)
POST   /api/tenants                    - Create new tenant (admin)
GET    /api/tenants/:id                - Tenant details (Whop protected)
PUT    /api/tenants/:id                - Tenant update (Whop protected)
DELETE /api/tenants/:id                - Tenant deactivate (admin)
GET    /api/tenants/:id/stats          - Tenant statistics (Whop protected)
PUT    /api/tenants/:id/subscription   - Subscription update (admin)
```

#### **AI Agent Configuration:**
```
GET    /api/tenants/:id/agent-config   - Read agent config
PATCH  /api/tenants/:id/agent-config   - Update agent config
                                         (voice, name, prompt, temperature, tools)
```

#### **Language Settings:**
```
GET    /api/tenants/languages          - Supported languages list
POST   /api/tenants/languages/test     - Translation test
PUT    /api/tenants/:id/language       - Set tenant default language
```

#### **Orders:**
```
GET    /api/orders                     - Orders list (Whop protected)
POST   /api/orders                     - Create new order (Whop protected)
GET    /api/orders/:id                 - Order details (Whop protected)
PUT    /api/orders/:id                 - Order update (Whop protected)
DELETE /api/orders/:id                 - Order cancel (Whop protected)
GET    /api/orders/:id/status          - Order status check
```

#### **Calls (Call History):**
```
GET    /api/calls                      - Call history (Whop protected)
GET    /api/calls/:id                  - Call details (Whop protected)
POST   /api/calls/:id/feedback         - Add call feedback
GET    /api/calls/stats                - Call statistics
```

#### **Bookings:**
```
GET    /api/bookings                   - Bookings list (Whop protected)
POST   /api/bookings                   - Create new booking (Whop protected)
GET    /api/bookings/:id               - Booking details (Whop protected)
PUT    /api/bookings/:id               - Booking update (Whop protected)
DELETE /api/bookings/:id               - Booking cancel (Whop protected)
GET    /api/bookings/calendar          - Calendar view
```

#### **Services:**
```
GET    /api/services                   - Services list (Whop protected)
POST   /api/services                   - Create new service (Whop protected)
GET    /api/services/:id               - Service details (Whop protected)
PUT    /api/services/:id               - Service update (Whop protected)
DELETE /api/services/:id               - Service delete (Whop protected)
```

#### **POS Integration (Toast, Square, Clover):**
```
POST   /api/pos-integrations/tenants/:id/configure  - POS configure
GET    /api/pos-integrations/tenants/:id/config     - Read POS config
POST   /api/pos-integrations/tenants/:id/test       - Connection test
POST   /api/pos-integrations/tenants/:id/sync-menu  - Menu sync
POST   /api/pos-integrations/tenants/:id/orders/:orderId/push   - Order push to POS
POST   /api/pos-integrations/tenants/:id/orders/:orderId/cancel - Order cancel in POS
```

#### **Integrations (Discord, WhatsApp, etc):**
```
GET    /api/integrations               - Integration list (Whop protected)
POST   /api/integrations/discord       - Discord connect (Whop protected)
DELETE /api/integrations/discord       - Discord disconnect (Whop protected)
POST   /api/integrations/whatsapp      - WhatsApp connect
```

#### **Stripe Subscriptions:**
```
POST   /api/subscriptions/create-checkout          - Create checkout session
GET    /api/subscriptions/session/:sessionId       - Session details
GET    /api/subscriptions/customer/:customerId     - Customer subscriptions
POST   /api/subscriptions/:id/cancel               - Subscription cancel
GET    /api/subscriptions/:id                      - Subscription details
```

#### **Webhooks (External Services):**
```
POST   /api/webhooks/stripe            - Stripe webhook handler
POST   /api/webhooks/whop              - Whop webhook handler
POST   /api/webhooks/retell            - Retell AI webhook handler
POST   /api/webhooks/toast             - Toast POS webhook handler
```

#### **Admin Statistics:**
```
GET    /api/tenants/stats/all          - All tenants stats (admin)
GET    /api/admin/dashboard            - Admin dashboard stats (admin)
GET    /api/admin/revenue              - Revenue stats (admin)
GET    /api/admin/users                - User stats (admin)
```

#### **Blog & Marketing (Public):**
```
GET    /api/blog/posts                 - Blog posts list
GET    /api/blog/posts/:slug           - Blog post details
GET    /api/partners/logos             - Partner logos list
```

---

### **🎨 Frontend Dashboard Pages (Recommended Structure)**

```
/dashboard
  ├── /overview                 → Dashboard home (stats, recent activity)
  ├── /calls                    → Call history and analytics
  ├── /orders                   → Orders management
  ├── /bookings                 → Bookings calendar
  ├── /services                 → Services management
  ├── /customers                → Customer database
  ├── /settings
  │   ├── /general              → Tenant settings
  │   ├── /agent                → AI Agent customization
  │   ├── /language             → Language settings
  │   ├── /integrations         → POS, Discord, WhatsApp
  │   └── /billing              → Subscription and billing
  ├── /subscription
  │   ├── /plans                → Pricing and plans
  │   ├── /checkout             → Stripe checkout
  │   ├── /success              → Payment success
  │   └── /cancel               → Payment cancel
  └── /profile                  → User profile settings
```

---

### **📊 Dashboard Component Integration:**

#### **1. Overview Dashboard:**
```typescript
// Fetch dashboard data
const { data } = await fetch('/api/tenants/${tenantId}/stats');

<DashboardGrid>
  <StatCard title="Total Calls" value={data.totalCalls} />
  <StatCard title="Orders Today" value={data.ordersToday} />
  <StatCard title="Revenue" value={`$${data.revenue}`} />
  <StatCard title="Bookings" value={data.upcomingBookings} />
</DashboardGrid>

<RecentActivity>
  <CallsList calls={data.recentCalls} />
  <OrdersList orders={data.recentOrders} />
</RecentActivity>
```

#### **2. Agent Settings Page:**
```typescript
// Load agent config
const { data } = await fetch('/api/tenants/${tenantId}/agent-config');

<AgentConfigForm
  currentConfig={data.config}
  defaults={data.defaults}
  options={data.options}
  onSave={handleSaveConfig}
/>
```

#### **3. Subscription Management:**
```typescript
// Check subscription status (from login)
if (user._subscription?.status === 'expired') {
  <SubscriptionBanner
    status="warning"
    message={user._subscription.warning}
    action={() => navigate('/subscription/plans')}
  />
}

// Pricing page
<PricingPlans
  plans={plans}
  currentPlan={user.plan}
  onSubscribe={handleSubscribe}
/>
```

#### **4. POS Integration Setup:**
```typescript
// Configure Toast POS
<POSConfigForm
  provider="toast"
  onSubmit={async (config) => {
    await fetch(`/api/pos-integrations/tenants/${tenantId}/configure`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }}
/>

// Test connection
<Button onClick={async () => {
  const result = await fetch(`/api/pos-integrations/tenants/${tenantId}/test`);
  showToast(result.success ? 'Connected!' : 'Connection failed');
}}>
  Test Connection
</Button>
```

---

## 🚀 Complete Implementation Checklist

### **Backend Setup:**
- [x] Password change email implemented
- [x] Whop subscription middleware active
- [x] Toast POS integration ready
- [x] AI agent customization API ready
- [x] Stripe yearly prices + setup fee ready
- [ ] Database migrations run (`npx prisma migrate deploy`)
- [ ] Environment variables configured (`.env`)
- [ ] Webhooks configured (Stripe, Whop)

### **Frontend Integration:**
- [ ] Login page (subscription status check)
- [ ] Dashboard overview page
- [ ] Agent customization settings page
- [ ] Subscription/billing page
- [ ] POS integration settings page
- [ ] Subscription warning banners
- [ ] Payment checkout flow

### **Testing:**
- [ ] Password reset + email test
- [ ] Whop subscription flow test (active, expired, grace period)
- [ ] Toast POS connection test (Mario's Butcher)
- [ ] Agent config update test
- [ ] Stripe checkout test (with $1 setup fee)
- [ ] Webhook handlers test (Stripe, Whop)

---

**Last Updated:** January 20, 2026
**Version:** 1.0.0
**Author:** First Ring AI Development Team
