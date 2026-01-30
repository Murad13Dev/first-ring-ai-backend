import cron from 'node-cron';
import logger from '../config/logger';
import reminderService from '../modules/reminders/reminder.service';
import { UsageTrackingService } from '../services/usage-tracking.service';
import webhookLogService from '../services/webhook-log.service';
import auditService from '../services/audit.service';

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  logger.info('🕐 Initializing cron jobs...');

  // ==========================================
  // BOOKING REMINDERS
  // Run every 15 minutes
  // ==========================================
  cron.schedule('*/15 * * * *', async () => {
    logger.info('⏰ Running booking reminders cron job');
    try {
      const result = await reminderService.processBookingReminders();
      logger.info('✅ Booking reminders processed', result);
    } catch (error) {
      logger.error('❌ Booking reminders cron failed', { error });
    }
  });

  // ==========================================
  // USAGE TRACKING - Reset monthly usage
  // Run at midnight on the 1st of each month
  // ==========================================
  cron.schedule('0 0 1 * *', async () => {
    logger.info('⏰ Running monthly usage reset cron job');
    try {
      const usageService = new UsageTrackingService();
      await usageService.createMonthlyUsageRecords();
      logger.info('✅ Monthly usage records created');
    } catch (error) {
      logger.error('❌ Monthly usage reset cron failed', { error });
    }
  });

  // ==========================================
  // USAGE WARNINGS
  // Run every hour - check if tenants are approaching limits
  // ==========================================
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Running usage warnings cron job');
    try {
      const usageService = new UsageTrackingService();
      await usageService.checkAndSendUsageWarnings();
      logger.info('✅ Usage warnings checked');
    } catch (error) {
      logger.error('❌ Usage warnings cron failed', { error });
    }
  });

  // ==========================================
  // SUBSCRIPTION EXPIRY CHECK
  // Run daily at 9:00 AM
  // ==========================================
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ Running subscription expiry check');
    try {
      const usageService = new UsageTrackingService();
      await usageService.checkExpiringSubscriptions();
      logger.info('✅ Subscription expiry check completed');
    } catch (error) {
      logger.error('❌ Subscription expiry check failed', { error });
    }
  });

  // ==========================================
  // WEBHOOK LOGS CLEANUP
  // Run weekly on Sunday at 3:00 AM
  // ==========================================
  cron.schedule('0 3 * * 0', async () => {
    logger.info('⏰ Running webhook logs cleanup');
    try {
      const deletedCount = await webhookLogService.cleanup(30); // Keep 30 days
      logger.info('✅ Webhook logs cleanup completed', { deletedCount });
    } catch (error) {
      logger.error('❌ Webhook logs cleanup failed', { error });
    }
  });

  // ==========================================
  // AUDIT LOGS CLEANUP
  // Run monthly on the 1st at 4:00 AM
  // ==========================================
  cron.schedule('0 4 1 * *', async () => {
    logger.info('⏰ Running audit logs cleanup');
    try {
      const deletedCount = await auditService.cleanup(90); // Keep 90 days
      logger.info('✅ Audit logs cleanup completed', { deletedCount });
    } catch (error) {
      logger.error('❌ Audit logs cleanup failed', { error });
    }
  });

  logger.info('✅ All cron jobs initialized');
  logger.info('   📋 Booking reminders: every 15 minutes');
  logger.info('   📋 Usage warnings: every hour');
  logger.info('   📋 Monthly usage reset: 1st of each month');
  logger.info('   📋 Subscription expiry: daily at 9:00 AM');
  logger.info('   📋 Webhook logs cleanup: weekly on Sunday');
  logger.info('   📋 Audit logs cleanup: monthly on 1st');
}
