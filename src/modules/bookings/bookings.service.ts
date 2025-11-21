import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

interface CreateBookingData {
  tenantId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId?: string;
  serviceName: string;
  dateTime: Date;
  duration?: number;
  partySize?: number;
  notes?: string;
  specialRequests?: string;
}

interface UpdateBookingData {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  dateTime?: Date;
  duration?: number;
  partySize?: number;
  status?: string;
  notes?: string;
  specialRequests?: string;
}

export class BookingsService {
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
   * Create new booking
   */
  async createBooking(data: CreateBookingData) {
    try {
      // Check if slot is available
      const isAvailable = await this.checkAvailability(
        data.tenantId,
        data.dateTime,
        data.duration || 60
      );

      if (!isAvailable) {
        throw new AppError('Time slot not available', 400);
      }

      // Create booking
      const booking = await prisma.booking.create({
        data: {
          tenantId: data.tenantId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          serviceId: data.serviceId,
          serviceName: data.serviceName,
          dateTime: data.dateTime,
          duration: data.duration || 60,
          partySize: data.partySize,
          notes: data.notes,
          specialRequests: data.specialRequests,
          status: 'pending',
        },
      });

      logger.info('Booking created successfully', {
        bookingId: booking.id,
        tenantId: data.tenantId,
      });

      // Send confirmation email
      await this.sendBookingConfirmation(booking);

      // Add to Google Calendar (if configured)
      await this.addToGoogleCalendar(booking);

      return booking;
    } catch (error) {
      logger.error('Create booking error', { error });
      throw error;
    }
  }

