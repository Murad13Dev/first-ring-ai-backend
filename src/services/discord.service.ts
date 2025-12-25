import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { Order } from '@prisma/client';

/**
 * Discord Notification Service
 * Handles sending notifications to Discord via webhooks and managing Discord bot operations
 */

// Discord API Base URL
const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Discord Embed Colors
const COLORS = {
  SUCCESS: 0x00ff00, // Green
  WARNING: 0xffaa00, // Orange
  ERROR: 0xff0000, // Red
  INFO: 0x0099ff, // Blue
  PENDING: 0xcccccc, // Gray
};

// Discord Embed Interface
interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
  thumbnail?: {
    url: string;
  };
}

interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

export class DiscordService {
  private botToken?: string;
  private botClient?: AxiosInstance;

  constructor(botToken?: string) {
    this.botToken = botToken;

    if (botToken) {
      this.botClient = axios.create({
        baseURL: DISCORD_API_BASE,
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  /**
   * Send a message via Discord webhook
   */
  async sendWebhookMessage(
    webhookUrl: string,
    message: DiscordMessage
  ): Promise<boolean> {
    try {
      await axios.post(webhookUrl, message);
      logger.info('Discord webhook message sent successfully');
      return true;
    } catch (error: any) {
      logger.error('Failed to send Discord webhook message:', {
        error: error.message,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Send new order notification
   */
  async notifyNewOrder(webhookUrl: string, order: Order): Promise<boolean> {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items as any);
    const itemsList = items
      .map((item: any) => `• ${item.quantity}x ${item.name} - $${item.price.toFixed(2)}`)
      .join('\n');

    const embed: DiscordEmbed = {
      title: '🍕 NEW ORDER RECEIVED',
      color: COLORS.INFO,
      fields: [
        {
          name: '📋 Order ID',
          value: `\`${order.id.slice(0, 8)}\``,
          inline: true,
        },
        {
          name: '👤 Customer',
          value: order.customerName || 'N/A',
          inline: true,
        },
        {
          name: '📞 Phone',
          value: order.customerPhone,
          inline: true,
        },
        {
          name: '🛒 Items',
          value: itemsList || 'No items',
          inline: false,
        },
        {
          name: '💰 Total',
          value: `$${order.total.toFixed(2)}`,
          inline: true,
        },
        {
          name: '💳 Payment Status',
          value: this.formatPaymentStatus(order.paymentStatus),
          inline: true,
        },
        {
          name: '📦 Delivery Type',
          value: order.deliveryType || 'N/A',
          inline: true,
        },
      ],
      footer: {
        text: 'Order Management System',
      },
      timestamp: new Date().toISOString(),
    };

    if (order.notes) {
      embed.fields?.push({
        name: '📝 Notes',
        value: order.notes,
        inline: false,
      });
    }

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'Order Notifications',
    });
  }

  /**
   * Send payment success notification
   */
  async notifyPaymentSuccess(
    webhookUrl: string,
    order: Order
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '✅ PAYMENT CONFIRMED',
      description: `Order #${order.id.slice(0, 8)} has been paid successfully!`,
      color: COLORS.SUCCESS,
      fields: [
        {
          name: '👤 Customer',
          value: order.customerName || 'N/A',
          inline: true,
        },
        {
          name: '💰 Amount',
          value: `$${order.total.toFixed(2)}`,
          inline: true,
        },
        {
          name: '💳 Method',
          value: order.paymentMethod || 'Stripe',
          inline: true,
        },
        {
          name: '📦 Status',
          value: this.formatOrderStatus(order.status),
          inline: true,
        },
      ],
      footer: {
        text: 'Payment Confirmed',
      },
      timestamp: new Date().toISOString(),
    };

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'Payment Notifications',
    });
  }

  /**
   * Send payment failed notification
   */
  async notifyPaymentFailed(
    webhookUrl: string,
    order: Order
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '❌ PAYMENT FAILED',
      description: `Order #${order.id.slice(0, 8)} payment failed!`,
      color: COLORS.ERROR,
      fields: [
        {
          name: '👤 Customer',
          value: order.customerName || 'N/A',
          inline: true,
        },
        {
          name: '📞 Phone',
          value: order.customerPhone,
          inline: true,
        },
        {
          name: '💰 Amount',
          value: `$${order.total.toFixed(2)}`,
          inline: true,
        },
      ],
      footer: {
        text: 'Action Required: Contact customer',
      },
      timestamp: new Date().toISOString(),
    };

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'Payment Alerts',
    });
  }

  /**
   * Send order ready notification
   */
  async notifyOrderReady(webhookUrl: string, order: Order): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '🎉 ORDER READY',
      description: `Order #${order.id.slice(0, 8)} is ready for ${order.deliveryType}!`,
      color: COLORS.SUCCESS,
      fields: [
        {
          name: '👤 Customer',
          value: order.customerName || 'N/A',
          inline: true,
        },
        {
          name: '📞 Phone',
          value: order.customerPhone,
          inline: true,
        },
        {
          name: '📦 Type',
          value: order.deliveryType || 'N/A',
          inline: true,
        },
      ],
      footer: {
        text: 'Order Ready - Notify Customer',
      },
      timestamp: new Date().toISOString(),
    };

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'Order Status',
    });
  }

  /**
   * Send AI call notification
   */
  async notifyAICall(
    webhookUrl: string,
    callData: {
      fromNumber: string;
      duration: number;
      intent?: string;
      outcome?: string;
      orderId?: string;
      bookingId?: string;
    }
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '📞 AI CALL COMPLETED',
      color: COLORS.INFO,
      fields: [
        {
          name: '📱 From',
          value: callData.fromNumber,
          inline: true,
        },
        {
          name: '⏱️ Duration',
          value: `${Math.floor(callData.duration / 60)}m ${callData.duration % 60}s`,
          inline: true,
        },
        {
          name: '🎯 Intent',
          value: callData.intent || 'Unknown',
          inline: true,
        },
        {
          name: '✅ Outcome',
          value: callData.outcome || 'Unknown',
          inline: true,
        },
      ],
      footer: {
        text: 'AI Agent Call Log',
      },
      timestamp: new Date().toISOString(),
    };

    if (callData.orderId) {
      embed.fields?.push({
        name: '🛒 Order Created',
        value: `\`${callData.orderId.slice(0, 8)}\``,
        inline: true,
      });
    }

    if (callData.bookingId) {
      embed.fields?.push({
        name: '📅 Booking Created',
        value: `\`${callData.bookingId.slice(0, 8)}\``,
        inline: true,
      });
    }

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'AI Agent',
    });
  }

  /**
   * Send daily report
   */
  async sendDailyReport(
    webhookUrl: string,
    stats: {
      totalOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
      topSellingItem?: string;
      totalCalls?: number;
      date: string;
    }
  ): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '📊 DAILY BUSINESS REPORT',
      description: `Summary for ${stats.date}`,
      color: COLORS.INFO,
      fields: [
        {
          name: '📦 Total Orders',
          value: stats.totalOrders.toString(),
          inline: true,
        },
        {
          name: '💰 Revenue',
          value: `$${stats.totalRevenue.toFixed(2)}`,
          inline: true,
        },
        {
          name: '📈 Avg Order',
          value: `$${stats.avgOrderValue.toFixed(2)}`,
          inline: true,
        },
      ],
      footer: {
        text: 'Daily Analytics Report',
      },
      timestamp: new Date().toISOString(),
    };

    if (stats.topSellingItem) {
      embed.fields?.push({
        name: '⭐ Top Item',
        value: stats.topSellingItem,
        inline: true,
      });
    }

    if (stats.totalCalls) {
      embed.fields?.push({
        name: '📞 Total Calls',
        value: stats.totalCalls.toString(),
        inline: true,
      });
    }

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'Daily Reports',
    });
  }

  /**
   * Grant Discord role to user (requires bot token)
   */
  async grantRole(
    guildId: string,
    userId: string,
    roleId: string
  ): Promise<boolean> {
    if (!this.botClient) {
      logger.error('Discord bot token not configured');
      return false;
    }

    try {
      await this.botClient.put(
        `/guilds/${guildId}/members/${userId}/roles/${roleId}`
      );
      logger.info('Discord role granted successfully', {
        guildId,
        userId,
        roleId,
      });
      return true;
    } catch (error: any) {
      logger.error('Failed to grant Discord role:', {
        error: error.message,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Revoke Discord role from user (requires bot token)
   */
  async revokeRole(
    guildId: string,
    userId: string,
    roleId: string
  ): Promise<boolean> {
    if (!this.botClient) {
      logger.error('Discord bot token not configured');
      return false;
    }

    try {
      await this.botClient.delete(
        `/guilds/${guildId}/members/${userId}/roles/${roleId}`
      );
      logger.info('Discord role revoked successfully', {
        guildId,
        userId,
        roleId,
      });
      return true;
    } catch (error: any) {
      logger.error('Failed to revoke Discord role:', {
        error: error.message,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Send DM to user (requires bot token)
   */
  async sendDM(userId: string, message: string): Promise<boolean> {
    if (!this.botClient) {
      logger.error('Discord bot token not configured');
      return false;
    }

    try {
      // Create DM channel
      const dmChannelResponse = await this.botClient.post('/users/@me/channels', {
        recipient_id: userId,
      });

      const dmChannelId = dmChannelResponse.data.id;

      // Send message
      await this.botClient.post(`/channels/${dmChannelId}/messages`, {
        content: message,
      });

      logger.info('Discord DM sent successfully', { userId });
      return true;
    } catch (error: any) {
      logger.error('Failed to send Discord DM:', {
        error: error.message,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Format payment status with emoji
   */
  private formatPaymentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '⏳ Pending',
      paid: '✅ Paid',
      failed: '❌ Failed',
      refunded: '↩️ Refunded',
      partially_refunded: '⚠️ Partially Refunded',
    };
    return statusMap[status] || status;
  }

  /**
   * Format order status with emoji
   */
  private formatOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '⏳ Pending',
      confirmed: '✅ Confirmed',
      preparing: '👨‍🍳 Preparing',
      ready: '🎉 Ready',
      completed: '✅ Completed',
      cancelled: '❌ Cancelled',
    };
    return statusMap[status] || status;
  }

  /**
   * Validate Discord webhook URL
   */
  static isValidWebhookUrl(url: string): boolean {
    const webhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/.+$/;
    return webhookRegex.test(url);
  }

  /**
   * Test webhook connection
   */
  async testWebhook(webhookUrl: string): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '✅ Discord Integration Test',
      description: 'Your Discord webhook is configured correctly!',
      color: COLORS.SUCCESS,
      footer: {
        text: 'Test Message',
      },
      timestamp: new Date().toISOString(),
    };

    return this.sendWebhookMessage(webhookUrl, {
      embeds: [embed],
      username: 'Integration Test',
    });
  }
}

// Export singleton instance (without bot token - each tenant may have their own)
export const discordService = new DiscordService();
