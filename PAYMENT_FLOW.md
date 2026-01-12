# Lead to Tenant Payment Flow Documentation

## Overview

This document describes the complete flow from Lead creation to Tenant activation with Stripe payment integration.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     LEAD TO TENANT PAYMENT FLOW                 │
└─────────────────────────────────────────────────────────────────┘

1. Lead Created
   ├─ Via website form
   ├─ Via AI phone call
   └─ Via API

2. Admin Converts Lead → Tenant
   POST /api/leads/:leadId/convert

3. System Creates:
   ├─ Tenant (subscriptionStatus: "pending_payment")
   ├─ User (owner role)
   └─ Temporary password

4. System Generates Payment Link
   ├─ Maps plan → Stripe Price ID
   ├─ Creates Stripe Checkout Session
   ├─ Stores session ID in tenant.subscriptionId
   └─ Sets tenant.subscriptionStatus = "pending_payment"

5. Email Sent to Customer
   Subject: "Complete Your [Plan Name] Subscription"
   Content:
   ├─ Plan details & pricing
   ├─ Payment button (Stripe checkout link)
   └─ Expires in 24 hours

6. Customer Clicks Payment Link
   └─ Redirected to Stripe Checkout

7. Customer Completes Payment
   └─ Stripe processes payment

8. Stripe Webhook: checkout.session.completed
   POST /api/payments/webhook

9. System Updates:
   ├─ tenant.subscriptionStatus → "active"
   ├─ tenant.subscriptionId → Stripe subscription ID
   ├─ tenant.currentPeriodEnd → Next billing date
   └─ Creates Subscription record

10. Background Provisioning (async)
    ├─ Twilio phone number
    ├─ Retell AI agent
    └─ Welcome email with credentials

11. Customer Can Now Login
    └─ Dashboard access granted
```

---

## API Endpoints

### Convert Lead to Tenant
```
POST /api/leads/:leadId/convert
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Lead converted successfully",
  "data": {
    "tenant": { ... },
    "user": { ... },
    "tempPassword": "random-password"
  }
}
```

### Stripe Webhook
```
POST /api/payments/webhook
Headers: {
  "stripe-signature": "t=timestamp,v1=signature"
}

Events Handled:
- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

---

## Database Changes

### Tenant Status Flow

```
1. Created:       subscriptionStatus = "pending_payment"
                  subscriptionId = "cs_xxxxx" (checkout session)

2. Payment Completed: subscriptionStatus = "active"
                      subscriptionId = "sub_xxxxx" (subscription)
                      currentPeriodEnd = Date

3. Subscription Active: User can access dashboard
```

### Subscription Record

Created when payment succeeds:
```typescript
{
  tenantId: "tenant-uuid",
  planId: "plan-uuid",
  status: "active",
  billingCycle: "monthly",
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  squareSubscriptionId: "sub_xxxxx", // Stripe subscription ID
}
```

---

## Email Templates

### 1. Payment Link Email

**Subject:** `Complete Your [Plan Name] Subscription - First Ring AI`

**Sent:** Immediately after tenant creation

**Content:**
- Greeting with customer name
- Plan details (name, price, features)
- Large "Complete Payment →" button
- Security notice (Stripe secure payment)
- Link expires in 24 hours
- Support contact

**Trigger:** Automatic during lead conversion

---

### 2. Welcome Email

**Subject:** `Welcome to First Ring AI - Your Account is Ready!`

**Sent:** After successful payment (background job)

**Content:**
- Welcome message
- Login credentials (email + temporary password)
- Dashboard URL
- Next steps checklist
- Support contact

**Trigger:** Automatic after payment webhook

---

## Stripe Configuration

