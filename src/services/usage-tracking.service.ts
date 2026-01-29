import prisma from '../config/database';
import logger from '../config/logger';

/**
 * Usage Tracking Service
 * Tracks call minutes, API usage, and enforces plan limits
 */
export class UsageTrackingService {
  /**
   * Record call usage for a tenant
   */
  async recordCallUsage(tenantId: string, durationSeconds: number) {
    try {
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get or create usage record for current period
      let usageRecord = await prisma.usageRecord.findFirst({
        where: {
          tenantId,
          periodStart: {
            gte: periodStart,
          },
        },
      });

      // Get tenant's plan limits
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      const callMinutesLimit = tenant?.subscription?.plan?.callMinutes ?? 100;
      const callCountLimit = tenant?.subscription?.plan?.maxCalls ?? 50;

      if (!usageRecord) {
        // Create new usage record for this period
        usageRecord = await prisma.usageRecord.create({
          data: {
            tenantId,
            periodStart,
            periodEnd,
            callMinutes: durationMinutes,
            callCount: 1,
            callMinutesLimit,
            callCountLimit,
          },
        });
      } else {
        // Update existing record
        const newCallMinutes = usageRecord.callMinutes + durationMinutes;
        const overageMinutes = Math.max(0, newCallMinutes - callMinutesLimit);
        const overageRate = tenant?.subscription?.plan?.overageRatePerMinute ?? 0.50;
        const overageCharges = overageMinutes * overageRate;

        usageRecord = await prisma.usageRecord.update({
          where: { id: usageRecord.id },
          data: {
            callMinutes: newCallMinutes,
            callCount: { increment: 1 },
            overageMinutes,
            overageCharges,
          },
        });
      }

      logger.info('Call usage recorded', {
        tenantId,
        durationMinutes,
        totalMinutes: usageRecord.callMinutes,
        limit: callMinutesLimit,
      });

      return usageRecord;
    } catch (error) {
      logger.error('Record call usage error', { error, tenantId });
      throw error;
    }
  }

