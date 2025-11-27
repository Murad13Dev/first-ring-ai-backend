# Email Service Module

Professional email service for sending pricing packages and demo confirmations.

## Features

- ✅ **Pricing Packages Email** - Beautiful HTML email with all pricing plans
- ✅ **Demo Confirmation Email** - Professional confirmation with meeting details
- ✅ **Responsive Design** - Looks great on all devices
- ✅ **Professional Templates** - Clean, branded HTML emails
- ✅ **NodeMailer Integration** - Reliable SMTP email delivery

---

## Setup

### 1. Configure SMTP Settings in `.env`

```bash
# Gmail Example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@firstringai.com
SALES_EMAIL=sales@firstringai.com
```

### 2. Gmail App Password Setup

If using Gmail, you need an **App Password** (not your regular password):

1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate password for "Mail"
5. Use that password in `SMTP_PASSWORD`

---

## Usage

### Send Pricing Packages

```typescript
import { emailService } from './modules/email/email.service';

await emailService.sendPricingPackages({
  to: 'customer@example.com',
  customerName: 'Dr. Sarah Johnson',
  businessType: 'dental',
  recommendedPlan: 'professional', // optional: 'starter', 'professional', 'enterprise'
});
```

### Send Demo Confirmation

```typescript
await emailService.sendDemoConfirmation({
  to: 'customer@example.com',
  customerName: 'John Smith',
  date: '2024-02-15',
  time: '14:00',
  timezone: 'America/New_York',
});
```

---

## Testing

### Quick Test

```bash
# Set test email in .env
TEST_EMAIL=your-test@email.com

# Run test script
npx ts-node src/modules/email/email.test.ts
```

### Manual API Test

```bash
curl -X POST http://localhost:5000/api/retell/general-functions \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "send_pricing_packages",
    "args": {
      "email": "test@example.com",
      "customerName": "Test User",
      "businessType": "restaurant",
      "recommendedPlan": "professional"
    }
  }'
```

---

## Email Templates

### Pricing Packages Email

Features:
- All 3 pricing plans (Starter, Professional, Enterprise)
- Highlighted recommended plan
- Feature comparison
- Professional styling
- Call-to-action button
- Next steps section

Preview: Open `src/modules/email/email.service.ts` and see `generatePricingEmailHTML()`

### Demo Confirmation Email

Features:
- Meeting date, time, timezone
- What to expect section
- Preparation checklist
- Meeting link (placeholder)
- Professional branding

Preview: Open `src/modules/email/email.service.ts` and see `generateDemoConfirmationHTML()`

---

## Customization

### Change Email Branding

Edit the templates in `email.service.ts`:

```typescript
// Change colors
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// Change company name
<h1>🤖 Your Company Name</h1>

// Change pricing
<div class="price">$99<span>/month</span></div>
```

### Add Attachments

```typescript
const mailOptions = {
  from: '...',
  to: '...',
  subject: '...',
  html: '...',
  attachments: [
    {
      filename: 'pricing-guide.pdf',
      path: './assets/pricing-guide.pdf',
    },
  ],
};
```

---

## Troubleshooting

### Email Not Sending

1. **Check SMTP credentials:**
   ```bash
   echo $SMTP_USER
   echo $SMTP_PASSWORD
   ```

2. **Test SMTP connection:**
   ```bash
   npx ts-node src/modules/email/email.test.ts
   ```

3. **Check logs:**
   ```bash
   tail -f logs/app.log | grep "email"
   ```

### Gmail "Less Secure App" Error

- Don't use your regular password
- Use an **App Password** instead (see setup above)
- Make sure 2FA is enabled

### Emails Going to Spam

- Use a verified domain email (not Gmail) in production
- Set up SPF, DKIM, and DMARC records
- Use a transactional email service (SendGrid, Mailgun) for production

---

## Production Recommendations

For production, consider using a transactional email service:

### Option 1: SendGrid

```bash
npm install @sendgrid/mail

# .env
SENDGRID_API_KEY=your-api-key
```

### Option 2: AWS SES

```bash
npm install @aws-sdk/client-ses

# .env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
```

### Option 3: Mailgun

```bash
npm install mailgun-js

# .env
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=yourdomain.com
```

---

## API Integration

This email service is automatically used by:

- **Retell AI Sales Agent** - Sends pricing after lead creation
- **Demo Booking System** - Sends confirmation after scheduling

See `src/modules/retell/retell.service.ts` for integration examples.

---

## Files

```
src/modules/email/
├── email.service.ts      # Main email service
├── email.test.ts         # Test script
└── README.md             # This file
```

---

## Support

If you encounter issues:

1. Check `.env` configuration
2. Run test script: `npx ts-node src/modules/email/email.test.ts`
3. Check SMTP provider documentation
4. Review logs: `tail -f logs/app.log`

---

**Created:** 2024-01-27
**Version:** 1.0.0
**Author:** First Ring AI Team