### Required Environment Variables

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Subscription Price IDs (NEW)
STRIPE_PRICE_ID_STARTER=price_xxxxx       # $500/month
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxx  # $1,500/month
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxx    # $3,000/month
STRIPE_PRICE_ID_EXECUTIVE=price_xxxxx     # $5,000/month
```

See `STRIPE_SETUP.md` for detailed setup instructions.

---

## Code Implementation

### 1. Lead Conversion (leads.service.ts)

```typescript
async convertLeadToTenant(leadId: string) {
  // Create tenant with status "pending_payment"
  const tenant = await prisma.tenant.create({
    data: {
      subscriptionStatus: 'pending_payment',
      plan: lead.selectedPlan,
      ...
    }
  });

  // Background: Generate payment link and send email
  this.provisionServicesAsync(tenant, lead, tempPassword);

  return { tenant, user, tempPassword };
}
```

### 2. Payment Link Generation (leads.service.ts)

```typescript
private async generateAndSendPaymentLink(tenant, lead) {
  // Map plan to Stripe price ID
  const priceId = stripePriceMap[tenant.plan];

  // Create checkout session
  const checkout = await stripeService.createSubscriptionCheckout({
    tenantId: tenant.id,
    customerEmail: tenant.email,
    priceId,
    metadata: { leadId, plan: tenant.plan }
  });

  // Update tenant
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      subscriptionStatus: 'pending_payment',
      subscriptionId: checkout.sessionId
    }
  });

  // Send email with payment link
  await this.sendEmail({
    to: tenant.email,
    subject: `Complete Your ${plan.name} Subscription`,
    html: paymentEmailTemplate
  });
}
```

### 3. Stripe Webhook Handler (payments.controller.ts)

```typescript
private async handleCheckoutCompleted(session) {
  if (session.mode === 'subscription') {
    const tenantId = session.metadata.tenantId;
    const planSlug = session.metadata.plan;

    // Get subscription details from Stripe
    const stripeSubscription = await stripeService.getSubscription(
      session.subscription
    );

    // Find plan in database
    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug }
    });

    // Update tenant
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: 'active',
        subscriptionId: session.subscription,
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000
        )
      }
    });

    // Create Subscription record
    await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        planId: plan.id,
        status: 'active',
        currentPeriodStart: ...,
        currentPeriodEnd: ...
      }
    });
  }
}
```

---

## Testing Checklist

### 1. Environment Setup
- [ ] Stripe products created in dashboard
- [ ] Price IDs added to `.env`
- [ ] Webhook endpoint configured
- [ ] Webhook secret added to `.env`

### 2. Lead Conversion
- [ ] Create test lead via API
- [ ] Convert lead to tenant
- [ ] Verify tenant created with `pending_payment` status
- [ ] Check email received with payment link

### 3. Payment Flow
- [ ] Click payment link in email
- [ ] Redirected to Stripe checkout
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Verify webhook received

### 4. Post-Payment Verification
- [ ] Tenant status changed to `active`
- [ ] Subscription record created
- [ ] `currentPeriodEnd` set correctly
- [ ] Welcome email sent
- [ ] User can login to dashboard

### 5. Error Scenarios
- [ ] Payment fails (declined card) - tenant stays `pending_payment`
- [ ] Customer cancels checkout - tenant stays `pending_payment`
- [ ] Missing Stripe price ID - error logged, email not sent

---

## Troubleshooting

### Payment link not sent
**Check:**
- Environment variable `STRIPE_PRICE_ID_[PLAN]` exists
- SMTP/SendGrid configuration is correct
- Logs: `Failed to generate payment link for new tenant`

**Solution:**
- Add missing price IDs to `.env`
- Verify email service credentials

### Webhook not triggering
**Check:**
- Webhook endpoint URL is correct
- Webhook secret matches `.env`
- Stripe webhook is active in dashboard

**Solution:**
- Test webhook in Stripe dashboard (Send test webhook)
- Check server logs for webhook errors
- Verify raw body parser is enabled for `/api/payments/webhook`

### Tenant still pending_payment after payment
**Check:**
- Webhook was received (check logs)
- `tenantId` exists in session metadata
- Plan slug matches database

**Solution:**
- Manually trigger webhook from Stripe dashboard
- Check database for subscription record
- Verify `handleCheckoutCompleted` logic

---

## Future Improvements

### Short Term
- [ ] Send payment confirmation email
- [ ] Add payment retry logic for failed payments
- [ ] Dashboard notification when payment pending

### Long Term
- [ ] Support for yearly billing
- [ ] Proration when upgrading/downgrading
- [ ] Dunning management for failed renewals
- [ ] Customer portal for subscription management

---

## Support

For questions or issues:
- Backend: Check logs at `logs/` directory
- Stripe: Dashboard → Developers → Logs
- Email: Check SMTP/SendGrid delivery logs

**Documentation:**
- Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions/overview
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe Test Cards: https://stripe.com/docs/testing

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Related Files:**
- `src/modules/leads/leads.service.ts` - Lead conversion & payment link
- `src/modules/payments/payments.controller.ts` - Webhook handler
- `src/services/stripe.service.ts` - Stripe API wrapper
- `STRIPE_SETUP.md` - Stripe configuration guide
