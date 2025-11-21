import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Types
type FollowUpType =
  | 'missed_call'
  | 'order_upsell'
  | 'booking_reminder'
  | 'loyalty_reward'
  | 'reactivation'
  | 'aftercare'
  | 'review_request'
  | 'birthday'
  | 'anniversary';

interface FollowUpConfig {
  tenantId: string;
  type: FollowUpType;
  enabled: boolean;
  delayMinutes: number;
  channel: 'sms' | 'email' | 'whatsapp' | 'all';
  template: string;
  conditions?: any;
}

interface FollowUpJob {
  id: string;
  tenantId: string;
  type: FollowUpType;
  customerId: string;
  customerPhone: string;
  customerEmail?: string;
  scheduledFor: Date;
  data: any;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export class FollowUpsService {
  private twilioClient: twilio.Twilio;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    this.emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // ================== Configuration ==================

  /**
   * Configure follow-up automation for tenant
   */
  async configureFollowUp(config: FollowUpConfig) {
    const existing = await prisma.followUpConfig.findFirst({
      where: {
        tenantId: config.tenantId,
        type: config.type,
      },
    });

    if (existing) {
      return prisma.followUpConfig.update({
        where: { id: existing.id },
        data: config,
      });
    }

    return prisma.followUpConfig.create({
      data: config,
    });
  }

  /**
   * Get follow-up configurations for tenant
   */
  async getConfigurations(tenantId: string) {
    return prisma.followUpConfig.findMany({
      where: { tenantId },
    });
  }

  /**
   * Toggle follow-up automation
   */
  async toggleFollowUp(tenantId: string, type: FollowUpType, enabled: boolean) {
    const config = await prisma.followUpConfig.findFirst({
      where: { tenantId, type },
    });

    if (!config) {
      throw new AppError('Follow-up configuration not found', 404);
    }

    return prisma.followUpConfig.update({
      where: { id: config.id },
      data: { enabled },
    });
  }

  // ================== Scheduling ==================

  /**
   * Schedule missed call follow-up
   */
  async scheduleMissedCallFollowUp(tenantId: string, phone: string, callTime: Date) {
    const config = await this.getConfig(tenantId, 'missed_call');
    if (!config?.enabled) return null;

    const scheduledFor = new Date(callTime.getTime() + config.delayMinutes * 60000);

    return this.scheduleFollowUp({
      tenantId,
      type: 'missed_call',
      customerPhone: phone,
      scheduledFor,
      data: { callTime },
    });
  }

  /**
   * Schedule order upsell follow-up
   */
  async scheduleOrderUpsell(tenantId: string, orderId: string) {
    const config = await this.getConfig(tenantId, 'order_upsell');
    if (!config?.enabled) return null;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return null;

    const scheduledFor = new Date(Date.now() + config.delayMinutes * 60000);

    return this.scheduleFollowUp({
      tenantId,
      type: 'order_upsell',
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || undefined,
      scheduledFor,
      data: { orderId, orderTotal: order.total, items: order.items },
    });
  }

  /**
   * Schedule booking reminder
   */
  async scheduleBookingReminder(tenantId: string, bookingId: string) {
    const config = await this.getConfig(tenantId, 'booking_reminder');
    if (!config?.enabled) return null;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return null;

    // Schedule reminder before appointment
    const scheduledFor = new Date(booking.dateTime.getTime() - config.delayMinutes * 60000);

    return this.scheduleFollowUp({
      tenantId,
      type: 'booking_reminder',
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || undefined,
      scheduledFor,
      data: { bookingId, dateTime: booking.dateTime, serviceName: booking.serviceName },
    });
  }

  /**
   * Schedule aftercare follow-up (for med-spas)
   */
  async scheduleAftercareFollowUp(tenantId: string, bookingId: string, serviceName: string) {
    const config = await this.getConfig(tenantId, 'aftercare');
    if (!config?.enabled) return null;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) return null;

    const scheduledFor = new Date(booking.dateTime.getTime() + config.delayMinutes * 60000);

    return this.scheduleFollowUp({
      tenantId,
      type: 'aftercare',
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail || undefined,
      scheduledFor,
      data: { bookingId, serviceName, dateTime: booking.dateTime },
    });
  }

