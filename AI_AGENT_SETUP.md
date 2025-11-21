# 🤖 AI Agent Setup Guide

## Twilio + OpenAI Integration

### 📋 Prerequisites

1. **Twilio Account**
   - Sign up: https://www.twilio.com/try-twilio
   - Get Account SID & Auth Token
   - Buy a phone number

2. **OpenAI Account**
   - Sign up: https://platform.openai.com
   - Create API key
   - Enable GPT-4 access

### 🔧 Configuration

#### 1. Environment Variables

Add to `.env`:

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API URL (for webhooks)
API_URL=https://your-domain.com
# or for local dev with ngrok:
API_URL=https://abc123.ngrok.io
```

#### 2. Twilio Webhook Setup

**A) Using ngrok (Development):**

```bash
# Install ngrok
npm install -g ngrok

# Start your backend
npm run dev

# In another terminal, start ngrok
ngrok http 5000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update API_URL in .env
```

**B) Configure Twilio Webhooks:**

1. Go to Twilio Console
2. Select your phone number
3. Configure voice webhooks:
   - **A call comes in:** `https://your-domain.com/api/ai-agent/incoming`
   - **Method:** POST
   - **Status callback:** `https://your-domain.com/api/ai-agent/status`

### 🎯 How It Works

#### **Call Flow:**

```
1. Customer calls Twilio number
   ↓
2. Twilio sends webhook to /api/ai-agent/incoming
   ↓
3. AI generates greeting
   ↓
4. User speaks
   ↓
5. Twilio sends speech to /api/ai-agent/process
   ↓
6. AI detects intent (OpenAI GPT-4)
   ↓
7. AI handles intent:
   - FAQ: Search FAQ database
   - Booking: Create reservation
   - Order: Process order + Stripe link
   - Lead: Capture contact info
   - Escalation: Transfer to human
   ↓
8. AI responds with TwiML
   ↓
9. Call continues or ends
```

### 🧪 Testing

#### **Test AI Agent (Without Phone):**

```bash
curl -X POST http://localhost:5000/api/ai-agent/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userInput": "Hello, I want a table for 4 on Friday",
    "language": "en"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "response": "Great! What time on Friday?",
    "intent": "booking",
    "confidence": 0.92
  }
}
```

#### **Test Live Call:**

1. Call your Twilio number
2. Say: "Hello"
3. AI will respond with greeting
4. Try different intents:
   - "What time do you open?" (FAQ)
   - "I want a table for tomorrow at 7pm" (Booking)
   - "I want to order 2 pizzas" (Order)
   - "I want to speak to an operator" (Escalation)

### 📊 Intent Detection Examples

#### **FAQ Intent:**
```
User: "What time do you open?"
Intent: faq
Confidence: 0.95
Response: "We are open daily from 10:00 to 23:00"
```

#### **Booking Intent:**
```
User: "Table for 4 on Friday"
Intent: booking
Confidence: 0.88
Response: "What time?" → Collect details → Create booking
```

#### **Order Intent:**
```
User: "2 margherita pizzas and 1 cola"
Intent: order
Confidence: 0.92
Response: "Total $32.97. Payment link sent via SMS"
```

#### **Lead Intent:**
```
User: "I want information about your service"
Intent: lead
Confidence: 0.85
Response: "Great! How can we contact you?"
```

### 🔄 OpenAI Integration

#### **Intent Detection:**

Uses GPT-4 to analyze user input:
```typescript
const prompt = `
You are an AI assistant for Pizza House, a restaurant.
Analyze: "I want 2 pizzas"

Available intents: faq, booking, order, lead, escalation, unknown

Respond with JSON:
{
  "intent": "order",
  "confidence": 0.9,
  "entities": {"quantity": 2, "item": "pizza"}
}
`;
```

#### **Response Generation:**

Uses GPT-4 for intelligent responses:
```typescript
messages: [
  {
    role: "system",
    content: "You are AI assistant for Pizza House. Be friendly."
  },
  ...conversationHistory
]
```

### 📞 Outbound Calling

#### **Initiate Cold Call:**

```bash
curl -X POST http://localhost:5000/api/ai-agent/outbound \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "toNumber": "+15551234567",
    "script": "sales_intro"
  }'
```

#### **Outbound Script:**

```
AI: "Hello! I'm Sarah from First Ring AI. Do you have
     a minute to discuss your business?"

User: "Yes"

AI: "Great! What industry are you in?"
...
```

### 🔐 Security

#### **Webhook Validation:**

Twilio sends requests with signature. Validate:

```typescript
import twilio from 'twilio';

const isValid = twilio.validateRequest(
  process.env.TWILIO_AUTH_TOKEN,
  signature,
  url,
  params
);

if (!isValid) {
  throw new Error('Invalid Twilio signature');
}
```

### 📈 Monitoring

#### **Call Logs:**

All calls are logged to database:
```sql
SELECT * FROM calls 
WHERE tenant_id = 'xxx' 
ORDER BY created_at DESC;
```

#### **Analytics:**

```bash
curl http://localhost:5000/api/calls/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "totalCalls": 150,
  "avgDuration": 180,
  "byIntent": {
    "faq": 45,
    "booking": 60,
    "order": 30,
    "escalation": 15
  }
}
```

### 🐛 Troubleshooting

#### **Call not connecting:**
- Check Twilio webhook URL is correct
- Verify ngrok is running (dev)
- Check Twilio console for errors

#### **AI not responding:**
- Verify OPENAI_API_KEY is set
- Check API quota/billing
- Review logs: `logs/error.log`

#### **Speech not recognized:**
- Twilio uses appropriate language code (e.g., `en-US`)
- Check pronunciation is clear
- Review Twilio console transcripts

### 💰 Costs

#### **Twilio:**
- Phone number: ~$1/month
- Incoming calls: $0.0085/min
- Outgoing calls: $0.013/min
- SMS: $0.0075/message

#### **OpenAI:**
- GPT-4: $0.03/1K tokens input
- Average call: ~500 tokens = $0.015

**Total per call:** ~$0.03

### 🚀 Production Deployment

1. Deploy to cloud (AWS/Heroku/Railway)
2. Get production domain
3. Update Twilio webhooks
4. Enable SSL/TLS
5. Set up monitoring
6. Configure auto-scaling

### 📚 Resources

- Twilio Docs: https://www.twilio.com/docs/voice
- OpenAI Docs: https://platform.openai.com/docs
- TwiML Reference: https://www.twilio.com/docs/voice/twiml

---

Made with ❤️ by First Ring AI Team
