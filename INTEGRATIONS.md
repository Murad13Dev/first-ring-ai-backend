# Discord & Whop Integrations

Professional integration system for Discord notifications and Whop marketplace sales with automatic Discord access control.

## 🎯 Features

### Discord Integration
- **Real-time Notifications**: Instant order and payment alerts sent to Discord channels
- **Rich Embeds**: Beautiful, informative messages with order details
- **Role Management**: Automatic role assignment for paid customers
- **DM Support**: Send welcome messages directly to customers
- **Daily Reports**: Automated business analytics reports

### Whop Integration
- **Product Sync**: Automatically sync products from Whop marketplace
- **Webhook Processing**: Handle payment and membership events
- **Auto-Access**: Automatically grant Discord roles on Whop purchases
- **Subscription Management**: Track membership lifecycle (active, cancelled, expired)

## 📋 Table of Contents

- [Setup](#setup)
- [Discord Configuration](#discord-configuration)
- [Whop Configuration](#whop-configuration)
- [API Endpoints](#api-endpoints)
- [Notification Events](#notification-events)
- [Discord Bot Setup](#discord-bot-setup)
- [Product Mapping](#product-mapping)
- [Testing](#testing)

---

## 🚀 Setup

### 1. Database Migration

Run the migration to create integration tables:

```bash
npx prisma migrate deploy
# or during development:
npx prisma migrate dev
```

### 2. Environment Variables

No additional environment variables required - all configuration is per-tenant via API.

---

## 🎨 Discord Configuration

### Step 1: Create Discord Webhook

1. Go to your Discord server settings
2. Navigate to **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Configure the webhook:
   - **Name**: Order Notifications (or your preferred name)
   - **Channel**: Select the channel for notifications
5. Click **Copy Webhook URL**

### Step 2: Configure via API

```bash
POST /api/integrations/discord/configure
Authorization: Bearer <tenant_jwt_token>

{
  "webhookUrl": "https://discord.com/api/webhooks/1234567890/abcdefgh...",
  "notifyOnNewOrder": true,
  "notifyOnPaymentSuccess": true,
  "notifyOnPaymentFailed": true,
  "notifyOnOrderReady": false,
  "notifyOnAICall": false,
  "dailyReportEnabled": false,
  "dailyReportTime": "23:00"
}
```

### Step 3: Test Webhook

```bash
POST /api/integrations/discord/test
Authorization: Bearer <tenant_jwt_token>

{
  "webhookUrl": "https://discord.com/api/webhooks/..."
}
```

---

## 🛒 Whop Configuration

### Step 1: Get Whop API Key

1. Log in to [Whop Dashboard](https://whop.com/dashboard)
2. Navigate to **Settings** → **API Keys**
3. Create a new API key
4. Copy the API key and Company ID

### Step 2: Configure via API

```bash
POST /api/integrations/whop/configure
Authorization: Bearer <tenant_jwt_token>

{
  "apiKey": "whop_xxx...",
  "companyId": "comp_xxx...",
  "webhookSecret": "whsec_xxx...",
  "autoGrantAccess": true
}
```

### Step 3: Set Up Whop Webhook

1. In Whop Dashboard, go to **Settings** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/integrations/whop/webhook`
3. Add custom header: `X-Tenant-Id: <your_tenant_id>`
4. Select events:
   - `payment.succeeded`
   - `membership.cancelled`
   - `membership.went_invalid`

---

## 🤖 Discord Bot Setup (Optional - For Role Management)

### Step 1: Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application**
3. Navigate to **Bot** → **Add Bot**
4. Enable these **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent
5. Copy the **Bot Token**

### Step 2: Add Bot to Server

Generate OAuth URL:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot
```

Permissions needed:
- Manage Roles
- Send Messages
- Create Invites

### Step 3: Configure Bot in API

```bash
POST /api/integrations/discord/configure
Authorization: Bearer <tenant_jwt_token>

{
  "webhookUrl": "https://discord.com/api/webhooks/...",
  "botToken": "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAu...",
  "guildId": "1234567890123456789",
  "notifyOnNewOrder": true,
  "notifyOnPaymentSuccess": true
}
```

---

## 🗺️ Product Mapping

Map your services to Discord roles for automatic access control:

```bash
POST /api/integrations/product-mappings
Authorization: Bearer <tenant_jwt_token>

{
  "mappings": {
    "service_uuid_1": {
      "discordRoleId": "1234567890123456789",
      "whopProductId": "prod_xxxxx"
    },
    "service_uuid_2": {
      "discordRoleId": "9876543210987654321"
    }
  }
}
```

When a customer purchases `service_uuid_1`:
1. Payment is confirmed via Stripe/Whop
2. Access grant is created (status: `pending`)
3. Customer links their Discord account
4. Bot assigns the specified Discord role
5. Customer receives welcome DM

---

## 📡 API Endpoints

### Integration Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations` | Get integration settings |
| POST | `/api/integrations/discord/configure` | Configure Discord |
| POST | `/api/integrations/discord/test` | Test Discord webhook |
| POST | `/api/integrations/whop/configure` | Configure Whop |
| POST | `/api/integrations/whop/sync-products` | Sync Whop products |
| POST | `/api/integrations/product-mappings` | Set product→role mappings |

### Access Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/access-grants` | List access grants |
| POST | `/api/integrations/access-grants/:id/link-discord` | Link Discord user |
| POST | `/api/integrations/access-grants/:id/revoke` | Revoke access |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/integrations/whop/webhook` | Whop webhook handler |

---

## 📬 Notification Events

### New Order Created

Triggers when order is created (before payment).

**Discord Message:**
```
🍕 NEW ORDER RECEIVED
Order ID: abc12345
Customer: John Doe
Phone: 555-1234
Items:
• 2x Margherita Pizza - $24.00
• 1x Coke - $4.50
Total: $28.50
Payment: ⏳ Pending
Delivery Type: Pickup
```

### Payment Confirmed

Triggers when Stripe/Whop payment succeeds.

**Discord Message:**
```
✅ PAYMENT CONFIRMED
Order #abc12345 has been paid successfully!
Customer: John Doe
Amount: $28.50
Method: Stripe
Status: ✅ Confirmed
```

### Payment Failed

Triggers when payment fails.

**Discord Message:**
```
❌ PAYMENT FAILED
Order #abc12345 payment failed!
Customer: John Doe
Phone: 555-1234
Amount: $28.50
Action Required: Contact customer
```

### Order Ready

Triggers when order status changes to `ready`.

**Discord Message:**
```
🎉 ORDER READY
Order #abc12345 is ready for pickup!
Customer: John Doe
Phone: 555-1234
Type: Pickup
Order Ready - Notify Customer
```

### Daily Report (Optional)

Automated daily business summary.

**Discord Message:**
```
📊 DAILY BUSINESS REPORT
Summary for 2025-12-25

📦 Total Orders: 42
💰 Revenue: $1,247.50
📈 Avg Order: $29.70
⭐ Top Item: Margherita Pizza
📞 Total Calls: 15
```

---

## 🧪 Testing

### Test Discord Webhook

```bash
curl -X POST https://your-api.com/api/integrations/discord/test \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://discord.com/api/webhooks/..."}'
```

### Test Whop Connection

```bash
curl -X POST https://your-api.com/api/integrations/whop/configure \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "whop_xxx",
    "companyId": "comp_xxx",
    "webhookSecret": "whsec_xxx"
  }'
```

### Simulate Order Creation

```bash
curl -X POST https://your-api.com/api/orders \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerPhone": "5551234",
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "items": [{
      "serviceId": "service_uuid",
      "name": "Test Product",
      "price": 29.99,
      "quantity": 1
    }],
    "deliveryType": "pickup"
  }'
```

Check Discord channel for notification!

---

## 🔐 Security

- **Webhook Signatures**: Whop webhooks verified via HMAC SHA256
- **Tenant Isolation**: Each tenant has separate integration settings
- **Encrypted Secrets**: Bot tokens and API keys encrypted in database
- **Rate Limiting**: API endpoints protected against abuse

---

## 🐛 Troubleshooting

### Discord notifications not appearing

1. ✅ Verify webhook URL is correct
2. ✅ Check Discord server permissions
3. ✅ Test webhook via `/api/integrations/discord/test`
4. ✅ Check application logs for errors

### Discord role not granted

1. ✅ Verify bot token is configured
2. ✅ Check bot has "Manage Roles" permission
3. ✅ Ensure bot role is higher than target role in hierarchy
4. ✅ Verify product mapping is set correctly

### Whop webhook not processing

1. ✅ Check `X-Tenant-Id` header is set in Whop webhook config
2. ✅ Verify webhook secret matches
3. ✅ Check integration event logs in database
4. ✅ Ensure Whop API key has correct permissions

---

## 📊 Database Schema

### TenantIntegration

Stores Discord and Whop configuration per tenant.

```typescript
{
  id: uuid
  tenantId: uuid (unique)
  
  // Discord
  discordEnabled: boolean
  discordWebhookUrl: string?
  discordBotToken: string? (encrypted)
  discordGuildId: string?
  notifyOnNewOrder: boolean
  notifyOnPaymentSuccess: boolean
  notifyOnPaymentFailed: boolean
  // ... notification settings
  
  // Whop
  whopEnabled: boolean
  whopApiKey: string? (encrypted)
  whopCompanyId: string?
  whopWebhookSecret: string? (encrypted)
  whopAutoGrantAccess: boolean
  
  // Mappings
  productMappings: json
  
  isActive: boolean
}
```

### AccessGrant

Tracks Discord role grants.

```typescript
{
  id: uuid
  integrationId: uuid
  orderId: uuid
  
  customerEmail: string?
  customerPhone: string?
  discordUserId: string?
  discordUsername: string?
  discordRoleId: string?
  
  whopMembershipId: string?
  whopProductId: string?
  
  status: 'pending' | 'granted' | 'revoked' | 'expired'
  grantedAt: datetime?
  expiresAt: datetime?
  revokedAt: datetime?
  revokeReason: string?
  
  source: 'stripe' | 'whop' | 'agent' | 'manual'
  sourceId: string?
}
```

---

## 🎉 Examples

### Complete Flow: Order → Payment → Discord Access

1. **Customer places order via AI agent**
   ```
   Customer calls → AI creates order → Discord notification sent
   ```

2. **Customer receives payment link**
   ```
   Order created → Stripe checkout link sent via SMS/Email
   ```

3. **Customer pays**
   ```
   Payment succeeds → Webhook received → Order marked as paid
   → Discord notification sent
   → Access grant created (if product mapping exists)
   ```

4. **Customer links Discord**
   ```
   Customer visits verification page → Enters Discord username
   → API call to link-discord endpoint
   → Bot assigns role → Welcome DM sent
   ```

5. **Access revoked on refund**
   ```
   Refund processed → Webhook received
   → Access grant revoked → Role removed from Discord
   ```

---

## 📞 Support

For integration assistance, contact the development team or refer to:
- [Discord Developer Docs](https://discord.com/developers/docs)
- [Whop API Reference](https://dev.whop.com/api-reference)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## 🔄 Changelog

### v1.0.0 (2025-12-25)
- Initial release
- Discord webhook notifications
- Whop marketplace integration
- Automatic Discord role management
- Product mapping system
- Access grant tracking
