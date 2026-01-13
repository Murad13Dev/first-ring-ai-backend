# Certified Rep Program - Technical Documentation

## Overview

The Certified Rep Program allows independent sales representatives to sell First Ring AI technology to their own clients at their own pricing, while receiving full support, tools, and infrastructure.

---

## Business Model

```
First Ring AI (Provider)
    ↓ $997 subscription
Certified Rep (Reseller)
    ↓ Custom pricing ($1,500-$10,000+)
End Client (Restaurant, Clinic, Hotel, etc.)
```

### Revenue Streams

**For First Ring AI:**
- $997/month (or one-time) per Certified Rep
- Brand expansion through rep network
- Ecosystem growth

**For Certified Rep:**
- 100% of client setup fees ($1,500-$10,000+)
- 100% of monthly recurring ($300-$2,000+)
- No revenue sharing with First Ring AI
- Complete pricing control

---

## Database Schema

### CertifiedRep Model

```prisma
model CertifiedRep {
  id                    String    @id @default(uuid())
  userId                String    @unique

  // Whop Integration
  whopMemberId          String?   @unique
  whopProductId         String?
  whopSubscriptionId    String?

  // Status
  status                String    @default("pending")
  // "pending" | "active" | "suspended" | "cancelled"

  // Discord Access
  discordUserId         String?   @unique
  discordRoleId         String?
  accessGrantedAt       DateTime?

  // Payment
  subscriptionActive    Boolean   @default(false)
  lastPaymentAt         DateTime?

  // Performance
  totalClients          Int       @default(0)
  activeClients         Int       @default(0)
  totalRevenue          Float     @default(0)

  clients               RepClient[]
}
```

### RepClient Model

```prisma
model RepClient {
  id                String    @id @default(uuid())
  repId             String

  clientName        String
  clientEmail       String
  businessType      String?

  // Rep's Pricing
  setupFee          Float?
  monthlyFee        Float?

  // Status
  status            String    @default("prospect")
  // "prospect" | "demo_scheduled" | "proposal_sent" | "active" | "churned"

  // Conversion
  tenantId          String?   @unique
  convertedAt       DateTime?
}
```

---

## API Endpoints

### Admin Endpoints

#### Get All Certified Reps
```
GET /api/certified-reps
Authorization: Bearer <admin_token>

Query Params:
- status: string (pending, active, suspended, cancelled)
- subscriptionActive: boolean
- page: number
- limit: number

Response:
{
  "success": true,
  "data": [
    {
      "id": "rep-uuid",
      "user": {
        "id": "user-uuid",
        "email": "rep@example.com",
        "name": "John Doe"
      },
      "status": "active",
      "subscriptionActive": true,
      "totalClients": 5,
      "activeClients": 3,
      "totalRevenue": 4500.00,
      "_count": {
        "clients": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Get Rep Statistics
```
GET /api/certified-reps/stats
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "totalReps": 45,
    "activeReps": 38,
    "inactiveReps": 7,
    "totalClients": 234,
    "activeClients": 189,
    "prospectClients": 45,
    "estimatedMonthlyRevenue": 56700.00
  }
}
```

#### Get Rep Details
```
GET /api/certified-reps/:id
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": {
    "id": "rep-uuid",
    "user": { ... },
    "status": "active",
    "subscriptionActive": true,
    "whopMemberId": "mem_xxxxx",
    "discordUserId": "123456789",
    "accessGrantedAt": "2026-01-01T00:00:00Z",
    "totalClients": 5,
    "activeClients": 3,
    "clients": [
      {
        "id": "client-uuid",
        "clientName": "Pizza House",
        "clientEmail": "owner@pizzahouse.com",
        "businessType": "restaurant",
        "setupFee": 1500.00,
        "monthlyFee": 300.00,
        "status": "active",
        "tenantId": "tenant-uuid",
        "convertedAt": "2026-01-05T00:00:00Z"
      }
    ]
  }
}
```

#### Add Client for Rep
```
POST /api/certified-reps/:repId/clients
Authorization: Bearer <admin_token>

