import nodemailer from 'nodemailer';
import logger from '../config/logger';

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verify transporter configuration on startup
(async () => {
  try {
    await transporter.verify();
    logger.info('✅ Email transporter is ready and connected', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
    });
  } catch (error) {
    logger.error('❌ Email transporter verification failed', {
      error: error instanceof Error ? error.message : String(error),
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      suggestion: 'Please check SMTP credentials and server availability',
    });
  }
})();

export const emailService = {
  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, name: string, token: string) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: 'Email Verification - First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>First Ring AI</h1>
              </div>
              <div class="content">
                <h2>Hello ${name},</h2>
                <p>Welcome to First Ring AI platform!</p>
                <p>Please click the button below to verify your email address:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
                <p><strong>Note:</strong> This link is valid for 24 hours.</p>
                <p>If you didn't create this account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. All rights reserved.</p>
                <p>Never miss a call again!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello ${name},

          Welcome to First Ring AI platform!

          Please verify your email address by visiting this link:
          ${verificationUrl}

          This link is valid for 24 hours.

          If you didn't create this account, please ignore this email.

          First Ring AI - Never miss a call again!
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Verification email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  },

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(to: string, name: string) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: 'Welcome to First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .feature { padding: 15px 0; border-bottom: 1px solid #ddd; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Account Activated!</h1>
              </div>
              <div class="content">
                <h2>Congratulations, ${name}!</h2>
                <p>Your email has been successfully verified. Your account is pending admin approval.</p>

                <h3>Next Steps:</h3>
                <div class="feature">
                  <strong>1. Wait for Admin Approval</strong>
                  <p>Our team will review your account and approve it shortly.</p>
                </div>
                <div class="feature">
                  <strong>2. You'll Receive Confirmation</strong>
                  <p>Once approved, you'll receive an email with login instructions.</p>
                </div>
                <div class="feature">
                  <strong>3. Access Your Dashboard</strong>
                  <p>Start configuring your AI agent for your business.</p>
                </div>
                <div class="feature">
                  <strong>4. Connect Your Phone</strong>
                  <p>Integrate with Twilio or Retell AI for automated call handling.</p>
                </div>

                <p>If you have any questions, contact us at: <a href="mailto:${process.env.SALES_EMAIL}">${process.env.SALES_EMAIL}</a></p>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. All rights reserved.</p>
                <p>Never miss a call again!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Congratulations, ${name}!

          Your email has been successfully verified. Your account is pending admin approval.

          Next steps:
          1. Wait for admin approval
          2. You'll receive a confirmation email
          3. Access your dashboard
          4. Connect your phone number

          If you have any questions, contact us at: ${process.env.SALES_EMAIL}

          First Ring AI - Never miss a call again!
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Welcome email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      throw error;
    }
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, name: string, token: string) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: 'Password Reset - First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #DC2626;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset</h1>
              </div>
              <div class="content">
                <h2>Hello ${name},</h2>
                <p>We received a password reset request for your account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #DC2626;">${resetUrl}</p>

                <div class="warning">
                  <strong>⚠ Security Warning:</strong>
                  <p>This link is only valid for 1 hour.</p>
                  <p>If you didn't request this, please secure your account immediately.</p>
                </div>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Hello ${name},

          We received a password reset request for your account.

          Reset your password by visiting this link:
          ${resetUrl}

          This link is only valid for 1 hour.

          If you didn't request this, please secure your account immediately.

          First Ring AI
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Password reset email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  },

  /**
   * Send account approval confirmation email
   */
  async sendApprovalConfirmationEmail(to: string, name: string) {
    try {
      const loginUrl = `${process.env.FRONTEND_URL}/login`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: 'Account Approved - First Ring AI',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 12px 30px;
                background-color: #10B981;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .feature { padding: 15px 0; border-bottom: 1px solid #ddd; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .success-badge { background-color: #D1FAE5; color: #065F46; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✓ Account Approved!</h1>
              </div>
              <div class="content">
                <h2>Congratulations, ${name}!</h2>
                <div class="success-badge">
                  <strong>✓ Approved by Admin</strong>
                </div>
                <p>Your account has been successfully approved by our admin team. You can now log in and access all features of First Ring AI platform.</p>

                <h3>Next Steps:</h3>
                <div class="feature">
                  <strong>1. Log In to the Platform</strong>
                  <p>Use your email and password to access your dashboard.</p>
                </div>
                <div class="feature">
                  <strong>2. Configure Your Business</strong>
                  <p>Enter your business information and set up your AI agent.</p>
                </div>
                <div class="feature">
                  <strong>3. Customize AI Agent</strong>
                  <p>Configure agent behavior according to your business type.</p>
                </div>
                <div class="feature">
                  <strong>4. Add Phone Number</strong>
                  <p>Activate automated call answering system for your customers.</p>
                </div>

                <div style="text-align: center;">
                  <a href="${loginUrl}" class="button">Log In Now</a>
                </div>

                <p style="margin-top: 30px;">If you have any questions or need assistance, please contact us:</p>
                <p><strong>Email:</strong> <a href="mailto:${process.env.SALES_EMAIL}">${process.env.SALES_EMAIL}</a></p>

                <p style="margin-top: 20px; font-size: 14px; color: #666;">
                  Thank you for joining us! We're here to help you automate your business processes and improve customer service.
                </p>
              </div>
              <div class="footer">
                <p>&copy; 2025 First Ring AI. All rights reserved.</p>
                <p>Never miss a call again!</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Congratulations, ${name}!

          Your account has been successfully approved by our admin team!

          You can now log in and access all features of First Ring AI platform.

          Next steps:
          1. Log in to the platform
          2. Configure your business
          3. Customize AI Agent
          4. Add phone number

          Log in here: ${loginUrl}

          If you have any questions, contact us at: ${process.env.SALES_EMAIL}

          First Ring AI - Never miss a call again!
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('✅ Approval confirmation email sent successfully', {
        to,
        name,
        messageId: info.messageId,
        response: info.response,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('❌ Failed to send approval confirmation email', {
        error: error instanceof Error ? error.message : String(error),
        to,
        name,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Send payment link email
   */
  async sendPaymentLinkEmail(params: {
    to: string;
    customerName: string;
    amount: number; // in dollars (e.g., 50.00)
    description: string;
    paymentUrl: string;
    tenantName?: string;
    dueDate?: string;
  }) {
    try {
      const { to, customerName, amount, description, paymentUrl, tenantName, dueDate } = params;

      const formattedAmount = `$${amount.toFixed(2)}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: `Payment Request - ${formattedAmount}${tenantName ? ` from ${tenantName}` : ''}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { padding: 30px; background-color: white; border-radius: 0 0 10px 10px; }
              .amount-box {
                background-color: #f0f4ff;
                border-left: 4px solid #667eea;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
              }
              .amount-box .amount {
                font-size: 32px;
                font-weight: bold;
                color: #667eea;
                margin: 10px 0;
              }
              .button {
                display: inline-block;
                padding: 15px 40px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                border-radius: 30px;
                font-weight: bold;
                margin: 20px 0;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
              }
              .button:hover {
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
              }
              .details-table {
                width: 100%;
                margin: 20px 0;
                border-collapse: collapse;
              }
              .details-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
              }
              .details-table td:first-child {
                font-weight: bold;
                width: 40%;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
              .security-note {
                background-color: #fff3cd;
                border-left: 4px solid #ffa726;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💳 Payment Request</h1>
                <p style="margin: 0;">You have a payment waiting</p>
              </div>

              <div class="content">
                <p>Hello ${customerName},</p>

                ${tenantName ? `<p>You have received a payment request from <strong>${tenantName}</strong>.</p>` : ''}

                <div class="amount-box">
                  <div style="font-size: 14px; color: #666;">Amount Due</div>
                  <div class="amount">${formattedAmount}</div>
                  <div style="font-size: 14px; color: #666;">${description}</div>
                </div>

                <table class="details-table">
                  <tr>
                    <td>Description:</td>
                    <td>${description}</td>
                  </tr>
                  <tr>
                    <td>Amount:</td>
                    <td><strong>${formattedAmount}</strong></td>
                  </tr>
                  ${dueDate ? `
                  <tr>
                    <td>Due Date:</td>
                    <td>${dueDate}</td>
                  </tr>
                  ` : ''}
                  ${tenantName ? `
                  <tr>
                    <td>From:</td>
                    <td>${tenantName}</td>
                  </tr>
                  ` : ''}
                </table>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${paymentUrl}" class="button">
                    🔒 Pay Securely with Stripe
                  </a>
                </div>

                <div class="security-note">
                  <strong>🔐 Secure Payment</strong><br>
                  Your payment is processed securely through Stripe. We never store your credit card information.
                </div>

                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>Payment Methods Accepted:</strong><br>
                  💳 Credit Card • 💳 Debit Card • 🏦 Bank Transfer
                </p>

                ${tenantName ? `
                <p style="margin-top: 30px;">
                  If you have any questions about this payment, please contact ${tenantName} directly.
                </p>
                ` : ''}

                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  <strong>Note:</strong> This is an automated email. Please do not reply to this message.
                </p>
              </div>

              <div class="footer">
                <p>Powered by First Ring AI | Secure payments by Stripe</p>
                <p>© ${new Date().getFullYear()} First Ring AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Payment Request

          Hello ${customerName},

          ${tenantName ? `You have received a payment request from ${tenantName}.` : ''}

          Amount Due: ${formattedAmount}
          Description: ${description}
          ${dueDate ? `Due Date: ${dueDate}` : ''}

          To complete your payment securely, please visit:
          ${paymentUrl}

          Your payment is processed securely through Stripe. We never store your credit card information.

          Payment Methods Accepted:
          - Credit Card
          - Debit Card
          - Bank Transfer

          ${tenantName ? `If you have any questions about this payment, please contact ${tenantName} directly.` : ''}

          Powered by First Ring AI | Secure payments by Stripe
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Payment link email sent:', { to, amount: formattedAmount, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send payment link email:', error);
      throw error;
    }
  },

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(params: {
    to: string;
    customerName: string;
    amount: number;
    description: string;
    paymentId: string;
    tenantName?: string;
  }) {
    try {
      const { to, customerName, amount, description, paymentId, tenantName } = params;

      const formattedAmount = `$${amount.toFixed(2)}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: `Payment Confirmation - ${formattedAmount}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
              .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { padding: 30px; background-color: white; border-radius: 0 0 10px 10px; }
              .success-icon { font-size: 60px; margin-bottom: 20px; }
              .amount { font-size: 36px; font-weight: bold; color: #10b981; margin: 20px 0; }
              .details-table {
                width: 100%;
                margin: 20px 0;
                border-collapse: collapse;
              }
              .details-table td {
                padding: 10px;
                border-bottom: 1px solid #eee;
              }
              .details-table td:first-child {
                font-weight: bold;
                width: 40%;
              }
              .footer {
                text-align: center;
                padding: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">✅</div>
                <h1>Payment Successful!</h1>
              </div>

              <div class="content">
                <p>Hello ${customerName},</p>

                <p>Thank you! Your payment has been successfully processed.</p>

                <div style="text-align: center;">
                  <div class="amount">${formattedAmount}</div>
                </div>

                <table class="details-table">
                  <tr>
                    <td>Payment ID:</td>
                    <td><code>${paymentId}</code></td>
                  </tr>
                  <tr>
                    <td>Description:</td>
                    <td>${description}</td>
                  </tr>
                  <tr>
                    <td>Amount:</td>
                    <td><strong>${formattedAmount}</strong></td>
                  </tr>
                  <tr>
                    <td>Date:</td>
                    <td>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                  ${tenantName ? `
                  <tr>
                    <td>Paid to:</td>
                    <td>${tenantName}</td>
                  </tr>
                  ` : ''}
                </table>

                <p style="margin-top: 30px;">
                  A receipt has been sent to your email address. Please save this for your records.
                </p>

                ${tenantName ? `
                <p>
                  If you have any questions about this payment, please contact ${tenantName}.
                </p>
                ` : ''}

                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                  <strong>Note:</strong> This is an automated confirmation email.
                </p>
              </div>

              <div class="footer">
                <p>Powered by First Ring AI | Secure payments by Stripe</p>
                <p>© ${new Date().getFullYear()} First Ring AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Payment Successful!

          Hello ${customerName},

          Thank you! Your payment has been successfully processed.

          Payment Details:
          - Payment ID: ${paymentId}
          - Description: ${description}
          - Amount: ${formattedAmount}
          - Date: ${new Date().toLocaleDateString()}
          ${tenantName ? `- Paid to: ${tenantName}` : ''}

          A receipt has been sent to your email address. Please save this for your records.

          ${tenantName ? `If you have any questions about this payment, please contact ${tenantName}.` : ''}

          Powered by First Ring AI | Secure payments by Stripe
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Payment confirmation email sent:', { to, amount: formattedAmount, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send payment confirmation email:', error);
      throw error;
    }
  },

  /**
   * Send tenant welcome email with verification link
   */
  async sendTenantWelcomeEmail(to: string, ownerName: string, tenantName: string, verificationToken: string) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/auth/set-password?token=${verificationToken}`;

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@firstringai.com',
        to,
        subject: `Welcome to First Ring AI - ${tenantName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; background-color: #f9f9f9; }
              .button {
                display: inline-block;
                padding: 15px 35px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                margin: 20px 0;
              }
              .button:hover { background-color: #4338CA; }
              .info-box {
                background-color: #EEF2FF;
                border-left: 4px solid #4F46E5;
                padding: 15px;
                margin: 20px 0;
              }
              .feature { padding: 15px 0; border-bottom: 1px solid #ddd; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .success-icon { font-size: 48px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="success-icon">🎉</div>
                <h1>Welcome to First Ring AI!</h1>
                <p style="font-size: 16px; margin: 10px 0;">Your business account has been created</p>
              </div>
              <div class="content">
                <h2>Hello ${ownerName},</h2>
                <p>Great news! Your tenant account for <strong>${tenantName}</strong> has been successfully created on First Ring AI platform.</p>

                <div class="info-box">
                  <strong>🔐 One More Step to Get Started</strong>
                  <p style="margin: 10px 0 0 0;">To activate your account and start using our AI-powered phone automation, please set your password.</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" class="button">Set Your Password</a>
                </div>

                <p style="text-align: center; color: #666; font-size: 14px;">
                  Or copy and paste this link in your browser:<br/>
                  <span style="word-break: break-all; color: #4F46E5;">${verificationUrl}</span>
                </p>

                <p style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0;">
                  <strong>⏰ Important:</strong> This link is valid for <strong>24 hours</strong> only.
                </p>

                <h3 style="margin-top: 30px;">What happens next?</h3>

                <div class="feature">
                  <strong>1. Set Your Password</strong>
                  <p>Click the button above to create your secure password.</p>
                </div>
                <div class="feature">
                  <strong>2. Verify Your Email</strong>
                  <p>Your email will be automatically verified after setting password.</p>
                </div>
                <div class="feature">
                  <strong>3. Start Your 14-Day Free Trial</strong>
                  <p>Get full access to all features - no credit card required!</p>
                </div>
                <div class="feature">
                  <strong>4. Access Your Dashboard</strong>
                  <p>Configure your AI agent and start automating customer calls.</p>
                </div>

                <h3 style="margin-top: 30px;">What you'll get:</h3>
                <ul style="line-height: 2;">
                  <li>✅ AI-powered phone agent for your business</li>
                  <li>✅ 24/7 automated call handling</li>
                  <li>✅ Multi-language support</li>
                  <li>✅ Booking & order management</li>
                  <li>✅ Real-time analytics & insights</li>
                  <li>✅ Seamless integrations (Twilio, Square, Google)</li>
                </ul>

                <p style="margin-top: 30px;">
                  Need help? Our support team is here for you at:
                  <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@firstringai.com'}">${process.env.SUPPORT_EMAIL || 'support@firstringai.com'}</a>
                </p>

                <p style="margin-top: 20px; color: #666; font-size: 13px;">
                  If you didn't create this account, please ignore this email or contact us if you have concerns.
                </p>
              </div>
              <div class="footer">
                <p><strong>First Ring AI</strong></p>
                <p>Never miss a call again!</p>
                <p>&copy; 2025 First Ring AI. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          Welcome to First Ring AI!

          Hello ${ownerName},

          Great news! Your tenant account for ${tenantName} has been successfully created on First Ring AI platform.

          TO GET STARTED:
          Please set your password by visiting this link:
          ${verificationUrl}

          IMPORTANT: This link is valid for 24 hours only.

          WHAT HAPPENS NEXT:
          1. Set your password
          2. Verify your email (automatic)
          3. Start your 14-day free trial
          4. Access your dashboard

          WHAT YOU'LL GET:
          - AI-powered phone agent for your business
          - 24/7 automated call handling
          - Multi-language support
          - Booking & order management
          - Real-time analytics & insights
          - Seamless integrations (Twilio, Square, Google)

          Need help? Contact us at: ${process.env.SUPPORT_EMAIL || 'support@firstringai.com'}

          If you didn't create this account, please ignore this email.

          First Ring AI - Never miss a call again!
          © 2025 First Ring AI. All rights reserved.
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('✅ Tenant welcome email sent successfully', {
        to,
        tenantName,
        messageId: info.messageId,
        response: info.response,
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('❌ Failed to send tenant welcome email', {
        error: error instanceof Error ? error.message : String(error),
        to,
        tenantName,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
};