  /**
   * Get all bookings for tenant
   */
  async getBookings(
    tenantId: string,
    filters?: {
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      customerPhone?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { tenantId };

      if (filters?.status) where.status = filters.status;
      if (filters?.customerPhone) where.customerPhone = filters.customerPhone;
      
      if (filters?.dateFrom || filters?.dateTo) {
        where.dateTime = {};
        if (filters.dateFrom) where.dateTime.gte = filters.dateFrom;
        if (filters.dateTo) where.dateTime.lte = filters.dateTo;
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          skip,
          take: limit,
          orderBy: { dateTime: 'desc' },
        }),
        prisma.booking.count({ where }),
      ]);

      return {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get bookings error', { error });
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: string, tenantId: string) {
    try {
      const booking = await prisma.booking.findFirst({
        where: { id, tenantId },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      return booking;
    } catch (error) {
      logger.error('Get booking by ID error', { error });
      throw error;
    }
  }

  /**
   * Update booking
   */
  async updateBooking(id: string, tenantId: string, data: UpdateBookingData) {
    try {
      const booking = await prisma.booking.findFirst({
        where: { id, tenantId },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      // If datetime changed, check availability
      if (data.dateTime && data.dateTime.getTime() !== booking.dateTime.getTime()) {
        const isAvailable = await this.checkAvailability(
          tenantId,
          data.dateTime,
          data.duration || booking.duration || 60,
          id // exclude current booking
        );

        if (!isAvailable) {
          throw new AppError('New time slot not available', 400);
        }
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info('Booking updated successfully', { bookingId: id, tenantId });

      // Update Google Calendar event
      if (booking.googleEventId && (data.dateTime || data.duration)) {
        await this.updateGoogleCalendarEvent(updated);
      }

      return updated;
    } catch (error) {
      logger.error('Update booking error', { error });
      throw error;
    }
  }

  /**
   * Confirm booking
   */
  async confirmBooking(id: string, tenantId: string) {
    try {
      const booking = await prisma.booking.findFirst({
        where: { id, tenantId },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      const confirmed = await prisma.booking.update({
        where: { id },
        data: {
          status: 'confirmed',
          confirmationSent: true,
        },
      });

      // Send confirmation email
      await this.sendBookingConfirmation(confirmed);

      logger.info('Booking confirmed', { bookingId: id });

      return confirmed;
    } catch (error) {
      logger.error('Confirm booking error', { error });
      throw error;
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(id: string, tenantId: string, reason?: string) {
    try {
      const booking = await prisma.booking.findFirst({
        where: { id, tenantId },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      const cancelled = await prisma.booking.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      // Send cancellation email
      await this.sendCancellationEmail(cancelled);

      // Remove from Google Calendar
      if (booking.googleEventId) {
        await this.removeFromGoogleCalendar(booking);
      }

      logger.info('Booking cancelled', { bookingId: id });

      return cancelled;
    } catch (error) {
      logger.error('Cancel booking error', { error });
      throw error;
    }
  }

  /**
   * Mark as no-show
   */
  async markNoShow(id: string, tenantId: string) {
    try {
      const booking = await prisma.booking.update({
        where: { id },
        data: { status: 'no_show' },
      });

      logger.info('Booking marked as no-show', { bookingId: id });

      return booking;
    } catch (error) {
      logger.error('Mark no-show error', { error });
      throw error;
    }
  }

  /**
   * Check availability for a time slot
   */
  async checkAvailability(
    tenantId: string,
    dateTime: Date,
    duration: number,
    excludeBookingId?: string
  ): Promise<boolean> {
    try {
      const startTime = new Date(dateTime);
      const endTime = new Date(dateTime.getTime() + duration * 60000);

      // Check for overlapping bookings
      const where: any = {
        tenantId,
        status: { in: ['pending', 'confirmed'] },
        dateTime: {
          gte: new Date(startTime.getTime() - 2 * 60 * 60000), // 2 hours before
          lte: endTime,
        },
      };

      if (excludeBookingId) {
        where.id = { not: excludeBookingId };
      }

      const overlappingBookings = await prisma.booking.findMany({ where });

      // Check for actual overlap
      for (const booking of overlappingBookings) {
        const existingStart = new Date(booking.dateTime);
        const existingEnd = new Date(
          booking.dateTime.getTime() + (booking.duration || 60) * 60000
        );

        if (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        ) {
          return false; // Overlap found
        }
      }

      return true; // Available
    } catch (error) {
      logger.error('Check availability error', { error });
      return false;
    }
  }

  /**
   * Get available time slots for a date
   */
  async getAvailableSlots(
    tenantId: string,
    date: Date,
    duration: number = 60
  ) {
    try {
      // Get tenant business hours
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { businessHours: true },
      });

      if (!tenant || !tenant.businessHours) {
        throw new AppError('Business hours not configured', 400);
      }

      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const hours = (tenant.businessHours as any)[dayOfWeek];

      if (!hours || !hours.open || !hours.close) {
        return { availableSlots: [], message: 'Closed on this day' };
      }

      // Generate time slots (every 30 minutes)
      const slots = [];
      const [openHour, openMinute] = hours.open.split(':').map(Number);
      const [closeHour, closeMinute] = hours.close.split(':').map(Number);

      let currentTime = new Date(date);
      currentTime.setHours(openHour, openMinute, 0, 0);

      const closeTime = new Date(date);
      closeTime.setHours(closeHour, closeMinute, 0, 0);

      while (currentTime < closeTime) {
        const isAvailable = await this.checkAvailability(
          tenantId,
          new Date(currentTime),
          duration
        );

        if (isAvailable) {
          slots.push({
            time: currentTime.toISOString(),
            available: true,
          });
        }

        currentTime = new Date(currentTime.getTime() + 30 * 60000); // +30 minutes
      }

      return { availableSlots: slots };
    } catch (error) {
      logger.error('Get available slots error', { error });
      throw error;
    }
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(tenantId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const where: any = { tenantId };

      if (dateFrom || dateTo) {
        where.dateTime = {};
        if (dateFrom) where.dateTime.gte = dateFrom;
        if (dateTo) where.dateTime.lte = dateTo;
      }

      const [
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        noShowBookings,
        byStatus,
      ] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.count({ where: { ...where, status: 'confirmed' } }),
        prisma.booking.count({ where: { ...where, status: 'cancelled' } }),
        prisma.booking.count({ where: { ...where, status: 'no_show' } }),
        prisma.booking.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
      ]);

      const noShowRate = totalBookings > 0 
        ? ((noShowBookings / totalBookings) * 100).toFixed(2)
        : 0;

      return {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        noShowBookings,
        noShowRate: parseFloat(noShowRate as string),
        byStatus,
      };
    } catch (error) {
      logger.error('Get booking stats error', { error });
      throw error;
    }
  }

  /**
   * Send booking confirmation email
   */
  private async sendBookingConfirmation(booking: any) {
    try {
      if (!booking.customerEmail) return;

      const html = `
        <h2>Booking Confirmation</h2>

        <p>Dear ${booking.customerName},</p>

        <p>Your booking has been confirmed!</p>

        <h3>Booking details:</h3>
        <ul>
          <li><strong>Service:</strong> ${booking.serviceName}</li>
          <li><strong>Date:</strong> ${new Date(booking.dateTime).toLocaleDateString('en-US')}</li>
          <li><strong>Time:</strong> ${new Date(booking.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
          ${booking.duration ? `<li><strong>Duration:</strong> ${booking.duration} minutes</li>` : ''}
          ${booking.partySize ? `<li><strong>Party size:</strong> ${booking.partySize}</li>` : ''}
          ${booking.specialRequests ? `<li><strong>Special requests:</strong> ${booking.specialRequests}</li>` : ''}
        </ul>

        <p><strong>Booking ID:</strong> ${booking.id}</p>

        <p>Please contact us to cancel or modify your booking.</p>

        <p>See you soon!</p>
      `;

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: booking.customerEmail,
        subject: 'Booking Confirmation',
        html,
      });

      logger.info('Booking confirmation sent', { bookingId: booking.id });
    } catch (error) {
      logger.error('Send confirmation error', { error });
    }
  }

  /**
   * Send cancellation email
   */
  private async sendCancellationEmail(booking: any) {
    try {
      if (!booking.customerEmail) return;

      const html = `
        <h2>Booking Cancelled</h2>

        <p>Dear ${booking.customerName},</p>

        <p>Your booking has been cancelled.</p>

        <h3>Cancelled booking:</h3>
        <ul>
          <li><strong>Service:</strong> ${booking.serviceName}</li>
          <li><strong>Date:</strong> ${new Date(booking.dateTime).toLocaleDateString('en-US')}</li>
          <li><strong>Time:</strong> ${new Date(booking.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
          ${booking.cancelReason ? `<li><strong>Reason:</strong> ${booking.cancelReason}</li>` : ''}
        </ul>

        <p>Please contact us to make a new booking.</p>
      `;

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: booking.customerEmail,
        subject: 'Booking Cancelled',
        html,
      });

      logger.info('Cancellation email sent', { bookingId: booking.id });
    } catch (error) {
      logger.error('Send cancellation error', { error });
    }
  }

  /**
   * Add booking to Google Calendar
   */
  private async addToGoogleCalendar(booking: any) {
    try {
      // TODO: Implement Google Calendar integration
      // This requires OAuth2 setup and calendar API
      logger.info('Google Calendar integration pending', { bookingId: booking.id });
    } catch (error) {
      logger.error('Add to Google Calendar error', { error });
    }
  }

  /**
   * Update Google Calendar event
   */
  private async updateGoogleCalendarEvent(booking: any) {
    try {
      // TODO: Implement
      logger.info('Google Calendar update pending', { bookingId: booking.id });
    } catch (error) {
      logger.error('Update Google Calendar error', { error });
    }
  }

  /**
   * Remove from Google Calendar
   */
  private async removeFromGoogleCalendar(booking: any) {
    try {
      // TODO: Implement
      logger.info('Google Calendar removal pending', { bookingId: booking.id });
    } catch (error) {
      logger.error('Remove from Google Calendar error', { error });
    }
  }
}

export default new BookingsService();
