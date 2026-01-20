# Stripe Integration Setup Guide

Complete guide for integrating Stripe payments with First Ring AI platform.

---

## 📋 **Table of Contents**
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Creating Stripe Prices](#creating-stripe-prices)
4. [Subscription with Setup Fee](#subscription-with-setup-fee)
5. [API Usage Examples](#api-usage-examples)
6. [Troubleshooting](#troubleshooting)

---

## 🔑 **Prerequisites**

Before setting up Stripe integration, ensure you have:

- ✅ Active Stripe account (test mode or live mode)
- ✅ Stripe API keys (Secret Key, Publishable Key, Webhook Secret)
- ✅ Stripe Products created in dashboard
- ✅ First Ring AI backend running

---

## ⚙️ **Environment Configuration**

### **Step 1: Get Stripe API Keys**

1. **Login to Stripe Dashboard:**
   - Test Mode: https://dashboard.stripe.com/test/apikeys
   - Live Mode: https://dashboard.stripe.com/apikeys

2. **Copy API Keys:**
   ```bash
   # Secret key (starts with sk_test_ or sk_live_)
   STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx

   # Publishable key (starts with pk_test_ or pk_live_)
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
   ```

3. **Get Webhook Secret:**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Create endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Copy signing secret (starts with whsec_)
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### **Step 2: Configure .env File**

Add to your `.env` file:

```bash
# ==========================================
# STRIPE CONFIGURATION
# ==========================================

# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs (Monthly - created by create-stripe-prices.ts)
STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EXECUTIVE=price_xxxxxxxxxxxxx

# Stripe Price IDs (Yearly - created by create-stripe-yearly-prices.ts)
STRIPE_PRICE_ID_STARTER_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EXECUTIVE_YEARLY=price_xxxxxxxxxxxxx
```

---

## 💳 **Creating Stripe Prices**

### **Option A: Using Automated Scripts** (Recommended)

#### **Create Monthly Prices:**
```bash
npx ts-node scripts/create-stripe-prices.ts
```

This will:
- Read all active plans from database
- Create Stripe prices with monthly billing
- Output Price IDs to add to `.env` file
- Automatically update `.env` file

**Example Output:**
```
🚀 Starting Stripe price creation...

📋 Found 4 plans to create prices for:

💳 Creating price for Starter...
   Product ID: prod_xxxxxxxxxxxxx
   Amount: $500/month
   ✅ Price created: price_xxxxxxxxxxxxx

💳 Creating price for Professional...
   Product ID: prod_xxxxxxxxxxxxx
   Amount: $1500/month
   ✅ Price created: price_xxxxxxxxxxxxx

📝 Add these to your .env file:

STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EXECUTIVE=price_xxxxxxxxxxxxx
```

#### **Create Yearly Prices:**
```bash
npx ts-node scripts/create-stripe-yearly-prices.ts
```

This will:
- Read all active plans from database
- Create Stripe prices with yearly billing (monthly price × 12)
- Output Price IDs to add to `.env` file
- Automatically update `.env` file

**Example Output:**
```
🚀 Starting Stripe YEARLY price creation...

📋 Found 4 plans to create yearly prices for:

💳 Creating YEARLY price for Starter...
   Product ID: prod_Tp9UDaztizJSBf
   Monthly: $500/month
   Yearly: $6000/year ($500/month equivalent)
   ✅ Yearly price created: price_xxxxxxxxxxxxx

📝 Add these to your .env file:

STRIPE_PRICE_ID_STARTER_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PROFESSIONAL_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EXECUTIVE_YEARLY=price_xxxxxxxxxxxxx
```

### **Option B: Manual Creation in Stripe Dashboard**

1. **Go to Products:** https://dashboard.stripe.com/test/products
2. **For Each Product:**
   - Click on the product
   - Click "Add another price"
   - Set billing period: **Recurring every 1 year**
   - Set price: **Monthly price × 12** (e.g., $500/mo → $6000/year)
   - Save and copy the Price ID (starts with `price_`)
3. **Add to .env file**

---

## 💰 **Subscription with Setup Fee**

The platform supports adding a one-time setup fee to subscription checkouts.

### **Use Case: $1 Setup Fee + Yearly Subscription**

**Product ID:** `prod_Tp9UDaztizJSBf`

This is perfect for:
- Initial account setup costs
- Onboarding fees
- Hardware/software provisioning fees

### **How It Works**

When creating a subscription checkout, you can add a one-time setup fee:

```typescript
await stripeService.createSubscriptionCheckout({
  tenantId: 'tenant_123',
  customerEmail: 'customer@example.com',
  customerName: 'John Doe',
  priceId: 'price_xxxxxxxxxxxxx', // Yearly subscription price
  setupFeeAmount: 100, // $1.00 in cents (one-time charge)
  metadata: {
    plan: 'starter',
    billingCycle: 'yearly'
  }
});
```

**What Happens:**
1. Customer is redirected to Stripe Checkout
2. They see **two line items:**
   - Setup Fee: $1.00 (one-time)
   - Starter Plan: $6000/year (recurring annually)
3. Total first payment: **$6001.00**
4. Subsequent annual payments: **$6000.00**

### **Setup Fee Breakdown**

The setup fee is added as a separate line item in the checkout session:

```typescript
// Stripe creates two line items internally:
lineItems: [
  {
    // Recurring subscription
    price: priceId, // Your yearly price ID
    quantity: 1
  },
  {
    // One-time setup fee
    price_data: {
      currency: 'usd',
      product_data: {
        name: 'Setup Fee',
        description: 'One-time account setup fee'
      },
      unit_amount: 100 // $1.00 in cents
    },
    quantity: 1
  }
]
```

---

## 🔌 **API Usage Examples**

### **1. Create Subscription Checkout (with Setup Fee)**

**Endpoint:**
```http
POST /api/subscriptions/checkout
```

**Request:**
```json
{
  "tenantId": "tenant_abc123",
  "customerEmail": "john@example.com",
  "customerName": "John Doe",
  "priceId": "price_xxxxxxxxxxxxx",
  "setupFeeAmount": 100,
  "metadata": {
    "plan": "starter",
    "billingCycle": "yearly"
  }
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxxxxxxxxxxxx",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_xxxxxxxxxxxxx",
  "customer": "cus_xxxxxxxxxxxxx"
}
```

**Usage:**
```bash
curl -X POST http://localhost:8000/api/subscriptions/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_123",
    "customerEmail": "john@example.com",
    "customerName": "John Doe",
    "priceId": "price_xxxxxxxxxxxxx",
    "setupFeeAmount": 100
  }'
```

---

### **2. Create Subscription Checkout (without Setup Fee)**

**Request:**
```json
{
  "tenantId": "tenant_abc123",
  "customerEmail": "john@example.com",
  "priceId": "price_xxxxxxxxxxxxx"
}
```

**Note:** Simply omit `setupFeeAmount` or set it to `0`

---

### **3. One-Time Payment (No Subscription)**

**Endpoint:**
```http
POST /api/payments/checkout
```

**Request:**
```json
{
  "tenantId": "tenant_123",
  "customerEmail": "john@example.com",
  "amount": 5000,
  "description": "Custom order payment"
}
```

---

### **4. Create Payment Link (Reusable)**

**Endpoint:**
```http
POST /api/payments/payment-link
```

**Request:**
```json
{
  "amount": 10000,
  "description": "Product purchase link"
}
```

**Response:**
```json
{
  "paymentLinkId": "plink_xxxxxxxxxxxxx",
  "url": "https://buy.stripe.com/xxxxxxxxxxxxx"
}
```

---

## 🔐 **Webhook Configuration**

### **Setup Stripe Webhook**

1. **Go to Webhooks:** https://dashboard.stripe.com/test/webhooks
2. **Add Endpoint:**
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. **Copy Signing Secret** and add to `.env`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### **Webhook Handler**

The webhook handler automatically processes Stripe events:

```typescript
// src/routes/webhook.routes.ts
router.post('/stripe',
  express.raw({ type: 'application/json' }),
  webhookController.handleStripeWebhook
);
```

**Webhook Flow:**
1. Stripe sends event to your endpoint
2. Signature is verified using webhook secret
3. Event is processed based on type
4. Database is updated (subscription status, tenant metadata)
5. User is notified (email, etc.)

---

## 🐛 **Troubleshooting**

### **Error: "STRIPE_SECRET_KEY is not defined"**

**Cause:** Missing Stripe API key in environment

**Solution:**
```bash
# Add to .env file
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

---

### **Error: "Failed to create payment session"**

**Possible Causes:**
- Invalid price ID
- Invalid amount (must be in cents)
- Invalid customer email
- Network issue with Stripe API

**Solution:**
1. Verify price ID exists in Stripe dashboard
2. Check amount is in cents (e.g., 100 = $1.00)
3. Verify API key is correct
4. Check Stripe API status: https://status.stripe.com/

---

### **Error: "Webhook verification failed"**

**Cause:** Invalid webhook secret or request tampering

**Solution:**
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure webhook endpoint uses `express.raw()` middleware
3. Check Stripe webhook logs for delivery issues

---

### **Setup Fee Not Appearing**

**Possible Causes:**
- `setupFeeAmount` is 0 or undefined
- `setupFeeAmount` not passed to API

**Solution:**
```typescript
// Ensure setupFeeAmount is provided and > 0
const params = {
  ...otherParams,
  setupFeeAmount: 100 // $1.00 in cents
};
```

---

## 📚 **Additional Resources**

### **Stripe Documentation**
- **API Reference:** https://stripe.com/docs/api
- **Checkout Sessions:** https://stripe.com/docs/payments/checkout
- **Subscriptions:** https://stripe.com/docs/billing/subscriptions/overview
- **Webhooks:** https://stripe.com/docs/webhooks

### **First Ring AI Documentation**
- **Email Service:** `/docs/EMAIL_SETUP.md`
- **Whop Integration:** `/docs/WHOP_SETUP.md`
- **Toast POS:** `/docs/TOAST_POS_SETUP.md`

---

## ✅ **Quick Start Checklist**

- [ ] Stripe account created (test mode enabled)
- [ ] API keys added to `.env` file
- [ ] Webhook endpoint configured
- [ ] Products created in Stripe dashboard
- [ ] Monthly prices created (run script or manual)
- [ ] Yearly prices created (run script or manual)
- [ ] Price IDs added to `.env` file
- [ ] Test checkout session created successfully
- [ ] Webhook receiving events successfully

---

## 🎯 **Common Use Cases**

### **Use Case 1: Yearly Subscription with $1 Setup Fee**
```typescript
await stripeService.createSubscriptionCheckout({
  tenantId: tenant.id,
  customerEmail: user.email,
  priceId: process.env.STRIPE_PRICE_ID_STARTER_YEARLY,
  setupFeeAmount: 100, // $1.00
});
```

### **Use Case 2: Monthly Subscription (No Setup Fee)**
```typescript
await stripeService.createSubscriptionCheckout({
  tenantId: tenant.id,
  customerEmail: user.email,
  priceId: process.env.STRIPE_PRICE_ID_STARTER,
});
```

### **Use Case 3: One-Time Payment for Order**
```typescript
await stripeService.createCheckoutSession({
  tenantId: tenant.id,
  customerEmail: order.customerEmail,
  amount: order.total * 100, // Convert to cents
  description: `Order #${order.id}`,
});
```

---

**Last Updated:** January 2026
**Version:** 1.0.0
