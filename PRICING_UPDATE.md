# Pricing Plan Update - January 2026

## Overview
This update introduces a new 4-tier pricing structure with enterprise-level pricing and overage billing capabilities.

---

## New Pricing Structure

| Plan | Price | Minutes | Phone Lines | Overage Rate |
|------|-------|---------|-------------|--------------|
| **Starter** | $500/mo | 1,000 min | 1 line | $0.75/min |
| **Professional** | $1,500/mo | 3,000 min | 3 lines | $0.75/min |
| **Enterprise** | $3,000/mo | 6,000 min | 10 lines | $0.60/min |
| **Executive** | $5,000/mo | 12,000 min | Unlimited | $0.50/min |

### Previous Pricing (for reference)
- Starter: $49/mo, 100 minutes
- Professional: $149/mo, 500 minutes
- Enterprise: $499/mo, 2,000 minutes

---

## Database Changes

### Schema Updates

#### Plan Model
New fields added to `Plan` model:
- `maxPhoneLines: Int?` - Number of AI phone lines (1, 3, 10, null for unlimited)
- `hasUnlimitedPhoneLines: Boolean` - True for Executive plan
- `overageRatePerMinute: Float?` - Cost per minute beyond limit ($0.50-$0.75)

#### UsageRecord Model
New fields added for overage tracking:
- `overageMinutes: Int` - Minutes used beyond plan limit
- `overageCharges: Float` - Total charges for overage usage

### Migration
Location: `prisma/migrations/20260112000000_add_new_pricing_fields/migration.sql`

To apply migration:
```bash
npx prisma migrate deploy
```

---

## API Changes

### Plan Seeding
Updated seed data in `src/modules/subscriptions/subscriptions.routes.ts`

To seed new plans:
```bash
POST /api/subscriptions/plans/seed
```

### Customer Dashboard API

#### GET /api/dashboard/:tenantId/overview

**New Response Fields:**
```json
{
  "subscription": {
    "plan": {
      "maxPhoneLines": 3,
      "hasUnlimitedPhoneLines": false,
      "overageRatePerMinute": 0.75
    }
  },
  "usage": {
    "callMinutes": 3200,
    "callMinutesLimit": 3000,
    "overageMinutes": 200,
    "overageCharges": 150.00
  },
  "overage": {
    "usedMinutes": 3200,
    "planLimit": 3000,
    "overageMinutes": 200,
    "overageRate": 0.75,
    "overageCharges": 150.00,
    "isOverLimit": true,
    "usagePercentage": 106.7,
    "usageStatus": {
      "status": "exceeded",
      "color": "red",
      "message": "Usage limit exceeded by 200 minutes"
    }
  }
}
```

---

## New Utilities

### Billing Utils (`src/utils/billing.utils.ts`)

**Functions:**
- `calculateOverageCharges(usedMinutes, planLimit, overageRate)` - Calculate overage fees
- `calculateUsagePercentage(usedMinutes, planLimit)` - Get usage percentage
- `getUsageStatus(usedMinutes, planLimit)` - Get status (safe/warning/exceeded)
- `isApproachingLimit(usedMinutes, planLimit)` - Check if at 80%+ usage
- `calculateTotalBill(planPrice, overageCharges)` - Calculate total monthly bill
- `generateInvoiceLineItems(planName, planPrice, overageCalc)` - Generate invoice items

**Example Usage:**
```typescript
import { calculateOverageCharges } from './utils/billing.utils';

const overage = calculateOverageCharges(3200, 3000, 0.75);
// Result:
// {
//   usedMinutes: 3200,
//   planLimit: 3000,
//   overageMinutes: 200,
//   overageRate: 0.75,
//   overageCharges: 150.00,
//   isOverLimit: true
// }
```

---

## Lead Scoring Updates

Updated lead qualification scoring in `src/modules/leads/leads.service.ts`:

**New Scoring:**
- Executive plan: +30 points (highest priority)
- Enterprise plan: +25 points
- Professional plan: +15 points
- Starter plan: +10 points

