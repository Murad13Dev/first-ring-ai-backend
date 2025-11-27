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

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    logger.error('Email transporter verification failed:', error);
  } else {
    logger.info('Email transporter is ready');
  }
});

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
      logger.info('Approval confirmation email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Failed to send approval confirmation email:', error);
      throw error;
    }
  },
};