  /**
   * Schedule loyalty reward notification
   */
  async scheduleLoyaltyReward(tenantId: string, customerId: string, points: number, reward: string) {
    const config = await this.getConfig(tenantId, 'loyalty_reward');
    if (!config?.enabled) return null;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return null;

    return this.scheduleFollowUp({
      tenantId,
      type: 'loyalty_reward',
      customerId,
      customerPhone: customer.phone,
      customerEmail: customer.email || undefined,
      scheduledFor: new Date(Date.now() + config.delayMinutes * 60000),
      data: { points, reward },
    });
  }

  /**
   * Schedule reactivation campaign
   */
  async scheduleReactivation(tenantId: string, inactiveDays: number = 30) {
    const config = await this.getConfig(tenantId, 'reactivation');
    if (!config?.enabled) return null;

    const cutoffDate = new Date(Date.now() - inactiveDays * 24 * 60 * 60 * 1000);

    // Find inactive customers
    const inactiveCustomers = await prisma.customer.findMany({
      where: {
        tenantId,
        lastActivityAt: { lt: cutoffDate },
        reactivationSentAt: null,
      },
      take: 100, // Process in batches
    });

    const jobs = [];
    for (const customer of inactiveCustomers) {
      const job = await this.scheduleFollowUp({
        tenantId,
        type: 'reactivation',
        customerId: customer.id,
        customerPhone: customer.phone,
        customerEmail: customer.email || undefined,
        scheduledFor: new Date(Date.now() + config.delayMinutes * 60000),
        data: { inactiveDays, lastActivity: customer.lastActivityAt },
      });

      if (job) {
        jobs.push(job);
        // Mark as sent to avoid duplicates
        await prisma.customer.update({
          where: { id: customer.id },
          data: { reactivationSentAt: new Date() },
        });
      }
    }

    logger.info('Reactivation campaign scheduled', {
      tenantId,
      customersCount: jobs.length,
    });

    return jobs;
  }

