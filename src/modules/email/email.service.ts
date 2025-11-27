import nodemailer from 'nodemailer';
import logger from '../../config/logger';

/**
 * Email Service
 * Handles all email sending functionality using NodeMailer
 */
export const emailService = {
  /**
   * Create NodeMailer transporter
   */
  getTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  },

  /**
   * Send pricing packages email to potential customer
   */
  async sendPricingPackages(data: {
    to: string;
    customerName: string;
    businessType: string;
    recommendedPlan?: string;
  }) {
    try {
      const transporter = this.getTransporter();
      const subject = `Your First Ring AI Pricing & Features - ${this.formatBusinessType(data.businessType)}`;
      const html = this.generatePricingEmailHTML(data);

      const mailOptions = {
        from: `"First Ring AI Sales" <${process.env.SALES_EMAIL || process.env.SMTP_USER}>`,
        to: data.to,
        subject,
        html,
        // Optional: Attach PDF pricing guide
        // attachments: [
        //   {
        //     filename: 'FirstRingAI-Pricing.pdf',
        //     path: './assets/pricing-packages.pdf',
        //   }
        // ]
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Pricing packages email sent', {
        to: data.to,
        messageId: info.messageId,
        businessType: data.businessType,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Error sending pricing packages email:', error);
      throw error;
    }
  },

  /**
   * Send demo confirmation email with calendar invite
   */
  async sendDemoConfirmation(data: {
    to: string;
    customerName?: string;
    date: string;
    time: string;
    timezone?: string;
  }) {
    try {
      const transporter = this.getTransporter();
      const subject = 'Your First Ring AI Demo is Confirmed! 🎯';
      const html = this.generateDemoConfirmationHTML(data);

      const mailOptions = {
        from: `"First Ring AI Sales" <${process.env.SALES_EMAIL || process.env.SMTP_USER}>`,
        to: data.to,
        subject,
        html,
        // Optional: Add calendar invite attachment
        // icalEvent: {
        //   method: 'request',
        //   content: this.generateICalEvent(data),
        // }
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Demo confirmation email sent', {
        to: data.to,
        messageId: info.messageId,
        date: data.date,
        time: data.time,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error('Error sending demo confirmation email:', error);
      throw error;
    }
  },

  /**
   * Generate pricing email HTML template
   */
  generatePricingEmailHTML(data: {
    customerName: string;
    businessType: string;
    recommendedPlan?: string;
  }): string {
    const recommendedPlan = data.recommendedPlan || 'professional';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .header p {
      margin: 10px 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
    }
    .plan {
      background: #f9f9f9;
      margin: 20px 0;
      padding: 25px;
      border-radius: 8px;
      border: 2px solid #e0e0e0;
      transition: all 0.3s ease;
    }
    .plan.recommended {
      border: 3px solid #667eea;
      background: #f0f4ff;
      position: relative;
    }
    .plan.recommended .badge {
      position: absolute;
      top: -12px;
      right: 20px;
      background: #667eea;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .plan h3 {
      color: #667eea;
      margin: 0 0 15px 0;
      font-size: 22px;
    }
    .price {
      font-size: 36px;
      font-weight: 700;
      color: #333;
      margin: 10px 0;
    }
    .price span {
      font-size: 16px;
      color: #666;
      font-weight: 400;
    }
    .features {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    .features li {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      font-size: 15px;
    }
    .features li:last-child {
      border-bottom: none;
    }
    .features li:before {
      content: "✓";
      color: #667eea;
      font-weight: bold;
      margin-right: 10px;
      font-size: 18px;
    }
    .perfect-for {
      background: #e8f4f8;
      padding: 12px 15px;
      border-radius: 6px;
      margin-top: 15px;
      font-size: 14px;
    }
    .perfect-for strong {
      color: #0066cc;
    }
    .cta {
      text-align: center;
      margin: 30px 0;
    }
    .cta-button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: background 0.3s ease;
    }
    .cta-button:hover {
      background: #5568d3;
    }
    .next-steps {
      background: #fff9e6;
      border-left: 4px solid #ffc107;
      padding: 20px;
      margin: 30px 0;
      border-radius: 4px;
    }
    .next-steps h4 {
      margin: 0 0 15px 0;
      color: #f57c00;
    }
    .next-steps ol {
      margin: 0;
      padding-left: 20px;
    }
    .next-steps li {
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f9f9f9;
      color: #666;
      font-size: 13px;
      border-top: 1px solid #eee;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .contact-info {
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 First Ring AI</h1>
      <p>Your Intelligent Phone Agent Solution</p>
    </div>

    <div class="content">
      <div class="greeting">
        <p>Hi ${data.customerName},</p>

        <p>Thank you for your interest in First Ring AI for your <strong>${this.formatBusinessType(data.businessType)}</strong> business!</p>

        <p>Based on our conversation, I've prepared our pricing packages customized for your needs:</p>
      </div>

      <!-- STARTER PLAN -->
      <div class="plan">
        <h3>🌱 Starter Plan</h3>
        <div class="price">$99<span>/month</span></div>
        <ul class="features">
          <li>500 call minutes per month</li>
          <li>1 dedicated phone number</li>
          <li>Basic AI features (FAQ, Booking, Lead Capture)</li>
          <li>Call transcripts & recordings</li>
          <li>9 language support</li>
          <li>Email support (24-hour response)</li>
          <li>Analytics dashboard</li>
        </ul>
        <div class="perfect-for">
          <strong>Perfect for:</strong> Small businesses getting started with AI automation
        </div>
      </div>

      <!-- PROFESSIONAL PLAN (RECOMMENDED) -->
      <div class="plan ${recommendedPlan === 'professional' ? 'recommended' : ''}">
        ${recommendedPlan === 'professional' ? '<div class="badge">⭐ RECOMMENDED FOR YOU</div>' : ''}
        <h3>🚀 Professional Plan</h3>
        <div class="price">$299<span>/month</span></div>
        <ul class="features">
          <li>2,000 call minutes per month</li>
          <li>Up to 3 phone numbers</li>
          <li>All AI features (Booking, Orders, Payments, Lead Capture)</li>
          <li>Google Calendar & Outlook integration</li>
          <li>Payment processing (Stripe, Square)</li>
          <li>CRM integration (Zapier, API)</li>
          <li>SMS notifications & reminders</li>
          <li>Priority support (4-hour response)</li>
          <li>Advanced analytics & reporting</li>
          <li>Custom AI voice & personality</li>
          <li>Call routing & escalation</li>
        </ul>
        <div class="perfect-for">
          <strong>Perfect for:</strong> Growing businesses with steady call volume and integration needs
        </div>
      </div>

      <!-- ENTERPRISE PLAN -->
      <div class="plan ${recommendedPlan === 'enterprise' ? 'recommended' : ''}">
        ${recommendedPlan === 'enterprise' ? '<div class="badge">⭐ RECOMMENDED FOR YOU</div>' : ''}
        <h3>💼 Enterprise Plan</h3>
        <div class="price">Custom<span> pricing</span></div>
        <ul class="features">
          <li>Unlimited call minutes</li>
          <li>Unlimited phone numbers</li>
          <li>All Professional features included</li>
          <li>White-label options</li>
          <li>Dedicated account manager</li>
          <li>Custom AI training & optimization</li>
          <li>Multi-location support</li>
          <li>Advanced API access</li>
          <li>Custom integrations</li>
          <li>99.9% SLA guarantee</li>
          <li>24/7 premium support</li>
          <li>Voice cloning (match your brand voice)</li>
        </ul>
        <div class="perfect-for">
          <strong>Perfect for:</strong> Large organizations, franchises, and enterprises
        </div>
      </div>

      <div class="cta">
        <a href="https://firstringai.com/schedule-demo" class="cta-button">📅 Schedule Your Free Demo</a>
      </div>

      <div class="next-steps">
        <h4>📋 Next Steps:</h4>
        <ol>
          <li>Review the pricing plans above</li>
          <li>Schedule a 15-minute live demo to see the AI in action</li>
          <li>Ask any questions about features or integrations</li>
          <li>Get set up and live within 3-5 business days</li>
        </ol>
      </div>

      <p style="margin-top: 30px;">
        <strong>Have questions?</strong><br>
        Simply reply to this email or call us at <strong>+1-555-FIRSTAI</strong>
      </p>

      <p>
        Looking forward to helping your business never miss another call! 📞
      </p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>First Ring AI Sales Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>First Ring AI</strong> | Intelligent Phone Agents for Modern Businesses</p>
      <div class="contact-info">
        <p>
          🌐 <a href="https://firstringai.com">www.firstringai.com</a> |
          📧 <a href="mailto:sales@firstringai.com">sales@firstringai.com</a> |
          📞 +1-555-FIRSTAI
        </p>
      </div>
      <p style="margin-top: 15px; color: #999; font-size: 11px;">
        You received this email because you inquired about First Ring AI services.<br>
        © ${new Date().getFullYear()} First Ring AI. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * Generate demo confirmation email HTML
   */
  generateDemoConfirmationHTML(data: {
    customerName?: string;
    date: string;
    time: string;
    timezone?: string;
  }): string {
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px 30px;
    }
    .demo-details {
      background: #f0f4ff;
      border-left: 4px solid #667eea;
      padding: 25px;
      margin: 25px 0;
      border-radius: 4px;
    }
    .demo-details h3 {
      margin: 0 0 15px 0;
      color: #667eea;
    }
    .detail-row {
      display: flex;
      margin: 12px 0;
      font-size: 16px;
    }
    .detail-label {
      font-weight: 600;
      min-width: 100px;
    }
    .detail-value {
      color: #555;
    }
    .what-to-expect {
      background: #fff9e6;
      padding: 20px;
      border-radius: 6px;
      margin: 25px 0;
    }
    .what-to-expect h4 {
      margin: 0 0 15px 0;
      color: #f57c00;
    }
    .what-to-expect ul {
      margin: 0;
      padding-left: 20px;
    }
    .what-to-expect li {
      margin: 8px 0;
    }
    .cta-button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 14px 35px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 30px;
      background: #f9f9f9;
      color: #666;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Demo Confirmed!</h1>
    </div>

    <div class="content">
      ${data.customerName ? `<p>Hi ${data.customerName},</p>` : '<p>Hello!</p>'}

      <p><strong>Great news!</strong> Your First Ring AI product demonstration is confirmed.</p>

      <div class="demo-details">
        <h3>📅 Demo Details</h3>
        <div class="detail-row">
          <div class="detail-label">Date:</div>
          <div class="detail-value">${formattedDate}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Time:</div>
          <div class="detail-value">${data.time} ${data.timezone || 'UTC'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Duration:</div>
          <div class="detail-value">30 minutes</div>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="https://meet.firstringai.com/demo" class="cta-button">
          🎥 Join Demo Meeting
        </a>
      </div>

      <div class="what-to-expect">
        <h4>💡 What to Expect:</h4>
        <ul>
          <li><strong>Live Platform Walkthrough:</strong> See the AI agent in action handling real customer scenarios</li>
          <li><strong>Customization Options:</strong> Learn how to tailor the AI to your specific business needs</li>
          <li><strong>Integration Demo:</strong> View how it connects with your calendar, CRM, and payment systems</li>
          <li><strong>Q&A Session:</strong> Get answers to all your questions about features and implementation</li>
          <li><strong>Pricing Discussion:</strong> Review plans and find the best fit for your business</li>
        </ul>
      </div>

      <p><strong>Prepare for the Demo:</strong></p>
      <ul>
        <li>Have your business requirements ready</li>
        <li>Think about your current pain points with phone calls</li>
        <li>List any specific features you're interested in</li>
        <li>Prepare questions about integrations</li>
      </ul>

      <p style="margin-top: 30px;">
        <strong>Need to reschedule?</strong><br>
        Simply reply to this email or call us at <strong>+1-555-FIRSTAI</strong>
      </p>

      <p>See you soon! 🚀</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>First Ring AI Sales Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>First Ring AI</strong></p>
      <p>📧 sales@firstringai.com | 📞 +1-555-FIRSTAI</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  /**
   * Format business type for display
   */
  formatBusinessType(businessType: string): string {
    const typeMap: Record<string, string> = {
      restaurant: 'Restaurant',
      retail_store: 'Retail Store',
      medical: 'Medical Practice',
      dental: 'Dental Practice',
      hotel: 'Hotel',
      salon: 'Salon/Spa',
      real_estate: 'Real Estate',
      other: 'Business',
    };

    return typeMap[businessType.toLowerCase()] || businessType;
  },
};