Body:
{
  "clientName": "Med Spa Beauty",
  "clientEmail": "owner@medspa.com",
  "clientPhone": "+15551234567",
  "businessType": "med_spa",
  "setupFee": 5000.00,
  "monthlyFee": 800.00,
  "status": "demo_scheduled",
  "notes": "Interested in advanced booking integration"
}

Response:
{
  "success": true,
  "message": "Client added successfully",
  "data": {
    "id": "client-uuid",
    "repId": "rep-uuid",
    "clientName": "Med Spa Beauty",
    ...
  }
}
```

---

## Whop Integration

### Setup

1. **Create Whop Product**
   - Product Name: "First Ring AI - Certified Rep Program"
   - Price: $997 (monthly or one-time)
   - Type: Subscription or Membership

2. **Configure Webhook**
   - Webhook URL: `https://your-api.com/api/integrations/whop/webhook`
   - Events:
     - `membership.created`
     - `membership.updated`
     - `membership.deleted`
     - `payment.succeeded`
     - `payment.failed`

3. **Environment Variables**
   ```env
   WHOP_API_KEY=your_whop_api_key
   WHOP_COMPANY_ID=your_company_id
   WHOP_CERTIFIED_REP_PRODUCT_ID=prod_xxxxx
   ```

### Webhook Flow

```
1. User purchases $997 Certified Rep product on Whop
   ↓
2. Whop fires membership.created webhook
   ↓
3. Backend receives webhook
   POST /api/integrations/whop/webhook
   ↓
4. CertifiedRepsService.handleWhopPurchase()
   - Creates/updates CertifiedRep record
   - Sets status = "active"
   - Sets subscriptionActive = true
   - Records whopMemberId
   ↓
5. Discord role auto-assigned (if Discord connected)
   - Grants "Certified Rep" role
   - Access to private #certified-reps channel
   ↓
6. Welcome email sent with:
   - Discord invite link
   - Sales materials access
   - Onboarding steps
   ↓
7. Rep can now access:
   - Marketing materials
   - Sales scripts
   - AI prompts
   - Support community
```

---

## Discord Integration

### Auto-Role Assignment

When a Certified Rep subscription is activated:

1. **Check Discord Connection**
   - Rep must have linked Discord account
   - Stored in `CertifiedRep.discordUserId`

2. **Assign Role**
   - Role: "Certified Rep"
   - Stored in `CertifiedRep.discordRoleId`
   - Grants access to private channels

3. **Access Granted**
   - `#certified-reps-general` - Community chat
   - `#certified-reps-materials` - Sales materials, scripts, prompts
   - `#certified-reps-support` - Q&A and assistance
   - `#certified-reps-wins` - Success stories, closed deals

### Role Revocation

When subscription is cancelled or payment fails:

1. **Remove Role**
   - Discord role revoked
   - Access to private channels removed

2. **Update Database**
   - `subscriptionActive = false`
   - `accessRevokedAt = now()`
   - `status = "cancelled"`

---

## Sales Materials Provided

Certified Reps receive access to:

### Marketing Assets
- Logo files (white-label available)
- Pitch decks (PowerPoint, PDF)
- Case studies
- Demo videos
- Industry-specific one-pagers

### Sales Tools
- Email templates
- Cold call scripts
- Objection handling guide
- Pricing calculator
- Proposal templates

### Technical
- AI agent prompts (customizable)
- Integration guides
- Setup checklists
- Troubleshooting docs

---

## Client Lifecycle

### 1. Prospect
- Rep adds client via dashboard
- Status: "prospect"
- No charges yet

### 2. Demo Scheduled
- Rep updates status: "demo_scheduled"
- Demo date tracked
- Follow-up reminders

### 3. Proposal Sent
- Rep sends proposal with pricing
- Status: "proposal_sent"
- Deal value recorded