  /**
   * Schedule review request
   */
  async scheduleReviewRequest(tenantId: string, orderId?: string, bookingId?: string) {
    const config = await this.getConfig(tenantId, 'review_request');
    if (!config?.enabled) return null;

    let customerPhone: string;
    let customerEmail: string | undefined;
    let data: any = {};

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) return null;
      customerPhone = order.customerPhone;
      customerEmail = order.customerEmail || undefined;
      data = { orderId };
    } else if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) return null;
      customerPhone = booking.customerPhone;
      customerEmail = booking.customerEmail || undefined;
      data = { bookingId };
    } else {
      return null;
    }

    return this.scheduleFollowUp({
      tenantId,
      type: 'review_request',
      customerPhone,
      customerEmail,
      scheduledFor: new Date(Date.now() + config.delayMinutes * 60000),
      data,
    });
  }

  // ================== Execution ==================

  /**
   * Process pending follow-ups
   */
  async processPendingFollowUps() {
    const pendingJobs = await prisma.followUpJob.findMany({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() },
      },
      take: 50,
    });

    for (const job of pendingJobs) {
      try {
        await this.executeFollowUp(job);
        await prisma.followUpJob.update({
          where: { id: job.id },
          data: { status: 'sent', sentAt: new Date() },
        });
      } catch (error: any) {
        logger.error('Follow-up execution failed', {
          jobId: job.id,
          error: error.message,
        });
        await prisma.followUpJob.update({
          where: { id: job.id },
          data: { status: 'failed', error: error.message },
        });
      }
    }

    return pendingJobs.length;
  }

  /**
   * Execute a single follow-up
   */
  private async executeFollowUp(job: any) {
    const config = await this.getConfig(job.tenantId, job.type);
    if (!config) {
      throw new Error('Follow-up configuration not found');
    }

    const message = this.renderTemplate(config.template, job.data);

    // Send via configured channels
    if (config.channel === 'sms' || config.channel === 'all') {
      await this.sendSMS(job.customerPhone, message);
    }

    if ((config.channel === 'email' || config.channel === 'all') && job.customerEmail) {
      await this.sendEmail(job.customerEmail, this.getSubject(job.type), message);
    }

    if (config.channel === 'whatsapp' || config.channel === 'all') {
      await this.sendWhatsApp(job.customerPhone, message);
    }

    logger.info('Follow-up sent', {
      jobId: job.id,
      type: job.type,
      phone: job.customerPhone,
    });
  }

  // ================== Messaging ==================

  private async sendSMS(to: string, message: string) {
    await this.twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body: message,
    });
  }

  private async sendEmail(to: string, subject: string, message: string) {
    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@firstring.ai',
      to,
      subject,
      text: message,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    });
  }

  private async sendWhatsApp(to: string, message: string) {
    await this.twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
      body: message,
    });
  }

  // ================== Helpers ==================

  private async getConfig(tenantId: string, type: FollowUpType) {
    return prisma.followUpConfig.findFirst({
      where: { tenantId, type },
    });
  }

  private async scheduleFollowUp(data: {
    tenantId: string;
    type: FollowUpType;
    customerId?: string;
    customerPhone: string;
    customerEmail?: string;
    scheduledFor: Date;
    data: any;
  }) {
    return prisma.followUpJob.create({
      data: {
        tenantId: data.tenantId,
        type: data.type,
        customerId: data.customerId,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        scheduledFor: data.scheduledFor,
        data: data.data,
        status: 'pending',
      },
    });
  }

  private renderTemplate(template: string, data: any): string {
    let message = template;
    for (const [key, value] of Object.entries(data)) {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return message;
  }

  private getSubject(type: FollowUpType): string {
    const subjects: Record<FollowUpType, string> = {
      missed_call: 'We missed your call!',
      order_upsell: 'Special offer just for you!',
      booking_reminder: 'Appointment Reminder',
      loyalty_reward: 'You earned a reward!',
      reactivation: 'We miss you!',
      aftercare: 'Post-treatment care instructions',
      review_request: 'How was your experience?',
      birthday: 'Happy Birthday!',
      anniversary: 'Happy Anniversary!',
    };
    return subjects[type] || 'Message from First Ring';
  }

  // ================== Analytics ==================

  /**
   * Get follow-up statistics
   */
  async getStatistics(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, sent, failed, byType] = await Promise.all([
      prisma.followUpJob.count({ where }),
      prisma.followUpJob.count({ where: { ...where, status: 'sent' } }),
      prisma.followUpJob.count({ where: { ...where, status: 'failed' } }),
      prisma.followUpJob.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? (sent / total * 100).toFixed(1) : 0,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Get pending follow-ups
   */
  async getPendingFollowUps(tenantId: string) {
    return prisma.followUpJob.findMany({
      where: {
        tenantId,
        status: 'pending',
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  /**
   * Cancel follow-up
   */
  async cancelFollowUp(jobId: string) {
    return prisma.followUpJob.update({
      where: { id: jobId },
      data: { status: 'cancelled' },
    });
  }

  /**
   * Get default templates
   */
  getDefaultTemplates() {
    return {
      missed_call: "Hi! We noticed we missed your call. How can we help you today? Reply to this message or call us back at your convenience.",
      order_upsell: "Thanks for your recent order! We thought you might also like {{recommendation}}. Use code THANKYOU10 for 10% off your next order!",
      booking_reminder: "Reminder: You have an appointment scheduled for {{dateTime}}. Reply YES to confirm or call us to reschedule.",
      loyalty_reward: "Congratulations! You've earned {{points}} points and unlocked: {{reward}}. Visit us to redeem!",
      reactivation: "We miss you! It's been a while since your last visit. Come back and enjoy 15% off your next order with code COMEBACK15.",
      aftercare: "Thank you for your {{serviceName}} treatment! Here are your aftercare instructions: Stay hydrated, avoid direct sun, and follow up if you have any concerns.",
      review_request: "We hope you enjoyed your experience with us! Would you mind leaving us a review? It helps us serve you better. {{reviewLink}}",
      birthday: "Happy Birthday! 🎂 Enjoy a special treat on us - use code BDAY20 for 20% off today only!",
      anniversary: "Happy Anniversary! Thank you for being a loyal customer for {{years}} year(s). Here's a special gift: {{reward}}",
    };
  }
}

export default new FollowUpsService();
