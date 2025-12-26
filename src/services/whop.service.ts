import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import logger from '../config/logger';

/**
 * Whop Integration Service
 * Handles Whop API interactions, webhook verification, and product management
 * Documentation: https://dev.whop.com/api-reference
 */

const WHOP_API_BASE = 'https://api.whop.com/api/v2';

export interface WhopProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: 'one_time' | 'subscription' | 'membership';
  billing_period?: 'monthly' | 'yearly' | 'lifetime';
}

export interface WhopMembership {
  id: string;
  user_id: string;
  product_id: string;
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  email?: string;
  discord_id?: string;
  valid_until?: number; // Unix timestamp
  cancel_at_period_end: boolean;
  metadata?: Record<string, any>;
}

export interface WhopPaymentEvent {
  id: string;
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded';
  data: {
    membership: WhopMembership;
    amount: number;
    currency: string;
    payment_id: string;
  };
}

export interface WhopMembershipEvent {
  id: string;
  type:
    | 'membership.created'
    | 'membership.updated'
    | 'membership.cancelled'
    | 'membership.renewed'
    | 'membership.went_valid'
    | 'membership.went_invalid';
  data: {
    membership: WhopMembership;
  };
}

export type WhopWebhookEvent = WhopPaymentEvent | WhopMembershipEvent;

export class WhopService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: WHOP_API_BASE,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Verify Whop webhook signature
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    try {
      const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      logger.error('Whop webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get all products for a company
   */
  async getProducts(companyId: string): Promise<WhopProduct[]> {
    try {
      const response = await this.client.get(`/companies/${companyId}/products`);
      logger.info('Fetched Whop products successfully', {
        companyId,
        count: response.data.data?.length || 0,
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.error('Failed to fetch Whop products:', {
        error: error.message,
        response: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<WhopProduct | null> {
    try {
      const response = await this.client.get(`/products/${productId}`);
      logger.info('Fetched Whop product successfully', { productId });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch Whop product:', {
        productId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get membership by ID
   */
  async getMembership(membershipId: string): Promise<WhopMembership | null> {
    try {
      const response = await this.client.get(`/memberships/${membershipId}`);
      logger.info('Fetched Whop membership successfully', { membershipId });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch Whop membership:', {
        membershipId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Get all memberships for a user
   */
  async getUserMemberships(userId: string): Promise<WhopMembership[]> {
    try {
      const response = await this.client.get(`/users/${userId}/memberships`);
      logger.info('Fetched user memberships successfully', {
        userId,
        count: response.data.data?.length || 0,
      });
      return response.data.data || [];
    } catch (error: any) {
      logger.error('Failed to fetch user memberships:', {
        userId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Cancel a membership
   */
  async cancelMembership(membershipId: string): Promise<boolean> {
    try {
      await this.client.post(`/memberships/${membershipId}/cancel`);
      logger.info('Whop membership cancelled successfully', { membershipId });
      return true;
    } catch (error: any) {
      logger.error('Failed to cancel Whop membership:', {
        membershipId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Update membership metadata
   */
  async updateMembershipMetadata(
    membershipId: string,
    metadata: Record<string, any>
  ): Promise<boolean> {
    try {
      await this.client.patch(`/memberships/${membershipId}`, { metadata });
      logger.info('Whop membership metadata updated successfully', {
        membershipId,
      });
      return true;
    } catch (error: any) {
      logger.error('Failed to update Whop membership metadata:', {
        membershipId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Validate membership is active
   */
  async isMembershipValid(membershipId: string): Promise<boolean> {
    const membership = await this.getMembership(membershipId);
    if (!membership) return false;

    if (membership.status !== 'active' && membership.status !== 'trialing') {
      return false;
    }

    // Check expiry if valid_until is set
    if (membership.valid_until) {
      const now = Math.floor(Date.now() / 1000);
      if (now > membership.valid_until) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sync products from Whop to local database
   * Returns array of products that should be synced
   */
  async syncProducts(companyId: string): Promise<WhopProduct[]> {
    try {
      const products = await this.getProducts(companyId);
      logger.info('Whop products sync initiated', {
        companyId,
        count: products.length,
      });
      return products;
    } catch (error: any) {
      logger.error('Failed to sync Whop products:', {
        companyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Parse webhook event
   */
  static parseWebhookEvent(payload: any): WhopWebhookEvent {
    return payload as WhopWebhookEvent;
  }

  /**
   * Check if event is payment related
   */
  static isPaymentEvent(event: WhopWebhookEvent): event is WhopPaymentEvent {
    return event.type.startsWith('payment.');
  }

  /**
   * Check if event is membership related
   */
  static isMembershipEvent(
    event: WhopWebhookEvent
  ): event is WhopMembershipEvent {
    return event.type.startsWith('membership.');
  }

  /**
   * Get user info from Whop
   */
  async getUser(userId: string): Promise<{
    id: string;
    email?: string;
    username?: string;
    discord_id?: string;
  } | null> {
    try {
      const response = await this.client.get(`/users/${userId}`);
      logger.info('Fetched Whop user successfully', { userId });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch Whop user:', {
        userId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Create checkout session for a product
   */
  async createCheckoutSession(
    productId: string,
    options?: {
      email?: string;
      discord_id?: string;
      metadata?: Record<string, any>;
      success_url?: string;
      cancel_url?: string;
    }
  ): Promise<{ url: string; checkout_session_id: string } | null> {
    try {
      const response = await this.client.post('/checkout/sessions', {
        product_id: productId,
        ...options,
      });

      logger.info('Whop checkout session created', {
        productId,
        checkoutSessionId: response.data.id,
      });

      return {
        url: response.data.url,
        checkout_session_id: response.data.id,
      };
    } catch (error: any) {
      logger.error('Failed to create Whop checkout session:', {
        productId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/me');
      logger.info('Whop API connection test successful');
      return true;
    } catch (error: any) {
      logger.error('Whop API connection test failed:', {
        error: error.message,
      });
      return false;
    }
  }
}

/**
 * Create Whop service instance with API key
 */
export const createWhopService = (apiKey: string): WhopService => {
  return new WhopService(apiKey);
};
