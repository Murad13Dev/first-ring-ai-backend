import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import nodemailer from 'nodemailer';
import logger from '../../config/logger';

const router = Router();

// ==========================================
// NOTIFICATIONS SERVICE
// ==========================================

const notificationsService = {
  // Create notification
  async create(data: {
    tenantId?: string;
    userId?: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    return prisma.notification.create({ data });
  },

  // Get notifications
  async getByTenant(tenantId: string, unreadOnly: boolean = false) {
    return prisma.notification.findMany({
      where: {
        tenantId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },

  // Mark as read
  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  },

  // Mark all as read
  async markAllAsRead(tenantId: string) {
    return prisma.notification.updateMany({
      where: { tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  // Delete notification
  async delete(id: string) {
    return prisma.notification.delete({ where: { id } });
  },

  // Send usage warning
  async sendUsageWarning(tenantId: string, usagePercent: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) return;

    const notification = await this.create({
      tenantId,
      type: 'usage_warning',
      title: 'Usage Warning',
      message: `You've used ${usagePercent}% of your monthly call minutes. Consider upgrading your plan.`,
      data: { usagePercent },
    });

    // Send email
    await this.sendEmail(
      tenant.email,
      'Usage Warning - First Ring AI',
      `Hi ${tenant.name},\n\nYou've used ${usagePercent}% of your monthly call minutes. Consider upgrading your plan to avoid service interruption.\n\nBest regards,\nFirst Ring AI Team`
    );

    return notification;
  },

  // Send payment failed
  async sendPaymentFailed(tenantId: string, invoiceId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) return;

    const notification = await this.create({
      tenantId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: 'Your recent payment attempt failed. Please update your payment method.',
      data: { invoiceId },
    });

    await this.sendEmail(
      tenant.email,
      'Payment Failed - First Ring AI',
      `Hi ${tenant.name},\n\nYour recent payment attempt failed. Please update your payment method to continue using our services.\n\nBest regards,\nFirst Ring AI Team`
    );

    return notification;
  },

  // Send subscription expiring
  async sendSubscriptionExpiring(tenantId: string, daysLeft: number) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    if (!tenant) return;

    const notification = await this.create({
      tenantId,
      type: 'subscription_expiring',
      title: 'Subscription Expiring Soon',
      message: `Your subscription will expire in ${daysLeft} days. Renew now to avoid service interruption.`,
      data: { daysLeft },
    });

    await this.sendEmail(
      tenant.email,
      'Subscription Expiring - First Ring AI',
      `Hi ${tenant.name},\n\nYour subscription will expire in ${daysLeft} days. Renew now to avoid service interruption.\n\nBest regards,\nFirst Ring AI Team`
    );

    return notification;
  },

  // Send email helper
  async sendEmail(to: string, subject: string, text: string) {
    try {
      if (!process.env.SMTP_HOST) {
        logger.warn('SMTP not configured, skipping email');
        return;
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@firstring.ai',
        to,
        subject,
        text,
      });

      logger.info('Email sent', { to, subject });
    } catch (error) {
      logger.error('Email send error', { error, to, subject });
    }
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const notificationsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await notificationsService.create(req.body);
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },

  async getByTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { unreadOnly } = req.query;
      const notifications = await notificationsService.getByTenant(
        tenantId,
        unreadOnly === 'true'
      );
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  },

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const notification = await notificationsService.markAsRead(id);
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      await notificationsService.markAllAsRead(tenantId);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await notificationsService.delete(id);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      next(error);
    }
  },

  async sendUsageWarning(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, usagePercent } = req.body;
      const notification = await notificationsService.sendUsageWarning(tenantId, usagePercent);
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// ==========================================

router.post('/', notificationsController.create);
router.get('/:tenantId', notificationsController.getByTenant);
router.put('/:id/read', notificationsController.markAsRead);
router.put('/:tenantId/read-all', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.delete);
router.post('/usage-warning', notificationsController.sendUsageWarning);

export default router;
