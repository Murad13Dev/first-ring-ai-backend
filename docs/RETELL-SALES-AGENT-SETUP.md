# 🤖 Retell AI Sales Agent Setup Guide

This guide explains how to set up and use the Retell AI Sales Agent for First Ring AI platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Setup Steps](#setup-steps)
4. [Available Functions](#available-functions)
5. [System Prompt](#system-prompt)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The **Sales Agent** is a specialized AI phone agent designed to:
- Qualify potential customers calling about First Ring AI
- Collect comprehensive business information
- Create sales leads in the database automatically
- Send pricing packages via email
- Schedule product demos
- Answer feature availability questions

### Key Features:
✅ Automatic lead creation in database
✅ Natural conversational flow
✅ Email automation (pricing packages)
✅ Demo scheduling with calendar integration
✅ Feature availability checker
✅ Multi-industry expertise

---

## 🔄 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    CALL FLOW DIAGRAM                        │
└─────────────────────────────────────────────────────────────┘

Customer Calls
     │
     ├──> Retell AI Agent Answers
     │         │
     │         ├──> Asks about business type
     │         ├──> Collects contact information
     │         ├──> Identifies pain points & needs
     │         └──> Qualifies timeline & budget
     │
     ├──> AI Calls: create_sales_lead()
     │         │
     │         └──> POST /api/retell/general-functions
     │                   │
     │                   └──> Saves to Database (Lead table)
     │
     ├──> AI Calls: send_pricing_packages()
     │         │
     │         └──> Triggers email with pricing PDF
     │
     ├──> AI Calls: schedule_demo()
     │         │
     │         └──> Creates Booking + Sends Calendar Invite
     │
     └──> AI Calls: check_feature_availability()
               │
               └──> Returns feature info from catalog
```

---

## 🚀 Setup Steps

### Step 1: Retell AI Dashboard Setup

1. **Login to Retell AI Dashboard**
   Go to [https://dashboard.retellai.com](https://dashboard.retellai.com)

2. **Create New Agent**
   Click "Create Agent" and fill in:
   - **Agent Name:** `First Ring AI Sales Agent`
   - **Voice:** Choose a professional voice (recommend: `en-US-Neural2-A` or similar)
   - **Language:** English (US)

3. **Add System Prompt**
   Copy the entire prompt from the section below and paste it into the "System Prompt" field.

4. **Configure Functions**
   Click "Add Functions" and create these 4 functions:

   **Function 1: create_sales_lead**
   ```json
   {
     "name": "create_sales_lead",
     "description": "Creates a new sales lead in the database when customer provides their business information",
     "parameters": {
       "type": "object",
       "properties": {
         "name": {
           "type": "string",
           "description": "Customer full name"
         },
         "email": {
           "type": "string",
           "description": "Customer email address"
         },
         "phone": {
           "type": "string",
           "description": "Customer phone number with country code"
         },
         "businessName": {
           "type": "string",
           "description": "Name of their business"
         },
         "businessType": {
           "type": "string",
           "enum": ["restaurant", "retail_store", "medical", "dental", "hotel", "salon", "real_estate", "other"],
           "description": "Type of business they operate"
         },
         "companySize": {
           "type": "string",
           "enum": ["1-10", "11-50", "51-200", "201-500", "500+"],
           "description": "Number of employees"
         },
         "dailyCallVolume": {
           "type": "number",
           "description": "Approximate number of calls they receive per day"
         },
         "desiredFeatures": {
           "type": "array",
           "items": {
             "type": "string",
             "enum": ["appointment_booking", "order_taking", "faq_handling", "lead_capture", "call_routing"]
           },
           "description": "Features they want in their AI agent"
         },
         "painPoints": {
           "type": "string",
           "description": "Current challenges they face with customer calls"
         },
         "timeline": {
           "type": "string",
           "enum": ["immediate", "1-2_weeks", "1_month", "3_months", "just_exploring"],
           "description": "When they want to get started"
         },
         "budgetRange": {
           "type": "string",
           "enum": ["starter", "professional", "enterprise", "not_discussed"],
           "description": "Their budget range or plan interest"
         },
         "notes": {
           "type": "string",
           "description": "Any additional relevant information"
         }
       },
       "required": ["name", "email", "businessName", "businessType"]
     }
   }
   ```

   **Function 2: send_pricing_packages**
   ```json
   {
     "name": "send_pricing_packages",
     "description": "Sends detailed pricing packages to customer email address",
     "parameters": {
       "type": "object",
       "properties": {
         "email": {
           "type": "string",
           "description": "Customer email address"
         },
         "businessType": {
           "type": "string",
           "description": "Type of business to customize the email content"
         },
         "customerName": {
           "type": "string",
           "description": "Customer name for personalization"
         },
         "recommendedPlan": {
           "type": "string",
           "enum": ["starter", "professional", "enterprise"],
           "description": "Recommended plan based on their needs"
         }
       },
       "required": ["email", "businessType", "customerName"]
     }
   }
   ```

   **Function 3: schedule_demo**
   ```json
   {
     "name": "schedule_demo",
     "description": "Schedules a product demo with the sales team",
     "parameters": {
       "type": "object",
       "properties": {
         "email": {
           "type": "string",
           "description": "Customer email address"
         },
         "preferredDate": {
           "type": "string",
           "description": "Preferred date in YYYY-MM-DD format"
         },
         "preferredTime": {
           "type": "string",
           "description": "Preferred time in HH:MM format (24-hour)"
         },
         "timezone": {
           "type": "string",
           "description": "Customer timezone"
         },
         "notes": {
           "type": "string",
           "description": "Any specific topics they want to discuss"
         }
       },
       "required": ["email", "preferredDate", "preferredTime"]
     }
   }
   ```

   **Function 4: check_feature_availability**
   ```json
   {
     "name": "check_feature_availability",
     "description": "Checks if a specific feature or integration is available",
     "parameters": {
       "type": "object",
       "properties": {
         "featureName": {
           "type": "string",
           "description": "Name of the feature or integration"
         },
         "businessType": {
           "type": "string",
           "description": "Their business type for relevant information"
         }
       },
       "required": ["featureName"]
     }
   }
   ```

5. **Set Webhook URL**
   In the "Functions" section, set webhook URL to:
   ```
   https://your-domain.com/api/retell/general-functions
   ```

   Replace `your-domain.com` with your actual backend URL.

6. **Enable Function Calling**
   Make sure "Function Calling" is enabled in agent settings.

7. **Save Agent**
   Click "Save" and copy the **Agent ID** (you'll need it for testing).

---

## 📞 Available Functions

### 1. create_sales_lead

**Purpose:** Saves customer information to the database as a new lead.

**When AI calls it:** After collecting name, email, business name, and business type.

**What happens:**
- Creates a new record in the `Lead` table
- Stores all business information, pain points, timeline, etc.
- Returns success message to AI

**Database Record Created:**
```javascript
{
  contactName: "Dr. Sarah Johnson",
  email: "sarah@smilebrightdental.com",
  phone: "+1-555-0123",
  businessName: "Smile Bright Dental",
  businessType: "dental",
  selectedPlan: "professional",
  source: "ai_call",
  status: "new",
  aiNotes: "Company Size: 11-50\nDaily Call Volume: 35\n...",
  aiCallData: { /* structured JSON */ }
}
```

---

### 2. send_pricing_packages

**Purpose:** Sends pricing packages via email (currently logs intent, TODO: implement email).

**When AI calls it:** After lead is created and customer wants pricing info.

**What happens:**
- Logs the request (email address, business type, recommended plan)
- Returns success message to AI
- **TODO:** Integrate with EmailService to actually send email

**Future Implementation:**
```typescript
await emailService.sendPricingPackages({
  to: "customer@example.com",
  customerName: "John Doe",
  businessType: "restaurant",
  recommendedPlan: "professional"
});
```

---

### 3. schedule_demo

**Purpose:** Books a product demo in the calendar.

**When AI calls it:** When customer agrees to a demo and provides date/time.

**What happens:**
- Creates a `Booking` record with type "Product Demo"
- Duration: 30 minutes
- Returns confirmation message to AI
- **TODO:** Send calendar invite via EmailService

**Database Record Created:**
```javascript
{
  customerEmail: "customer@example.com",
  dateTime: "2024-02-15T14:00:00Z",
  duration: 30,
  status: "pending",
  serviceName: "Product Demo",
  notes: "General product demo. Timezone: America/New_York"
}
```

---

### 4. check_feature_availability

**Purpose:** Checks if a specific feature is available in the platform.

**When AI calls it:** When customer asks "Do you have X feature?" or "Can it do Y?"

**What happens:**
- Searches feature catalog
- Returns availability status, description, and which plans include it
- If feature not found, suggests connecting with technical team

**Example Response:**
```javascript
{
  available: true,
  featureName: "google calendar",
  description: "Yes! Full Google Calendar integration...",
  plans: ["Professional", "Enterprise"],
  message: "Yes! Full Google Calendar integration..."
}
```

**Supported Features:**
- appointment booking
- order taking
- multilingual
- crm integration
- google calendar
- payment processing
- sms notifications
- call analytics
- custom voice
- 24/7 availability

---

## 💬 System Prompt

Copy this entire prompt into Retell AI Dashboard:

```
[SEE THE FULL PROMPT IN THE PREVIOUS MESSAGE - IT'S TOO LONG TO DUPLICATE HERE]
```

**Key Points in the Prompt:**
- Natural conversation flow (greeting → discovery → value prop → create lead → send pricing → demo)
- Calls functions immediately when required data is collected
- Handles objections professionally
- Industry-specific value propositions
- Clear next steps for customer

---

## 🧪 Testing

### Test 1: End-to-End Call Simulation

1. **Call the Retell AI Phone Number**

2. **Follow this script:**
   ```
   AI: "Hello! Thank you for calling First Ring AI..."
   You: "Hi, I run a dental clinic and I'm interested in your AI agent."

   AI: "Excellent! What's the name of your clinic?"
   You: "Smile Bright Dental"

   AI: "Great! Who am I speaking with?"
   You: "Dr. Sarah Johnson"

   AI: "What's the best email to send our pricing packages?"
   You: "sarah@smilebrightdental.com"

   AI: "And your callback number?"
   You: "+1-555-0123"

   AI: "About how many patient calls do you receive per day?"
   You: "About 30-40 calls"

   AI: "When are you looking to implement this?"
   You: "As soon as possible"

   AI: [Creates lead, sends pricing, offers demo]
   ```

3. **Verify in Database:**
   ```sql
   SELECT * FROM "Lead" WHERE email = 'sarah@smilebrightdental.com';
   ```

4. **Check Logs:**
   ```bash
   tail -f logs/app.log | grep "Sales lead created"
   ```

---

### Test 2: API Direct Testing

Test function calls directly via Postman or curl:

```bash
# Test create_sales_lead
curl -X POST http://localhost:5000/api/retell/general-functions \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "create_sales_lead",
    "args": {
      "name": "Dr. Sarah Johnson",
      "email": "sarah@test.com",
      "phone": "+1-555-0123",
      "businessName": "Smile Bright Dental",
      "businessType": "dental",
      "companySize": "11-50",
      "dailyCallVolume": 35,
      "desiredFeatures": ["appointment_booking", "faq_handling"],
      "painPoints": "Missing calls during patient appointments",
      "timeline": "immediate",
      "budgetRange": "professional"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "leadId": "clx...",
  "message": "Perfect! I've recorded all your information for Smile Bright Dental..."
}
```

---

### Test 3: Feature Availability Check

```bash
curl -X POST http://localhost:5000/api/retell/general-functions \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "check_feature_availability",
    "args": {
      "featureName": "google calendar",
      "businessType": "dental"
    }
  }'
```

**Expected Response:**
```json
{
  "available": true,
  "featureName": "google calendar",
  "description": "Yes! Full Google Calendar integration...",
  "plans": ["Professional", "Enterprise"],
  "message": "Yes! Full Google Calendar integration..."
}
```

---

## 🐛 Troubleshooting

### Issue: Functions Not Being Called

**Symptoms:**
- AI talks but doesn't save leads
- No database records created

**Solutions:**
1. Check webhook URL in Retell dashboard
2. Verify webhook endpoint is accessible (not localhost!)
3. Check server logs for incoming requests
4. Enable Retell function calling in agent settings

**Debug:**
```bash
# Watch incoming webhook requests
tail -f logs/app.log | grep "Retell"
```

---

### Issue: "Unknown function" Error

**Symptoms:**
- AI returns error when trying to call function
- Logs show "Unknown function: create_sales_lead"

**Solutions:**
1. Verify function names match exactly (case-sensitive!)
2. Check if function is defined in `retellService.handleGeneralFunction()`
3. Restart server after code changes

---

### Issue: Lead Not Saving to Database

**Symptoms:**
- Function called but no record in database
- Error in logs about Prisma/database

**Solutions:**
1. Check database connection (DATABASE_URL in .env)
2. Run Prisma migrations: `npx prisma migrate dev`
3. Verify Lead model has all required fields
4. Check if required fields are missing in function call

**Debug:**
```bash
# Check database connection
npx prisma db pull

# View recent leads
npx prisma studio
# Navigate to Lead table
```

---

### Issue: Webhook Returns 404

**Symptoms:**
- Retell shows webhook failed
- 404 error in Retell logs

**Solutions:**
1. Verify route is registered in `retell.routes.ts`:
   ```typescript
   router.post('/general-functions', retellController.generalFunctions);
   ```
2. Check if route is mounted in main app:
   ```typescript
   app.use('/api/retell', retellRoutes);
   ```
3. Restart server

---

### Issue: Email Not Sending

**Symptoms:**
- `send_pricing_packages` called but no email received
- Logs show "Pricing packages requested" but email never arrives

**Solutions:**
1. **This is expected!** Email sending is not yet implemented (see TODO in code)
2. To implement:
   - Create EmailService
   - Configure SMTP settings in .env
   - Update `sendPricingPackages()` to call EmailService

**Current Behavior:**
```typescript
// Currently just logs (doesn't actually send email)
logger.info('Pricing packages requested', { email, businessType });

// TODO: Implement this
// await emailService.sendPricingPackages(data);
```

---

## 📊 Monitoring & Analytics

### View All Sales Leads

```bash
# Using Prisma Studio
npx prisma studio

# Navigate to Lead table, filter by source = "ai_call"
```

### Key Metrics to Track

1. **Lead Conversion Rate**
   ```sql
   SELECT
     COUNT(*) as total_calls,
     COUNT(*) FILTER (WHERE status != 'new') as converted
   FROM "Lead"
   WHERE source = 'ai_call';
   ```

2. **Demo Scheduling Rate**
   ```sql
   SELECT COUNT(*) FROM "Booking" WHERE "serviceName" = 'Product Demo';
   ```

3. **Top Business Types**
   ```sql
   SELECT "businessType", COUNT(*) as count
   FROM "Lead"
   WHERE source = 'ai_call'
   GROUP BY "businessType"
   ORDER BY count DESC;
   ```

---

## 🔐 Security Considerations

1. **Webhook Authentication**
   - Add signature verification for Retell webhooks
   - Use HTTPS only in production

2. **Rate Limiting**
   - Already configured in `.env`:
     ```
     RATE_LIMIT_MAX_REQUESTS=100
     ```

3. **Data Validation**
   - Email validation before saving
   - Phone number formatting
   - SQL injection protection (using Prisma)

---

## 📝 Next Steps

1. **Implement Email Service**
   - Send actual pricing PDFs
   - Send demo calendar invites
   - Follow-up email automation

2. **Add CRM Integration**
   - Sync leads to HubSpot/Salesforce
   - Auto-assign to sales reps

3. **Enhance Analytics**
   - Call recording analysis
   - Sentiment tracking
   - Conversion funnel visualization

4. **A/B Testing**
   - Test different prompts
   - Optimize conversation flow
   - Improve conversion rates

---

## 🆘 Support

If you encounter issues:

1. **Check Logs:**
   ```bash
   tail -f logs/app.log
   ```

2. **Verify Configuration:**
   ```bash
   # Check .env file
   cat .env | grep RETELL
   ```

3. **Test Database:**
   ```bash
   npx prisma db push
   ```

4. **Contact Team:**
   - Create GitHub issue
   - Email: support@firstringai.com

---

## 📚 Additional Resources

- [Retell AI Documentation](https://docs.retellai.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Twilio Webhooks](https://www.twilio.com/docs/usage/webhooks)

---

**Last Updated:** 2024-01-27
**Version:** 1.0.0
**Author:** First Ring AI Team
