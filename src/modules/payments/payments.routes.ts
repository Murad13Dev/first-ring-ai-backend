import { Router } from 'express';
import paymentsController from './payments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import express from 'express';

const router = Router();

// ==========================================
// PAYMENT ROUTES
// ==========================================

/**
 * Create checkout session
 * POST /api/payments/checkout
 *
 * Body:
 * {
 *   "tenantId": "uuid",
 *   "customerEmail": "customer@example.com",
 *   "customerName": "John Doe",
 *   "amount": 5000,  // $50.00 in cents
 *   "currency": "usd",
 *   "description": "Service payment",
 *   "metadata": { "orderId": "123" },
 *   "successUrl": "https://mysite.com/success",
 *   "cancelUrl": "https://mysite.com/cancel"
 * }
 */
router.post('/checkout', paymentsController.createCheckout);

/**
 * Create payment link (reusable)
 * POST /api/payments/payment-link
 *
 * Body:
 * {
 *   "amount": 5000,
 *   "currency": "usd",
 *   "description": "Product/Service",
 *   "metadata": {}
 * }
 */
router.post('/payment-link', paymentsController.createPaymentLink);

/**
 * Create subscription checkout
 * POST /api/payments/subscription/checkout
 *
 * Body:
 * {
 *   "tenantId": "uuid",
 *   "customerEmail": "customer@example.com",
 *   "customerName": "John Doe",
 *   "priceId": "price_xxxxx",  // Stripe price ID
 *   "trialDays": 14,
 *   "metadata": {}
 * }
 */
router.post('/subscription/checkout', paymentsController.createSubscriptionCheckout);

/**
 * Cancel subscription
 * POST /api/payments/subscription/:subscriptionId/cancel
 *
 * Body (optional):
 * {
 *   "cancelAtPeriodEnd": true
 * }
 */
router.post('/subscription/:subscriptionId/cancel', paymentsController.cancelSubscription);

/**
 * Get subscription details
 * GET /api/payments/subscription/:subscriptionId
 */
router.get('/subscription/:subscriptionId', paymentsController.getSubscription);

/**
 * Create refund
 * POST /api/payments/refund
 *
 * Body:
 * {
 *   "paymentIntentId": "pi_xxxxx",
 *   "amount": 1000,  // Optional: partial refund
 *   "reason": "requested_by_customer"
 * }
 */
router.post('/refund', paymentsController.createRefund);

/**
 * Get checkout session details
 * GET /api/payments/checkout/:sessionId
 */
router.get('/checkout/:sessionId', paymentsController.getCheckoutSession);

/**
 * List available prices
 * GET /api/payments/prices
 */
router.get('/prices', paymentsController.listPrices);

/**
 * Stripe webhook endpoint
 * POST /api/payments/webhook
 *
 * IMPORTANT: This endpoint must use raw body for signature verification
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.handleWebhook
);

export default router;
