import { PrismaClient } from '@prisma/client';
import logger from '../config/logger';
import { DiscordService } from './discord.service';
import { WhopService } from './whop.service';

// Temporary workaround for Prisma type exports
type Order = any;
type TenantIntegration = any;
type AccessGrant = any;

const prisma = new PrismaClient();

/**
 * Integration Service
 * Orchestrates Discord and Whop integrations, manages access grants
 */

export class IntegrationService {
  /**
   * Get tenant integration settings
   */
  async getTenantIntegration(
    tenantId: string
  ): Promise<TenantIntegration | null> {
    try {
      return await prisma.tenantIntegration.findUnique({
        where: { tenantId },
      });
    } catch (error) {
      logger.error('Failed to get tenant integration:', error);
      return null;
    }
  }

  /**
   * Create or update tenant integration
   */
  async upsertTenantIntegration(
    tenantId: string,
    data: Partial<TenantIntegration>
  ): Promise<TenantIntegration> {
    return await prisma.tenantIntegration.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
      },
      update: data,
    });
  }

  /**
   * Handle order creation - send Discord notifications
   */
  async handleOrderCreated(order: Order): Promise<void> {
    try {
      const integration = await this.getTenantIntegration(order.tenantId);

      if (!integration || !integration.discordEnabled || !integration.isActive) {
        return;
      }

      // Send new order notification
      if (integration.notifyOnNewOrder && integration.discordWebhookUrl) {
        const discordService = new DiscordService();
        await discordService.notifyNewOrder(
          integration.discordWebhookUrl,
          order
        );
      }
    } catch (error) {
      logger.error('Failed to handle order created event:', error);
    }
  }

  /**
   * Handle payment success - send notification + grant Discord access
   */
  async handlePaymentSuccess(order: Order): Promise<void> {
    try {
      const integration = await this.getTenantIntegration(order.tenantId);

      if (!integration || !integration.isActive) {
        return;
      }

      // Send Discord notification
      if (
        integration.discordEnabled &&
        integration.notifyOnPaymentSuccess &&
        integration.discordWebhookUrl
      ) {
        const discordService = new DiscordService();
        await discordService.notifyPaymentSuccess(
          integration.discordWebhookUrl,
          order
        );
      }

      // Grant Discord access if configured
      await this.grantDiscordAccessForOrder(order, integration);
    } catch (error) {
      logger.error('Failed to handle payment success event:', error);
    }
  }

  /**
   * Handle payment failed - send notification
   */
  async handlePaymentFailed(order: Order): Promise<void> {
    try {
      const integration = await this.getTenantIntegration(order.tenantId);

      if (
        !integration ||
        !integration.discordEnabled ||
        !integration.notifyOnPaymentFailed ||
        !integration.discordWebhookUrl ||
        !integration.isActive
      ) {
        return;
      }

      const discordService = new DiscordService();
      await discordService.notifyPaymentFailed(
        integration.discordWebhookUrl,
        order
      );
    } catch (error) {
      logger.error('Failed to handle payment failed event:', error);
    }
  }

  /**
   * Handle order status change to 'ready'
   */
  async handleOrderReady(order: Order): Promise<void> {
    try {
      const integration = await this.getTenantIntegration(order.tenantId);

      if (
        !integration ||
        !integration.discordEnabled ||
        !integration.notifyOnOrderReady ||
        !integration.discordWebhookUrl ||
        !integration.isActive
      ) {
        return;
      }

      const discordService = new DiscordService();
      await discordService.notifyOrderReady(integration.discordWebhookUrl, order);
    } catch (error) {
      logger.error('Failed to handle order ready event:', error);
    }
  }

  /**
   * Grant Discord access for an order based on product mappings
   */
  private async grantDiscordAccessForOrder(
    order: Order,
    integration: TenantIntegration
  ): Promise<void> {
    try {
      if (
        !integration.discordEnabled ||
        !integration.discordBotToken ||
        !integration.discordGuildId ||
        !integration.productMappings
      ) {
        return;
      }

      const items = Array.isArray(order.items)
        ? order.items
        : JSON.parse(order.items as any);
      const productMappings = integration.productMappings as Record<
        string,
        { discordRoleId?: string; whopProductId?: string }
      >;

      // Check if any order items have Discord role mappings
      for (const item of items) {
        const mapping = productMappings[item.serviceId];

        if (mapping?.discordRoleId) {
          // Create pending access grant
          await prisma.accessGrant.create({
            data: {
              integrationId: integration.id,
              orderId: order.id,
              customerEmail: order.customerEmail || undefined,
              customerPhone: order.customerPhone,
              discordRoleId: mapping.discordRoleId,
              status: 'pending',
              source: 'stripe',
              sourceId: order.squarePaymentId || undefined,
            },
          });

          logger.info('Discord access grant created (pending customer link)', {
            orderId: order.id,
            roleId: mapping.discordRoleId,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to grant Discord access for order:', error);
    }
  }

  /**
   * Link Discord user to access grant and grant role
   */
  async linkDiscordUserToGrant(
    accessGrantId: string,
    discordUserId: string,
    discordUsername?: string
  ): Promise<boolean> {
    try {
      const accessGrant = await prisma.accessGrant.findUnique({
        where: { id: accessGrantId },
        include: {
          integration: true,
        },
      });

      if (!accessGrant || accessGrant.status !== 'pending') {
        logger.error('Access grant not found or not pending', {
          accessGrantId,
        });
        return false;
      }

      const integration = accessGrant.integration;

      if (
        !integration.discordBotToken ||
        !integration.discordGuildId ||
        !accessGrant.discordRoleId
      ) {
        logger.error('Discord integration not properly configured');
        return false;
      }

      // Grant Discord role
      const discordService = new DiscordService(integration.discordBotToken);
      const success = await discordService.grantRole(
        integration.discordGuildId,
        discordUserId,
        accessGrant.discordRoleId
      );

      if (success) {
        // Update access grant
        await prisma.accessGrant.update({
          where: { id: accessGrantId },
          data: {
            discordUserId,
            discordUsername,
            status: 'granted',
            grantedAt: new Date(),
          },
        });

        // Send welcome DM
        await discordService.sendDM(
          discordUserId,
          `🎉 Welcome! Your purchase has been confirmed and you've been granted access. Enjoy your benefits!`
        );

        logger.info('Discord role granted successfully', {
          accessGrantId,
          discordUserId,
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to link Discord user to grant:', error);
      return false;
    }
  }

  /**
   * Revoke Discord access (on refund, expiry, etc.)
   */
  async revokeDiscordAccess(
    accessGrantId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const accessGrant = await prisma.accessGrant.findUnique({
        where: { id: accessGrantId },
        include: {
          integration: true,
        },
      });

      if (!accessGrant || accessGrant.status !== 'granted') {
        logger.error('Access grant not found or not granted', {
          accessGrantId,
        });
        return false;
      }

      const integration = accessGrant.integration;

      if (
        !integration.discordBotToken ||
        !integration.discordGuildId ||
        !accessGrant.discordRoleId ||
        !accessGrant.discordUserId
      ) {
        logger.error('Discord integration not properly configured');
        return false;
      }

      // Revoke Discord role
      const discordService = new DiscordService(integration.discordBotToken);
      const success = await discordService.revokeRole(
        integration.discordGuildId,
        accessGrant.discordUserId,
        accessGrant.discordRoleId
      );

      if (success) {
        // Update access grant
        await prisma.accessGrant.update({
          where: { id: accessGrantId },
          data: {
            status: 'revoked',
            revokedAt: new Date(),
            revokeReason: reason,
          },
        });

        logger.info('Discord role revoked successfully', {
          accessGrantId,
          reason,
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to revoke Discord access:', error);
      return false;
    }
  }

  /**
   * Handle Whop webhook event
   */
  async handleWhopWebhook(
    tenantId: string,
    event: any
  ): Promise<{ success: boolean; orderId?: string }> {
    try {
      const integration = await this.getTenantIntegration(tenantId);

      if (!integration || !integration.whopEnabled || !integration.isActive) {
        return { success: false };
      }

      // Log event
      await prisma.integrationEvent.create({
        data: {
          integrationId: integration.id,
          source: 'whop',
          eventType: event.type,
          eventId: event.id,
          payload: event,
          status: 'pending',
        },
      });

      // Handle different event types
      if (event.type === 'payment.succeeded') {
        return await this.handleWhopPaymentSuccess(integration, event);
      } else if (event.type === 'membership.cancelled') {
        return await this.handleWhopMembershipCancelled(integration, event);
      } else if (event.type === 'membership.went_invalid') {
        return await this.handleWhopMembershipInvalid(integration, event);
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to handle Whop webhook:', error);
      return { success: false };
    }
  }

  /**
   * Handle Whop payment success - create order + grant Discord access
   */
  private async handleWhopPaymentSuccess(
    integration: TenantIntegration,
    event: any
  ): Promise<{ success: boolean; orderId?: string }> {
    try {
      const membership = event.data.membership;
      const amount = event.data.amount / 100; // Convert cents to dollars

      // Create order in database
      const order = await prisma.order.create({
        data: {
          tenantId: integration.tenantId,
          customerEmail: membership.email || 'whop-customer@unknown.com',
          customerPhone: membership.email || 'N/A',
          items: [
            {
              serviceId: membership.product_id,
              name: 'Whop Product Purchase',
              price: amount,
              quantity: 1,
            },
          ],
          subtotal: amount,
          total: amount,
          paymentStatus: 'paid',
          paymentMethod: 'whop',
          status: 'confirmed',
        },
      });

      // Grant Discord access if configured
      if (
        integration.whopAutoGrantAccess &&
        integration.discordEnabled &&
        membership.discord_id
      ) {
        const productMappings = integration.productMappings as Record<
          string,
          { discordRoleId?: string }
        >;
        const mapping = productMappings[membership.product_id];

        if (mapping?.discordRoleId) {
          const accessGrant = await prisma.accessGrant.create({
            data: {
              integrationId: integration.id,
              orderId: order.id,
              customerEmail: membership.email,
              discordUserId: membership.discord_id,
              discordRoleId: mapping.discordRoleId,
              whopMembershipId: membership.id,
              whopProductId: membership.product_id,
              status: 'pending',
              source: 'whop',
              sourceId: event.data.payment_id,
            },
          });

          // Auto-grant role
          await this.linkDiscordUserToGrant(
            accessGrant.id,
            membership.discord_id
          );
        }
      }

      logger.info('Whop payment success handled', {
        orderId: order.id,
        membershipId: membership.id,
      });

      return { success: true, orderId: order.id };
    } catch (error) {
      logger.error('Failed to handle Whop payment success:', error);
      return { success: false };
    }
  }

  /**
   * Handle Whop membership cancelled
   */
  private async handleWhopMembershipCancelled(
    integration: TenantIntegration,
    event: any
  ): Promise<{ success: boolean }> {
    try {
      const membership = event.data.membership;

      // Find access grant
      const accessGrant = await prisma.accessGrant.findFirst({
        where: {
          integrationId: integration.id,
          whopMembershipId: membership.id,
          status: 'granted',
        },
      });

      if (accessGrant) {
        await this.revokeDiscordAccess(
          accessGrant.id,
          'whop_membership_cancelled'
        );
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to handle Whop membership cancelled:', error);
      return { success: false };
    }
  }

  /**
   * Handle Whop membership went invalid (expired)
   */
  private async handleWhopMembershipInvalid(
    integration: TenantIntegration,
    event: any
  ): Promise<{ success: boolean }> {
    try {
      const membership = event.data.membership;

      // Find access grant
      const accessGrant = await prisma.accessGrant.findFirst({
        where: {
          integrationId: integration.id,
          whopMembershipId: membership.id,
          status: 'granted',
        },
      });

      if (accessGrant) {
        await this.revokeDiscordAccess(accessGrant.id, 'whop_membership_expired');
      }

      return { success: true };
    } catch (error) {
      logger.error('Failed to handle Whop membership invalid:', error);
      return { success: false };
    }
  }

  /**
   * Sync Whop products to database
   */
  async syncWhopProducts(tenantId: string): Promise<number> {
    try {
      const integration = await this.getTenantIntegration(tenantId);

      if (
        !integration ||
        !integration.whopEnabled ||
        !integration.whopApiKey ||
        !integration.whopCompanyId
      ) {
        throw new Error('Whop integration not configured');
      }

      const whopService = new WhopService(integration.whopApiKey);
      const products = await whopService.syncProducts(integration.whopCompanyId);

      // Upsert products to database
      for (const product of products) {
        await prisma.whopProduct.upsert({
          where: { whopProductId: product.id },
          create: {
            tenantId,
            whopProductId: product.id,
            whopCompanyId: integration.whopCompanyId,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            type: product.type,
            billingPeriod: product.billing_period,
            lastSyncAt: new Date(),
          },
          update: {
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            type: product.type,
            billingPeriod: product.billing_period,
            lastSyncAt: new Date(),
          },
        });
      }

      // Update integration last sync time
      await prisma.tenantIntegration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });

      logger.info('Whop products synced successfully', {
        tenantId,
        count: products.length,
      });

      return products.length;
    } catch (error) {
      logger.error('Failed to sync Whop products:', error);
      throw error;
    }
  }

  /**
   * Test Discord webhook
   */
  async testDiscordWebhook(webhookUrl: string): Promise<boolean> {
    const discordService = new DiscordService();
    return await discordService.testWebhook(webhookUrl);
  }

  /**
   * Test Whop API connection
   */
  async testWhopConnection(apiKey: string): Promise<boolean> {
    const whopService = new WhopService(apiKey);
    return await whopService.testConnection();
  }
}

export const integrationService = new IntegrationService();