**Previous Scoring:**
- Enterprise: +20 points
- Pro: +15 points
- Basic: +10 points

---

## Frontend Integration Guide

### Pricing Page Display

```typescript
// Example: Fetch and display plans
const response = await fetch('/api/subscriptions/plans');
const { data: plans } = await response.json();

plans.forEach(plan => {
  console.log(`
    ${plan.name} - $${plan.price}/mo
    - ${plan.callMinutes.toLocaleString()} minutes included
    - ${plan.maxPhoneLines || 'Unlimited'} phone lines
    - Overage: ${plan.overageRatePerMinute}/min
  `);
});
```

### Usage Dashboard

```typescript
// Example: Display usage with overage warning
const { usage, overage } = await getDashboardOverview(tenantId);

if (overage?.isOverLimit) {
  showAlert({
    type: 'warning',
    title: 'Usage Limit Exceeded',
    message: `You've used ${overage.overageMinutes} extra minutes.
              Additional charges: $${overage.overageCharges}`,
  });
}

// Display usage percentage
<ProgressBar
  value={overage.usagePercentage}
  color={overage.usageStatus.color}
  label={overage.usageStatus.message}
/>
```

---

## Testing Checklist

- [ ] Run database migration
- [ ] Seed new plans via API
- [ ] Verify plan details in database
- [ ] Test dashboard API with overage scenarios
- [ ] Test lead creation with executive plan
- [ ] Verify overage calculations are accurate
- [ ] Test Stripe integration with new prices
- [ ] Update frontend to display new plans
- [ ] Test usage alerts when approaching limit

---

## Deployment Steps

### 1. Backup Database
```bash
pg_dump -h localhost -U postgres firstring_db > backup_before_pricing_update.sql
```

### 2. Apply Migration
```bash
npx prisma migrate deploy
```

### 3. Generate Prisma Client
```bash
npx prisma generate
```

### 4. Seed New Plans
```bash
curl -X POST http://localhost:5000/api/subscriptions/plans/seed \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 5. Create Stripe Products
Create 4 new products in Stripe Dashboard:
- Starter Plan ($500/mo)
- Professional Plan ($1,500/mo)
- Enterprise Plan ($3,000/mo)
- Executive Plan ($5,000/mo)

Add price IDs to `.env`:
```env
STRIPE_PRICE_ID_STARTER=price_xxx
STRIPE_PRICE_ID_PROFESSIONAL=price_xxx
STRIPE_PRICE_ID_ENTERPRISE=price_xxx
STRIPE_PRICE_ID_EXECUTIVE=price_xxx
```

### 6. Restart Server
```bash
npm run build
npm start
```

---

## Backwards Compatibility

### Legacy Fields Retained
- `yearlyPrice` - Set to `null` (monthly-only billing)
- `maxCalls` - Retained for backwards compatibility
- `maxUsers` - Retained for backwards compatibility

### Existing Subscriptions
Existing subscriptions will continue to work with old pricing until:
1. Manually migrated to new plans
2. Subscription renewal (decide on grandfathering policy)

---

## FAQ

### Q: What happens to existing customers?
**A:** Existing customers remain on their current plans. You can choose to:
- Grandfather them (keep old pricing)
- Force migration at renewal
- Offer upgrade incentives

### Q: How are overage charges billed?
**A:** Overage charges are calculated at end of billing period and added to next invoice as a separate line item.

### Q: Can customers see overage usage in real-time?
**A:** Yes, the dashboard API now returns live overage calculations and usage status.

### Q: Is unlimited truly unlimited for Executive plan?
**A:** `maxPhoneLines` is set to `null` and `hasUnlimitedPhoneLines` is `true`. Backend should handle this appropriately (no phone line limit enforcement).

---

## Support

For questions or issues:
- Backend: Review this document and API responses
- Frontend: Use new API response fields for display
- Billing: Refer to `billing.utils.ts` for calculations

---

**Document Version:** 1.0
**Last Updated:** 2026-01-12
**Author:** Backend Development Team