  /**
   * Get current usage for a tenant
   */
  async getCurrentUsage(tenantId: string) {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageRecord = await prisma.usageRecord.findFirst({
        where: {
          tenantId,
          periodStart: {
            gte: periodStart,
          },
        },
      });

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      const callMinutesLimit = tenant?.subscription?.plan?.callMinutes ?? 100;
      const callCountLimit = tenant?.subscription?.plan?.maxCalls ?? 50;

      const usage = {
        callMinutes: usageRecord?.callMinutes ?? 0,
        callCount: usageRecord?.callCount ?? 0,
        callMinutesLimit,
        callCountLimit,
        callMinutesUsedPercent: Math.round(((usageRecord?.callMinutes ?? 0) / callMinutesLimit) * 100),
        callCountUsedPercent: Math.round(((usageRecord?.callCount ?? 0) / callCountLimit) * 100),
        overageMinutes: usageRecord?.overageMinutes ?? 0,
        overageCharges: usageRecord?.overageCharges ?? 0,
        periodStart: periodStart.toISOString(),
        periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
      };

      return usage;
    } catch (error) {
      logger.error('Get current usage error', { error, tenantId });
      throw error;
    }
  }

  /**
   * Check if tenant has reached their limit
   */
  async checkLimit(tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const usage = await this.getCurrentUsage(tenantId);

      if (usage.callMinutesUsedPercent >= 100) {
        return {
          allowed: false,
          reason: `Call minutes limit reached (${usage.callMinutes}/${usage.callMinutesLimit} minutes)`,
        };
      }

      if (usage.callCountUsedPercent >= 100) {
        return {
          allowed: false,
          reason: `Call count limit reached (${usage.callCount}/${usage.callCountLimit} calls)`,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Check limit error', { error, tenantId });
      return { allowed: true }; // Allow on error to not block calls
    }
  }

  /**
   * Check and send usage warnings to tenants approaching limits
   */
  async checkAndSendUsageWarnings() {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get all usage records for current period
      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          periodStart: {
            gte: periodStart,
          },
        },
        include: {
          // We need tenant info for notification
        },
      });

      for (const record of usageRecords) {
        const usagePercent = Math.round((record.callMinutes / record.callMinutesLimit) * 100);

        // Send warnings at 80% and 95%
        if (usagePercent >= 80 && usagePercent < 95) {
          await this.sendUsageWarning(record.tenantId, usagePercent, '80%');
        } else if (usagePercent >= 95 && usagePercent < 100) {
          await this.sendUsageWarning(record.tenantId, usagePercent, '95%');
        } else if (usagePercent >= 100) {
          await this.sendUsageWarning(record.tenantId, usagePercent, '100%');
        }
      }

      logger.info('Usage warnings check completed', { recordsChecked: usageRecords.length });
    } catch (error) {
      logger.error('Check usage warnings error', { error });
      throw error;
    }
  }

  /**
   * Send usage warning notification
   */
  private async sendUsageWarning(tenantId: string, usagePercent: number, threshold: string) {
    try {
      // Check if we already sent a warning for this threshold this period
      const existingNotification = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: 'usage_warning',
          data: {
            path: ['threshold'],
            equals: threshold,
          },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      });

      if (existingNotification) {
        return; // Already sent warning for this threshold
      }

      // Create notification
      await prisma.notification.create({
        data: {
          tenantId,
          type: 'usage_warning',
          title: `Usage Warning: ${threshold} of limit reached`,
          message: `You have used ${usagePercent}% of your monthly call minutes. Consider upgrading your plan to avoid service interruption.`,
          data: {
            usagePercent,
            threshold,
          },
        },
      });

      logger.info('Usage warning sent', { tenantId, usagePercent, threshold });
    } catch (error) {
      logger.error('Send usage warning error', { error, tenantId });
    }
  }

  /**
   * Create monthly usage records for all active tenants
   */
  async createMonthlyUsageRecords() {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get all active tenants with subscriptions
      const tenants = await prisma.tenant.findMany({
        where: {
          subscriptionStatus: 'active',
        },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      let created = 0;
      for (const tenant of tenants) {
        // Check if record already exists
        const existing = await prisma.usageRecord.findFirst({
          where: {
            tenantId: tenant.id,
            periodStart: {
              gte: periodStart,
            },
          },
        });

        if (!existing) {
          await prisma.usageRecord.create({
            data: {
              tenantId: tenant.id,
              periodStart,
              periodEnd,
              callMinutes: 0,
              callCount: 0,
              callMinutesLimit: tenant.subscription?.plan?.callMinutes ?? 100,
              callCountLimit: tenant.subscription?.plan?.maxCalls ?? 50,
            },
          });
          created++;
        }
      }

      logger.info('Monthly usage records created', { created, total: tenants.length });
      return { created, total: tenants.length };
    } catch (error) {
      logger.error('Create monthly usage records error', { error });
      throw error;
    }
  }

  /**
   * Check for expiring subscriptions and send notifications
   */
  async checkExpiringSubscriptions() {
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

      // Find subscriptions expiring soon
      const expiringSubscriptions = await prisma.subscription.findMany({
        where: {
          status: 'active',
          currentPeriodEnd: {
            gte: now,
            lte: in7Days,
          },
        },
        include: {
          tenant: true,
        },
      });

      for (const sub of expiringSubscriptions) {
        const daysLeft = Math.ceil(
          (sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Send notification based on days left
        if (daysLeft <= 1) {
          await this.sendExpiryNotification(sub.tenantId, daysLeft, 'urgent');
        } else if (daysLeft <= 3) {
          await this.sendExpiryNotification(sub.tenantId, daysLeft, 'warning');
        } else if (daysLeft <= 7) {
          await this.sendExpiryNotification(sub.tenantId, daysLeft, 'info');
        }
      }

      logger.info('Expiring subscriptions check completed', {
        checked: expiringSubscriptions.length,
      });
    } catch (error) {
      logger.error('Check expiring subscriptions error', { error });
      throw error;
    }
  }

  /**
   * Send subscription expiry notification
   */
  private async sendExpiryNotification(tenantId: string, daysLeft: number, severity: string) {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if we already sent notification today
      const existing = await prisma.notification.findFirst({
        where: {
          tenantId,
          type: 'subscription_expiring',
          createdAt: {
            gte: new Date(today),
          },
        },
      });

      if (existing) return;

      await prisma.notification.create({
        data: {
          tenantId,
          type: 'subscription_expiring',
          title: daysLeft <= 1
            ? '⚠️ Subscription expires tomorrow!'
            : `Subscription expires in ${daysLeft} days`,
          message: `Your subscription will expire in ${daysLeft} day(s). Please renew to avoid service interruption.`,
          data: {
            daysLeft,
            severity,
          },
        },
      });

      logger.info('Subscription expiry notification sent', { tenantId, daysLeft });
    } catch (error) {
      logger.error('Send expiry notification error', { error, tenantId });
    }
  }
}

export default new UsageTrackingService();
