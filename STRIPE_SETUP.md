# Lead to Tenant Payment Flow - Environment Variables

## Required Stripe Price IDs

After creating your subscription plans in Stripe Dashboard, add the following environment variables to your `.env` file:

```bash
# Stripe Subscription Price IDs
# Create these in: https://dashboard.stripe.com/products
# Each price ID corresponds to a monthly subscription plan

STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxx      # $500/month - Starter Plan
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxxxxxxxxxx # $1,500/month - Professional Plan
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx   # $3,000/month - Enterprise Plan
STRIPE_PRICE_ID_EXECUTIVE=price_xxxxxxxxxxxxx    # $5,000/month - Executive Plan
```

## How to Create Stripe Products

### 1. Go to Stripe Dashboard
Navigate to: https://dashboard.stripe.com/products

### 2. Create Products for Each Plan

#### Starter Plan
- **Product Name:** "First Ring AI - Starter Plan"
- **Description:** "One AI phone line with up to 1,000 monthly minutes"
- **Pricing:** $500.00 USD / month (recurring)
- **Billing Period:** Monthly
- Copy the **Price ID** (starts with `price_`) and set as `STRIPE_PRICE_ID_STARTER`

#### Professional Plan
- **Product Name:** "First Ring AI - Professional Plan"
- **Description:** "Three AI phone lines with up to 3,000 monthly minutes"
- **Pricing:** $1,500.00 USD / month (recurring)
- **Billing Period:** Monthly
- Copy the **Price ID** and set as `STRIPE_PRICE_ID_PROFESSIONAL`

#### Enterprise Plan
- **Product Name:** "First Ring AI - Enterprise Plan"
- **Description:** "Ten AI phone lines with up to 6,000 monthly minutes"
- **Pricing:** $3,000.00 USD / month (recurring)
- **Billing Period:** Monthly
- Copy the **Price ID** and set as `STRIPE_PRICE_ID_ENTERPRISE`

#### Executive Plan
- **Product Name:** "First Ring AI - Executive Plan"
- **Description:** "Unlimited AI phone lines with up to 12,000 monthly minutes"
- **Pricing:** $5,000.00 USD / month (recurring)
- **Billing Period:** Monthly
- Copy the **Price ID** and set as `STRIPE_PRICE_ID_EXECUTIVE`

### 3. Configure Webhook

The webhook is already configured in your `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

Make sure your webhook endpoint is set to:
```
https://your-api-domain.com/api/payments/webhook
```

And listens for these events:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Example .env Configuration

```bash
# Existing Stripe Configuration
STRIPE_SECRET_KEY=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
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_attfqybhsELul1HNjjYXK9DytdKCvbmr
STRIPE_WEBHOOK_SECRET_ALT=whsec_Gf9v6j0LlObYmqDBVf7vThFaSLjNgjkY

# NEW: Add these price IDs
STRIPE_PRICE_ID_STARTER=price_1QxxxStarter
STRIPE_PRICE_ID_PROFESSIONAL=price_1QxxxProfessional
STRIPE_PRICE_ID_ENTERPRISE=price_1QxxxEnterprise
STRIPE_PRICE_ID_EXECUTIVE=price_1QxxxExecutive
```

---

## Testing with Stripe Test Mode

For development/testing, create test mode products:

1. Toggle to "Test mode" in Stripe Dashboard
2. Create the same 4 products with test prices
3. Use test price IDs in your development `.env`
4. Test cards: `4242 4242 4242 4242` (any future expiry, any CVC)

**Note:** Test price IDs start with `price_test_` instead of `price_live_`