### 4. Active
- Client signs up
- Rep creates tenant (if authorized)
- Status: "active"
- Monthly recurring tracked

### 5. Churned
- Client cancels
- Status: "churned"
- Churn reason logged

---

## Pricing Examples

### Restaurant
- Setup: $1,500
- Monthly: $300
- Rep profit (first year): $1,500 + ($300 × 12) = $5,100

### Med Spa
- Setup: $5,000
- Monthly: $800
- Rep profit (first year): $5,000 + ($800 × 12) = $14,600

### Law Firm
- Setup: $10,000
- Monthly: $1,500
- Rep profit (first year): $10,000 + ($1,500 × 12) = $28,000

**With 3-5 active clients, a rep can earn $50,000-$100,000+ annually.**

---

## Admin Dashboard Features

### Rep Management
- View all reps
- Filter by status (active, inactive, cancelled)
- Track performance metrics
- Suspend/reactivate access

### Client Tracking
- View all rep clients
- Track conversion rates
- Monitor revenue
- Identify top performers

### Analytics
- Total reps enrolled
- Active subscription rate
- Client acquisition trends
- Revenue per rep
- Churn analysis

---

## Support Structure

### Rep Support Channels

1. **Discord Community**
   - Peer-to-peer help
   - Best practices sharing
   - Live Q&A sessions

2. **Documentation**
   - Knowledge base
   - Video tutorials
   - FAQ section

3. **Direct Support**
   - Email: reps@firstring.ai
   - Response time: 24 hours
   - Escalation for urgent issues

---

## Legal & Compliance

### Rep Agreement
- Independent contractor status
- No exclusive territory
- Performance expectations
- Termination clauses

### Client Ownership
- Rep owns client relationship
- Rep sets pricing
- Rep handles billing
- Rep responsible for support (or can use First Ring AI support)

### Brand Usage
- Licensed use of First Ring AI branding
- Cannot modify core technology
- White-label option available (higher tier)

---

## Future Enhancements

### Planned Features
- [ ] Rep dashboard (self-service)
- [ ] Automated lead distribution
- [ ] Commission tracking (if applicable)
- [ ] Advanced analytics
- [ ] Mobile app access
- [ ] White-label portal

---

## Environment Variables

```env
# Whop Integration
WHOP_API_KEY=your_whop_api_key
WHOP_COMPANY_ID=your_company_id
WHOP_CERTIFIED_REP_PRODUCT_ID=prod_xxxxx

# Discord Integration
DISCORD_CERTIFIED_REP_ROLE_ID=role_xxxxx
DISCORD_CERTIFIED_REP_CHANNEL_ID=channel_xxxxx
DISCORD_WEBHOOK_REPS=https://discord.com/api/webhooks/xxxxx

# Email
REP_ONBOARDING_EMAIL_TEMPLATE=template_id
```

---

## Migration & Deployment

### 1. Run Migration
```bash
npx prisma migrate deploy
```

### 2. Seed Initial Data (Optional)
```bash
# Create test Certified Rep
POST /api/certified-reps (via admin)
```

### 3. Configure Whop
- Set up product
- Configure webhook
- Test purchase flow

### 4. Configure Discord
- Create roles
- Set up channels
- Test auto-assignment

---

## Testing Checklist

- [ ] User purchases Certified Rep product on Whop
- [ ] Webhook creates CertifiedRep record
- [ ] Discord role assigned automatically
- [ ] Rep receives onboarding email
- [ ] Rep can access private Discord channels
- [ ] Rep can add clients via dashboard
- [ ] Client conversion tracked correctly
- [ ] Subscription cancellation removes access
- [ ] Payment failure suspends access
- [ ] Admin can view all reps and stats

---

## Support

For questions or issues:
- **Email:** dev@firstring.ai
- **Discord:** #developer-support
- **Docs:** https://docs.firstring.ai/certified-reps

---

**Document Version:** 1.0
**Last Updated:** 2026-01-13
**Status:** Production Ready
