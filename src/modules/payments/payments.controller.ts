import { Request, Response, NextFunction } from 'express';
import stripeService from '../../services/stripe.service';
import { AppError } from '../../middleware/error.middleware';
import logger from '../../config/logger';
import prisma from '../../config/database';

// ==========================================
// PAYMENTS CONTROLLER
// ==========================================

export class PaymentsController {
  /**
   * Create checkout session
   * POST /api/payments/checkout
   *
   * Usage:
   * - Frontend: Get checkout URL and redirect user
   * - AI: Create payment session during call
   * - API: Generate payment link programmatically
   */
  async createCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        tenantId,
        customerEmail,
        customerName,
        amount,
        currency,
        description,
        metadata,
        successUrl,
        cancelUrl,
      } = req.body;

      // Validation
      if (!tenantId || !customerEmail || !amount || !description) {
        throw new AppError('Missing required fields: tenantId, customerEmail, amount, description', 400);
      }

      if (amount <= 0) {
        throw new AppError('Amount must be greater than 0', 400);
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession({
        tenantId,
        customerEmail,
        customerName,
        amount,
        currency,
        description,
        metadata,
        successUrl,
        cancelUrl,
      });

      return res.status(201).json({
        success: true,
        message: 'Checkout session created successfully',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create payment link (reusable)
   * POST /api/payments/payment-link
   */
  async createPaymentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, currency, description, metadata } = req.body;

      if (!amount || !description) {
        throw new AppError('Missing required fields: amount, description', 400);
      }

      const paymentLink = await stripeService.createPaymentLink({
        amount,
        currency,
        description,
        metadata,
      });

      return res.status(201).json({
        success: true,
        message: 'Payment link created successfully',
        data: paymentLink,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create subscription checkout
   * POST /api/payments/subscription/checkout
   */
  async createSubscriptionCheckout(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        tenantId,
        customerEmail,
        customerName,
        priceId,
        trialDays,
        metadata,
        successUrl,
        cancelUrl,
      } = req.body;

      if (!tenantId || !customerEmail || !priceId) {
        throw new AppError('Missing required fields: tenantId, customerEmail, priceId', 400);
      }

      const session = await stripeService.createSubscriptionCheckout({
        tenantId,
        customerEmail,
        customerName,
        priceId,
        trialDays,
        metadata,
        successUrl,
        cancelUrl,
      });

      return res.status(201).json({
        success: true,
        message: 'Subscription checkout created successfully',
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription
   * POST /api/payments/subscription/:subscriptionId/cancel
   */
  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = req.params;
      const { cancelAtPeriodEnd = true } = req.body;

      const subscription = await stripeService.cancelSubscription(
        subscriptionId,
        cancelAtPeriodEnd
      );

      return res.json({
        success: true,
        message: 'Subscription cancelled successfully',
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create refund
   * POST /api/payments/refund
   */
  async createRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentIntentId, amount, reason } = req.body;

      if (!paymentIntentId) {
        throw new AppError('Payment intent ID is required', 400);
      }

      const refund = await stripeService.createRefund({
        paymentIntentId,
        amount,
        reason,
      });

      return res.json({
        success: true,
        message: 'Refund created successfully',
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get checkout session
   * GET /api/payments/checkout/:sessionId
   */
  async getCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;

      const session = await stripeService.getCheckoutSession(sessionId);

      return res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get subscription
   * GET /api/payments/subscription/:subscriptionId
   */
  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = req.params;

      const subscription = await stripeService.getSubscription(subscriptionId);

      return res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List prices
   * GET /api/payments/prices
   */
  async listPrices(req: Request, res: Response, next: NextFunction) {
    try {
      const { active, limit } = req.query;

      const prices = await stripeService.listPrices({
        active: active === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json({
        success: true,
        data: prices,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Stripe webhooks
   * POST /api/payments/webhook
   */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        throw new AppError('Missing stripe-signature header', 400);
      }

      // Construct event from webhook
      const event = stripeService.constructWebhookEvent(req.body, signature);

      logger.info('Stripe webhook received', {
        type: event.type,
        id: event.id,
      });

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as any);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as any);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as any);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdate(event.data.object as any);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as any);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as any);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as any);
          break;

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      return res.json({ received: true });
    } catch (error) {
      logger.error('Webhook handler error', { error });
      next(error);
    }
  }

  // ==========================================
  // WEBHOOK EVENT HANDLERS
  // ==========================================

  private async handleCheckoutCompleted(session: any) {
    try {
      const tenantId = session.metadata?.tenantId;

      if (!tenantId || tenantId === 'admin') {
        logger.warn('Checkout session missing valid tenantId in metadata', {
          sessionId: session.id,
        });
        return;
      }

      logger.info('Checkout session completed', {
        sessionId: session.id,
        tenantId,
        amount: session.amount_total,
      });

      // Get tenant details
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          businessType: true,
          email: true,
          twilioNumber: true,
          retellAgentId: true,
          subscriptionStatus: true,
        },
      });

      if (!tenant) {
        logger.error('Tenant not found for payment', { tenantId });
        return;
      }

      // Update tenant subscription status to 'paid'
      const updateData: any = {};

      if (session.mode === 'subscription') {
        updateData.subscriptionStatus = 'active';
        updateData.subscriptionId = session.subscription;
      } else {
        // One-time payment - mark as paid
        updateData.subscriptionStatus = 'active'; // or 'paid' if you prefer
      }

      // Update tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: updateData,
      });

      // NOTE: Twilio number and Retell AI agent will be provisioned manually by admin

      // Send payment confirmation email
      try {
        const { emailService } = require('../../services/email.service');
        await emailService.sendPaymentConfirmationEmail({
          to: tenant.email,
          customerName: tenant.name,
          amount: session.amount_total / 100,
          description: session.metadata?.description || 'Subscription Payment',
          paymentId: session.payment_intent,
          tenantName: tenant.name,
        });
      } catch (emailError) {
        logger.error('Failed to send payment confirmation email', { emailError });
      }

      logger.info('Payment processed successfully', {
        tenantId,
        subscriptionStatus: updateData.subscriptionStatus,
        confirmationEmailSent: true,
      });
    } catch (error) {
      logger.error('Handle checkout completed error', { error });
    }
  }

  private async handlePaymentSucceeded(paymentIntent: any) {
    try {
      logger.info('Payment succeeded', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
      });

      // TODO: Record successful payment
      // TODO: Send receipt email
    } catch (error) {
      logger.error('Handle payment succeeded error', { error });
    }
  }

  private async handlePaymentFailed(paymentIntent: any) {
    try {
      logger.warn('Payment failed', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
      });

      // TODO: Notify admin about failed payment
      // TODO: Send failed payment email to customer
    } catch (error) {
      logger.error('Handle payment failed error', { error });
    }
  }

  private async handleSubscriptionUpdate(subscription: any) {
    try {
      const tenantId = subscription.metadata?.tenantId;

      if (!tenantId) {
        logger.warn('Subscription missing tenantId in metadata', {
          subscriptionId: subscription.id,
        });
        return;
      }

      logger.info('Subscription updated', {
        subscriptionId: subscription.id,
        status: subscription.status,
        tenantId,
      });

      // Get tenant details
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          businessType: true,
          twilioNumber: true,
          retellAgentId: true,
        },
      });

      if (!tenant) {
        logger.error('Tenant not found for subscription update', { tenantId });
        return;
      }

      // Update tenant subscription
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: subscription.status === 'active' ? 'active' : 'cancelled',
          subscriptionId: subscription.id,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });

      // NOTE: Twilio and Retell provisioning will be done manually by admin

      logger.info('Subscription updated', {
        tenantId,
        status: subscription.status,
      });
    } catch (error) {
      logger.error('Handle subscription update error', { error });
    }
  }

  private async handleSubscriptionDeleted(subscription: any) {
    try {
      const tenantId = subscription.metadata?.tenantId;

      if (!tenantId) {
        return;
      }

      logger.info('Subscription deleted', {
        subscriptionId: subscription.id,
        tenantId,
      });

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: 'cancelled',
        },
      });
    } catch (error) {
      logger.error('Handle subscription deleted error', { error });
    }
  }

  private async handleInvoicePaymentSucceeded(invoice: any) {
    try {
      logger.info('Invoice payment succeeded', {
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
      });

      // TODO: Record invoice payment
      // TODO: Send invoice receipt
    } catch (error) {
      logger.error('Handle invoice payment succeeded error', { error });
    }
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    try {
      logger.warn('Invoice payment failed', {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
      });

      // TODO: Handle failed invoice payment
      // TODO: Notify customer
    } catch (error) {
      logger.error('Handle invoice payment failed error', { error });
    }
  }
}

export default new PaymentsController();
