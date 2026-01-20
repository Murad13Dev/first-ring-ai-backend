import Stripe from 'stripe';
import logger from '../config/logger';
import { AppError } from '../middleware/error.middleware';

// ==========================================
// STRIPE SERVICE
// ==========================================
// Handles all Stripe payment operations:
// - Create checkout sessions
// - Create payment links
// - Handle subscriptions
// - Process refunds
// - Webhook handling
// ==========================================

class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
    });

    logger.info('Stripe service initialized');
  }

  // ==========================================
  // CHECKOUT SESSIONS
  // ==========================================

  /**
   * Create a checkout session for one-time payment
   * This can be used by:
   * - Frontend (redirect user to checkout)
   * - AI (generate payment link)
   * - Email (send payment link to customer)
   */
  async createCheckoutSession(params: {
    tenantId: string;
    customerEmail: string;
    customerName?: string;
    amount: number; // in cents (e.g., 5000 = $50.00)
    currency?: string;
    description: string;
    metadata?: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    try {
      const {
        tenantId,
        customerEmail,
        customerName,
        amount,
        currency = 'usd',
        description,
        metadata = {},
        successUrl,
        cancelUrl,
      } = params;

      // Create or get customer
      const customer = await this.findOrCreateCustomer(customerEmail, customerName);

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: description,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl || `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          tenantId,
          ...metadata,
        },
        customer_email: customerEmail,
      });

      logger.info('Checkout session created', {
        sessionId: session.id,
        tenantId,
        amount,
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        customer: customer.id,
      };
    } catch (error) {
      logger.error('Create checkout session error', { error });
      throw new AppError('Failed to create payment session', 500);
    }
  }

  /**
   * Create a payment link (reusable link for multiple customers)
   */
  async createPaymentLink(params: {
    amount: number;
    currency?: string;
    description: string;
    metadata?: Record<string, string>;
  }) {
    try {
      const { amount, currency = 'usd', description, metadata = {} } = params;

      // Create a price
      const price = await this.stripe.prices.create({
        currency,
        unit_amount: amount,
        product_data: {
          name: description,
        },
      });

      // Create payment link
      const paymentLink = await this.stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        metadata,
      });

      logger.info('Payment link created', {
        paymentLinkId: paymentLink.id,
        amount,
      });

      return {
        paymentLinkId: paymentLink.id,
        url: paymentLink.url,
      };
    } catch (error) {
      logger.error('Create payment link error', { error });
      throw new AppError('Failed to create payment link', 500);
    }
  }

  // ==========================================
  // SUBSCRIPTIONS
  // ==========================================

  /**
   * Create subscription checkout session
   */
  async createSubscriptionCheckout(params: {
    tenantId: string;
    customerEmail: string;
    customerName?: string;
    priceId: string; // Stripe price ID for the plan
    trialDays?: number;
    setupFeeAmount?: number; // Setup fee in cents (e.g., 100 = $1.00)
    metadata?: Record<string, string>;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    try {
      const {
        tenantId,
        customerEmail,
        customerName,
        priceId,
        trialDays,
        setupFeeAmount,
        metadata = {},
        successUrl,
        cancelUrl,
      } = params;

      // Create or get customer
      const customer = await this.findOrCreateCustomer(customerEmail, customerName);

      // Build line items
      const lineItems: any[] = [
        {
          price: priceId,
          quantity: 1,
        },
      ];

      // Add setup fee as one-time line item
      if (setupFeeAmount && setupFeeAmount > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Setup Fee',
              description: 'One-time account setup fee',
            },
            unit_amount: setupFeeAmount,
          },
          quantity: 1,
        });
      }

      // Build checkout session config
      const sessionConfig: any = {
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'subscription',
        success_url: successUrl || `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/subscription/cancel`,
        subscription_data: {
          metadata: {
            tenantId,
            ...metadata,
          },
        },
        metadata: {
          tenantId,
          setupFeeAmount: setupFeeAmount ? setupFeeAmount.toString() : '0',
          ...metadata,
        },
      };

      // Only add trial_period_days if it's greater than 0
      // Stripe requires minimum 1 day, doesn't accept 0
      if (trialDays && trialDays > 0) {
        sessionConfig.subscription_data.trial_period_days = trialDays;
      }

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create(sessionConfig);

      logger.info('Subscription checkout created', {
        sessionId: session.id,
        tenantId,
        priceId,
        setupFeeAmount,
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url,
        customer: customer.id,
      };
    } catch (error) {
      logger.error('Create subscription checkout error', { error });
      throw new AppError('Failed to create subscription checkout', 500);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });

      logger.info('Subscription cancelled', {
        subscriptionId,
        cancelAtPeriodEnd,
      });

      return subscription;
    } catch (error) {
      logger.error('Cancel subscription error', { error });
      throw new AppError('Failed to cancel subscription', 500);
    }
  }

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================

  /**
   * Find or create Stripe customer
   */
  private async findOrCreateCustomer(email: string, name?: string) {
    try {
      // Search for existing customer
      const customers = await this.stripe.customers.list({
        email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        return customers.data[0];
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email,
        name,
      });

      logger.info('Stripe customer created', {
        customerId: customer.id,
        email,
      });

      return customer;
    } catch (error) {
      logger.error('Find or create customer error', { error });
      throw error;
    }
  }

  // ==========================================
  // REFUNDS
  // ==========================================

  /**
   * Create a refund
   */
  async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // Optional: partial refund amount in cents
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }) {
    try {
      const { paymentIntentId, amount, reason } = params;

      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
        reason,
      });

      logger.info('Refund created', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount,
      });

      return refund;
    } catch (error) {
      logger.error('Create refund error', { error });
      throw new AppError('Failed to create refund', 500);
    }
  }

  // ==========================================
  // RETRIEVAL METHODS
  // ==========================================

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId: string) {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error) {
      logger.error('Get checkout session error', { error });
      throw new AppError('Failed to retrieve checkout session', 500);
    }
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      logger.error('Get payment intent error', { error });
      throw new AppError('Failed to retrieve payment intent', 500);
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Get subscription error', { error });
      throw new AppError('Failed to retrieve subscription', 500);
    }
  }

  // ==========================================
  // WEBHOOK VERIFICATION
  // ==========================================

  /**
   * Construct and verify webhook event
   */
  constructWebhookEvent(payload: string | Buffer, signature: string) {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );

      return event;
    } catch (error) {
      logger.error('Webhook verification failed', { error });
      throw new AppError('Webhook verification failed', 400);
    }
  }

  // ==========================================
  // PRICES (for subscriptions)
  // ==========================================

  /**
   * Create a subscription price
   */
  async createSubscriptionPrice(params: {
    productName: string;
    amount: number; // in cents
    currency?: string;
    interval: 'month' | 'year';
    intervalCount?: number;
  }) {
    try {
      const { productName, amount, currency = 'usd', interval, intervalCount = 1 } = params;

      // Create product
      const product = await this.stripe.products.create({
        name: productName,
      });

      // Create price
      const price = await this.stripe.prices.create({
        product: product.id,
        currency,
        unit_amount: amount,
        recurring: {
          interval,
          interval_count: intervalCount,
        },
      });

      logger.info('Subscription price created', {
        priceId: price.id,
        productId: product.id,
        amount,
      });

      return {
        priceId: price.id,
        productId: product.id,
      };
    } catch (error) {
      logger.error('Create subscription price error', { error });
      throw new AppError('Failed to create subscription price', 500);
    }
  }

  /**
   * List all active prices
   */
  async listPrices(params?: { active?: boolean; limit?: number }) {
    try {
      const prices = await this.stripe.prices.list({
        active: params?.active ?? true,
        limit: params?.limit ?? 100,
      });

      return prices.data;
    } catch (error) {
      logger.error('List prices error', { error });
      throw new AppError('Failed to list prices', 500);
    }
  }

  /**
   * Create price for existing product
   */
  async createPriceForProduct(params: {
    productId: string;
    amount: number; // in cents
    currency?: string;
    interval: 'month' | 'year';
    intervalCount?: number;
  }) {
    try {
      const { productId, amount, currency = 'usd', interval, intervalCount = 1 } = params;

      // Create price for existing product
      const price = await this.stripe.prices.create({
        product: productId,
        currency,
        unit_amount: amount,
        recurring: {
          interval,
          interval_count: intervalCount,
        },
      });

      logger.info('Price created for existing product', {
        priceId: price.id,
        productId,
        amount,
      });

      return {
        priceId: price.id,
        productId,
      };
    } catch (error) {
      logger.error('Create price for product error', { error });
      throw new AppError('Failed to create price for product', 500);
    }
  }
}

export default new StripeService();
