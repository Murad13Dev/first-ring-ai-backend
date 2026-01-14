# Stripe Price Setup Guide

This guide explains how to create Stripe prices for your pricing plans and configure payment links.

## Problem

The payment link emails are sent successfully, but they don't include a payment link. This happens because:

1. We have **Stripe Product IDs** (`prod_xxx`) in the database ✅
2. But we're **missing Stripe Price IDs** (`price_xxx`) in the `.env` file ❌

The `leads.service.ts` checks for Price IDs before creating payment links:

```typescript
const priceId = stripePriceMap[tenant.plan]; // reads from .env

if (priceId) {
  // Creates payment link
  checkout = await stripeService.createSubscriptionCheckout({...});
} else {
  // Sends email without payment link (shows "Payment Setup Pending" message)
  logger.warn('No Stripe price ID configured...');
}
```

## Solution

We need to create **Stripe Prices** for each plan and add them to the `.env` file.

## Automated Setup (Recommended)

We've created a script that automatically creates Stripe prices and updates your `.env` file.

### Prerequisites

1. Ensure database is running and migrations are applied:
   ```bash
   npx prisma migrate deploy
   npm run seed:plans  # or use the SQL seed script
   ```

2. Verify your Stripe API key is configured in `.env`:
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxxx  # or sk_test_xxxxx for testing
   ```

3. Verify plans have Product IDs in the database:
   ```bash
   psql -U firstring -d firstringdb -h localhost -c "SELECT slug, name, price, \"stripeProductId\" FROM plans ORDER BY price;"
   ```

### Run the Script

```bash
npx ts-node scripts/create-stripe-prices.ts
```

The script will:
- ✅ Read all active plans from database
- ✅ Create a monthly recurring price in Stripe for each plan
- ✅ Automatically update your `.env` file with the new Price IDs
- ✅ Show you the results

### Expected Output

```
🚀 Starting Stripe price creation...

📋 Found 4 plans to create prices for:

💳 Creating price for Starter Plan...
   Product ID: prod_TmUFzafP1HCW08
   Amount: $500/month
   ✅ Price created: price_xxxxxxxxxxxxx

💳 Creating price for Professional Plan...
   Product ID: prod_TmUI3uuw8nKYvr
   Amount: $1500/month
   ✅ Price created: price_xxxxxxxxxxxxx

💳 Creating price for Enterprise Plan...
   Product ID: prod_TmULjPlu2aqieY
   Amount: $3000/month
   ✅ Price created: price_xxxxxxxxxxxxx

💳 Creating price for Executive Plan...
   Product ID: prod_TmUMC9AweLww7l
   Amount: $5000/month
   ✅ Price created: price_xxxxxxxxxxxxx

============================================================
✅ Price creation completed!
============================================================

📝 Add these to your .env file:

STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EXECUTIVE=price_xxxxxxxxxxxxx

✅ .env file updated successfully!
⚠️  Restart your server to apply changes

🎉 All done!
```

### Restart Your Server

After the script completes, restart your backend server:

```bash
npm run dev
# or
pm2 restart all
```

## Manual Setup (Alternative)

If you prefer to create prices manually in the Stripe Dashboard:

### Step 1: Login to Stripe

Go to: https://dashboard.stripe.com/products

### Step 2: Create Prices for Each Plan

For each plan, click on the product and "Add price":

| Plan | Product ID | Price | Billing Period |
|------|-----------|-------|----------------|
| Starter | `prod_TmUFzafP1HCW08` | $500 | Monthly |
| Professional | `prod_TmUI3uuw8nKYvr` | $1,500 | Monthly |
| Enterprise | `prod_TmULjPlu2aqieY` | $3,000 | Monthly |
| Executive | `prod_TmUMC9AweLww7l` | $5,000 | Monthly |

### Step 3: Copy Price IDs

After creating each price, copy the Price ID (starts with `price_`)

### Step 4: Update .env File

Add these lines to your `.env` file (under the STRIPE section):

```env
# Stripe Price IDs for Subscriptions
STRIPE_PRICE_ID_STARTER=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ID_EXECUTIVE=price_xxxxxxxxxxxxx
```

### Step 5: Restart Server

```bash
npm run dev
# or
pm2 restart all
```

## Verification

To verify payment links are working:

1. Create a test lead with a pricing plan
2. Convert the lead to a tenant
3. Check the email sent - it should now include a "Complete Payment →" button
4. Click the button - it should redirect to Stripe Checkout

## Troubleshooting

### "No Stripe price ID configured" warning in logs

This means the `.env` file doesn't have the Price IDs. Run the automated script or add them manually.

### "Failed to create price: Product not found"

The Product IDs in your database don't match the products in your Stripe account. Verify:

```bash
# Check database
psql -U firstring -d firstringdb -h localhost -c "SELECT slug, \"stripeProductId\" FROM plans;"

# Check Stripe
# Go to: https://dashboard.stripe.com/products
```

### Email sent but no payment link

Check your server logs for warnings:
```bash
grep "No Stripe price ID configured" logs/*.log
```

## Related Files

- **Script**: `scripts/create-stripe-prices.ts`
- **Service**: `src/services/stripe.service.ts`
- **Email Logic**: `src/modules/leads/leads.service.ts` (line 635-760)
- **Environment**: `.env` and `.env.example`
- **Database**: `prisma/schema.prisma` (Plan model)

## Support

If you encounter issues, check:
- Stripe API key is correct
- Database has plans with Product IDs
- Server has been restarted after .env changes

For Stripe-specific issues, check their dashboard: https://dashboard.stripe.com/logs
