# Test Data Cleanup Script

## Usage

To clean up test data:

```bash
npm run cleanup
```

or directly:

```bash
ts-node scripts/cleanup-test-data.ts
```

## What gets deleted?

This script deletes all of the following data:

- ✅ **Tenants** and their users
- ✅ **Leads** (potential customers)
- ✅ **Bookings** (reservations)
- ✅ **Orders**
- ✅ **Calls** (call logs)
- ✅ **Services** (services/menus)
- ✅ **FAQs**
- ✅ **Customers** (customer data)
- ✅ **ChatSessions** and **ChatMessages**
- ✅ **Invoices** and **InvoiceItems**
- ✅ **Subscriptions**
- ✅ **Products** and **MenuItems**
- ✅ **Promotions**
- ✅ **QR Codes**
- ✅ **Messages**
- ✅ **Callbacks**
- ✅ **FollowUp** data
- ✅ **UsageRecords**
- ✅ **Notifications**
- ✅ **AnalyticsEvents**
- ✅ **ActivityLogs**
- ✅ **AdminUsers**
- ✅ **BusinessTypeFunctions**

## What is preserved?

The following system data is **preserved**:

- 🔒 **BusinessTypes** (restaurant, hotel, medical, etc.)
- 🔒 **Plans** (Starter, Professional, Enterprise)

### To delete these as well:

Open `scripts/cleanup-test-data.ts` and uncomment the following lines:

```typescript
// await prisma.businessType.deleteMany({});
// await prisma.plan.deleteMany({});
```

## Safety

- ⚠️ Script **will not run** in **production** environment (NODE_ENV=production)
- ✅ Only works in **development** environment
- 📊 Script shows statistics before and after

## Sample output

```
🧹 Starting test data cleanup...

📊 Current state:
   📦 Tenant              : 3
   📦 User                : 5
   📦 Booking             : 12
   ...

🗑️  Deleting data...

1️⃣  Deleting InvoiceItems...
   ✅ Completed
...

📊 New state:
   ✅ Tenant              : 0
   ✅ User                : 0
   ✅ Booking             : 0
   ...

✅ Test data cleaned successfully!
```

## Warning

⚠️ **This operation cannot be undone!** Make sure you have a backup before deleting data.

## Reset database from scratch

If you want to completely reset the database from scratch:

```bash
# 1. Reset database
npm run prisma:migrate:reset

# 2. Load system data (BusinessTypes and Plans)
# Start the backend and call these endpoints:
# POST /api/business-types/seed
# POST /api/subscriptions/plans/seed
```
