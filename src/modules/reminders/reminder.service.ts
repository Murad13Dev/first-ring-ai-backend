import prisma from '../../config/database';
import logger from '../../config/logger';
import nodemailer from 'nodemailer';

interface ReminderConfig {
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminderHoursBefore: number[]; // e.g., [24, 1] for 24h and 1h before
}

export class ReminderService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  /**
   * Process pending booking reminders
   * Should be called by a cron job (e.g., every 15 minutes)
   */
  async processBookingReminders() {
    try {
      const now = new Date();

      // Get bookings that need reminders
      // 24 hours before
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const in23Hours = new Date(now.getTime() + 23 * 60 * 60 * 1000);

      // 1 hour before
      const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
      const in45Min = new Date(now.getTime() + 45 * 60 * 1000);

      // Get bookings for 24h reminder (not yet sent)
      const bookings24h = await prisma.booking.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          reminderSent: false,
          dateTime: {
            gte: in23Hours,
            lte: in24Hours,
          },
        },
        include: {
          tenant: {
            select: { name: true, phone: true },
          },
        },
      });

      // Get bookings for 1h reminder (already had 24h reminder)
      const bookings1h = await prisma.booking.findMany({
        where: {
          status: { in: ['pending', 'confirmed'] },
          reminderSent: true,
          dateTime: {
            gte: in45Min,
            lte: in1Hour,
          },
        },
        include: {
          tenant: {
            select: { name: true, phone: true },
          },
        },
      });

      let sentCount = 0;

      // Send 24h reminders
      for (const booking of bookings24h) {
        try {
          await this.sendBookingReminder(booking, '24 hours');
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true },
          });
          sentCount++;
        } catch (error) {
          logger.error('Failed to send 24h reminder', { bookingId: booking.id, error });
        }
      }

      // Send 1h reminders (separate notification, not updating reminderSent again)
      for (const booking of bookings1h) {
        try {
          await this.sendBookingReminder(booking, '1 hour');
          sentCount++;
        } catch (error) {
          logger.error('Failed to send 1h reminder', { bookingId: booking.id, error });
        }
      }

      logger.info('Booking reminders processed', {
        processed24h: bookings24h.length,
        processed1h: bookings1h.length,
        sentCount,
      });

      return {
        processed24h: bookings24h.length,
        processed1h: bookings1h.length,
        sentCount,
      };
    } catch (error) {
      logger.error('Process booking reminders error', { error });
      throw error;
    }
  }

  /**
   * Send booking reminder
   */
  async sendBookingReminder(
    booking: any,
    timeframe: string
  ) {
    const { customerName, customerEmail, customerPhone, serviceName, dateTime, tenant } = booking;

    const formattedDate = new Date(dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send email reminder
    if (customerEmail) {
      await this.sendEmailReminder({
        to: customerEmail,
        customerName,
        serviceName,
        date: formattedDate,
        time: formattedTime,
        businessName: tenant?.name || 'Our business',
        timeframe,
      });
    }

    // Send SMS reminder (if configured)
    if (customerPhone && process.env.TWILIO_ACCOUNT_SID) {
      await this.sendSMSReminder({
        to: customerPhone,
        customerName,
        serviceName,
        date: formattedDate,
        time: formattedTime,
        businessName: tenant?.name || 'Our business',
        timeframe,
      });
    }

    // Create notification in database
    if (booking.tenantId) {
      await prisma.notification.create({
        data: {
          tenantId: booking.tenantId,
          type: 'booking_reminder_sent',
          title: 'Reminder Sent',
          message: `${timeframe} reminder sent to ${customerName} for ${serviceName}`,
          data: {
            bookingId: booking.id,
            customerName,
            customerEmail,
            customerPhone,
            timeframe,
          },
        },
      });
    }

    logger.info('Booking reminder sent', {
      bookingId: booking.id,
      customerEmail,
      customerPhone,
      timeframe,
    });
  }

  /**
   * Send email reminder
   */
  private async sendEmailReminder(params: {
    to: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    businessName: string;
    timeframe: string;
  }) {
    const { to, customerName, serviceName, date, time, businessName, timeframe } = params;

    const subject = `Reminder: Your appointment is in ${timeframe}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Reminder</h2>

        <p>Hi ${customerName},</p>

        <p>This is a friendly reminder that your appointment is coming up in <strong>${timeframe}</strong>.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Appointment Details</h3>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Location:</strong> ${businessName}</p>
        </div>

        <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>

        <p>We look forward to seeing you!</p>

        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          ${businessName}
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@firstring.ai',
        to,
        subject,
        html,
      });

      logger.info('Email reminder sent', { to, timeframe });
    } catch (error) {
      logger.error('Send email reminder error', { error, to });
      throw error;
    }
  }

  /**
   * Send SMS reminder using Twilio
   */
  private async sendSMSReminder(params: {
    to: string;
    customerName: string;
    serviceName: string;
    date: string;
    time: string;
    businessName: string;
    timeframe: string;
  }) {
    const { to, customerName, serviceName, date, time, businessName, timeframe } = params;

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      logger.warn('Twilio not configured, skipping SMS reminder');
      return;
    }

    try {
      const twilio = require('twilio')(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const message = `Hi ${customerName}! Reminder: Your ${serviceName} appointment at ${businessName} is in ${timeframe} (${date} at ${time}). Reply HELP for assistance.`;

      await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });

      logger.info('SMS reminder sent', { to, timeframe });
    } catch (error) {
      logger.error('Send SMS reminder error', { error, to });
      throw error;
    }
  }

  /**
   * Send immediate reminder (manual trigger)
   */
  async sendImmediateReminder(bookingId: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          tenant: {
            select: { name: true, phone: true },
          },
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      await this.sendBookingReminder(booking, 'soon');

      return { success: true, message: 'Reminder sent successfully' };
    } catch (error) {
      logger.error('Send immediate reminder error', { error, bookingId });
      throw error;
    }
  }

  /**
   * Get reminder status for a booking
   */
  async getReminderStatus(bookingId: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          reminderSent: true,
          confirmationSent: true,
          dateTime: true,
          status: true,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const now = new Date();
      const bookingTime = new Date(booking.dateTime);
      const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      return {
        bookingId: booking.id,
        reminderSent: booking.reminderSent,
        confirmationSent: booking.confirmationSent,
        hoursUntilBooking: Math.round(hoursUntilBooking * 10) / 10,
        status: booking.status,
        nextReminderDue: !booking.reminderSent && hoursUntilBooking <= 24 && hoursUntilBooking > 0,
      };
    } catch (error) {
      logger.error('Get reminder status error', { error, bookingId });
      throw error;
    }
  }

  /**
   * Send confirmation email after booking is created
   */
  async sendBookingConfirmation(bookingId: string) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          tenant: {
            select: { name: true, phone: true, address: true },
          },
        },
      });

      if (!booking || !booking.customerEmail) {
        return { success: false, message: 'Booking not found or no email' };
      }

      const formattedDate = new Date(booking.dateTime).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const formattedTime = new Date(booking.dateTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Booking Confirmed!</h2>

          <p>Hi ${booking.customerName},</p>

          <p>Your booking has been confirmed. Here are the details:</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Booking Details</h3>
            <p><strong>Booking ID:</strong> ${booking.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>Service:</strong> ${booking.serviceName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${formattedTime}</p>
            ${booking.duration ? `<p><strong>Duration:</strong> ${booking.duration} minutes</p>` : ''}
            ${booking.partySize ? `<p><strong>Party Size:</strong> ${booking.partySize}</p>` : ''}
            <p><strong>Location:</strong> ${booking.tenant?.name || 'Our location'}</p>
            ${booking.tenant?.address ? `<p><strong>Address:</strong> ${booking.tenant.address}</p>` : ''}
          </div>

          ${booking.specialRequests ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your Special Requests:</strong> ${booking.specialRequests}</p>
            </div>
          ` : ''}

          <p>You will receive a reminder 24 hours and 1 hour before your appointment.</p>

          <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>

          <p style="color: #6b7280; font-size: 14px;">
            Best regards,<br>
            ${booking.tenant?.name || 'Our Team'}
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@firstring.ai',
        to: booking.customerEmail,
        subject: `Booking Confirmed - ${booking.serviceName}`,
        html,
      });

      await prisma.booking.update({
        where: { id: bookingId },
        data: { confirmationSent: true },
      });

      logger.info('Booking confirmation sent', { bookingId, email: booking.customerEmail });

      return { success: true, message: 'Confirmation sent' };
    } catch (error) {
      logger.error('Send booking confirmation error', { error, bookingId });
      throw error;
    }
  }
}

export default new ReminderService();
