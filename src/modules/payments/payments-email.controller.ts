import { Request, Response, NextFunction } from 'express';
import stripeService from '../../services/stripe.service';
import { emailService } from '../../services/email.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../config/logger';
import prisma from '../../config/database';

// ==========================================
// PAYMENT EMAIL CONTROLLER
// ==========================================
// Send payment links via email to customers

export class PaymentEmailController {
  /**
   * Send payment link via email
   * POST /api/payments/send-link
   *
   * Admin panel-dən istifadə üçün:
   * - Müştəriyə payment link yaradıb email göndərir
   * - Checkout session yaradır
   * - Email göndərir
   */
  async sendPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        tenantId,
        customerEmail,
        customerName,
        amount, // in cents (5000 = $50.00)
        description,
        tenantName,
        dueDate,
        metadata,
      } = req.body;

      // Validation
      if (!customerEmail || !customerName || !amount || !description) {
        throw new AppError(
          'Missing required fields: customerEmail, customerName, amount, description',
          400
        );
      }

      if (amount <= 0) {
        throw new AppError('Amount must be greater than 0', 400);
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        throw new AppError('Invalid email address', 400);
      }

      // Get tenant info if tenantId provided
      let tenant = null;
      if (tenantId) {
        tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { name: true, email: true },
        });
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession({
        tenantId: tenantId || 'admin',
        customerEmail,
        customerName,
        amount,
        currency: 'usd',
        description,
        metadata: {
          sentViaEmail: 'true',
          sentAt: new Date().toISOString(),
          ...metadata,
        },
      });

      // Send email with payment link
      await emailService.sendPaymentLinkEmail({
        to: customerEmail,
        customerName,
        amount: amount / 100, // Convert cents to dollars
        description,
        paymentUrl: session.checkoutUrl!,
        tenantName: tenantName || tenant?.name,
        dueDate,
      });

      logger.info('Payment link sent via email', {
        customerEmail,
        amount,
        sessionId: session.sessionId,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment link sent successfully via email',
        data: {
          sessionId: session.sessionId,
          checkoutUrl: session.checkoutUrl,
          sentTo: customerEmail,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send payment link to multiple customers
   * POST /api/payments/send-link-bulk
   *
   * Toplu email göndərmək üçün
   */
  async sendPaymentLinkBulk(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipients, amount, description, tenantId, tenantName, dueDate } = req.body;

      // Validation
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new AppError('Recipients array is required', 400);
      }

      if (!amount || !description) {
        throw new AppError('Amount and description are required', 400);
      }

      if (recipients.length > 100) {
        throw new AppError('Maximum 100 recipients allowed per request', 400);
      }

      const results = [];
      const errors = [];

      // Send to each recipient
      for (const recipient of recipients) {
        try {
          const { email, name } = recipient;

          if (!email || !name) {
            errors.push({ email, error: 'Missing email or name' });
            continue;
          }

          // Create checkout session
          const session = await stripeService.createCheckoutSession({
            tenantId: tenantId || 'admin',
            customerEmail: email,
            customerName: name,
            amount,
            currency: 'usd',
            description,
            metadata: {
              sentViaEmail: 'true',
              bulkSend: 'true',
              sentAt: new Date().toISOString(),
            },
          });

          // Send email
          await emailService.sendPaymentLinkEmail({
            to: email,
            customerName: name,
            amount: amount / 100,
            description,
            paymentUrl: session.checkoutUrl!,
            tenantName,
            dueDate,
          });

          results.push({
            email,
            sessionId: session.sessionId,
            status: 'sent',
          });

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          errors.push({
            email: recipient.email,
            error: error.message,
          });
        }
      }

      logger.info('Bulk payment links sent', {
        total: recipients.length,
        successful: results.length,
        failed: errors.length,
      });

      return res.status(200).json({
        success: true,
        message: `Payment links sent to ${results.length} out of ${recipients.length} recipients`,
        data: {
          successful: results,
          failed: errors,
          summary: {
            total: recipients.length,
            sent: results.length,
            failed: errors.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create and get payment link (without sending email)
   * POST /api/payments/create-link
   *
   * Link yaradır amma email göndərmir
   * Admin özü link-i kopyalayıb göndərə bilər
   */
  async createPaymentLinkOnly(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        tenantId,
        customerEmail,
        customerName,
        amount,
        description,
        metadata,
      } = req.body;

      // Validation
      if (!customerEmail || !amount || !description) {
        throw new AppError(
          'Missing required fields: customerEmail, amount, description',
          400
        );
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession({
        tenantId: tenantId || 'admin',
        customerEmail,
        customerName: customerName || 'Customer',
        amount,
        currency: 'usd',
        description,
        metadata,
      });

      logger.info('Payment link created (not sent)', {
        customerEmail,
        amount,
        sessionId: session.sessionId,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment link created successfully',
        data: {
          sessionId: session.sessionId,
          checkoutUrl: session.checkoutUrl,
          copyLink: session.checkoutUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend payment link
   * POST /api/payments/resend-link/:sessionId
   *
   * Mövcud session üçün yenidən email göndərir
   */
  async resendPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { customerEmail, customerName, description, tenantName, dueDate } = req.body;

      if (!customerEmail || !customerName) {
        throw new AppError('Customer email and name are required', 400);
      }

      // Get session details
      const session = await stripeService.getCheckoutSession(sessionId);

      if (!session.url) {
        throw new AppError('Payment session has expired or is invalid', 400);
      }

      // Send email
      await emailService.sendPaymentLinkEmail({
        to: customerEmail,
        customerName,
        amount: (session.amount_total || 0) / 100,
        description: description || 'Payment',
        paymentUrl: session.url,
        tenantName,
        dueDate,
      });

      logger.info('Payment link resent', {
        sessionId,
        customerEmail,
      });

      return res.status(200).json({
        success: true,
        message: 'Payment link resent successfully',
        data: {
          sessionId,
          sentTo: customerEmail,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new PaymentEmailController();
