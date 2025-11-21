import { google } from 'googleapis';
import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

const calendar = google.calendar('v3');

export class GoogleCalendarService {
  /**
   * Get OAuth2 client for tenant
   */
  private async getAuthClient(tenantId: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          googleRefreshToken: true,
          googleAccessToken: true,
        },
      });

      if (!tenant || !tenant.googleRefreshToken) {
        throw new AppError('Google Calendar not connected', 400);
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: tenant.googleRefreshToken,
        access_token: tenant.googleAccessToken || undefined,
      });

      return oauth2Client;
    } catch (error) {
      logger.error('Get auth client error', { error });
      throw error;
    }
  }

  /**
   * Get OAuth URL (same as Sheets)
   */
  async getAuthUrl(tenantId: string) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: tenantId,
        prompt: 'consent',
      });

      return url;
    } catch (error) {
      logger.error('Get auth URL error', { error });
      throw error;
    }
  }

  /**
   * List calendars
   */
  async listCalendars(tenantId: string) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const response = await calendar.calendarList.list({
        auth,
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('List calendars error', { error });
      throw error;
    }
  }

  /**
   * Create calendar event from booking
   */
  async createEventFromBooking(bookingId: string, tenantId: string) {
    try {
      const auth = await this.getAuthClient(tenantId);

      // Get booking
      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
      });

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      // Get tenant calendar ID
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleCalendarId: true, name: true },
      });

      const calendarId = tenant?.googleCalendarId || 'primary';

      // Calculate end time
      const startTime = new Date(booking.dateTime);
      const endTime = new Date(
        startTime.getTime() + (booking.duration || 60) * 60000
      );

      // Create event
      const event = {
        summary: `Booking: ${booking.customerName}`,
        description: `
Customer: ${booking.customerName}
Phone: ${booking.customerPhone}
Service: ${booking.serviceName}
${booking.partySize ? `Party Size: ${booking.partySize}` : ''}
${booking.notes ? `Notes: ${booking.notes}` : ''}
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Baku',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Baku',
        },
        attendees: booking.customerEmail
          ? [{ email: booking.customerEmail }]
          : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
        colorId: '9', // Blue
      };

      const response = await calendar.events.insert({
        auth,
        calendarId,
        requestBody: event,
        sendUpdates: 'all',
      });

      // Save event ID to booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId: response.data.id },
      });

      logger.info('Calendar event created', {
        bookingId,
        eventId: response.data.id,
      });

      return {
        eventId: response.data.id,
        eventUrl: response.data.htmlLink,
      };
    } catch (error) {
      logger.error('Create event error', { error });
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateEvent(bookingId: string, tenantId: string) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
      });

      if (!booking || !booking.googleEventId) {
        throw new AppError('Booking or event not found', 404);
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleCalendarId: true },
      });

      const calendarId = tenant?.googleCalendarId || 'primary';

      const startTime = new Date(booking.dateTime);
      const endTime = new Date(
        startTime.getTime() + (booking.duration || 60) * 60000
      );

      const event = {
        summary: `Booking: ${booking.customerName}`,
        description: `
Customer: ${booking.customerName}
Phone: ${booking.customerPhone}
Service: ${booking.serviceName}
${booking.partySize ? `Party Size: ${booking.partySize}` : ''}
${booking.notes ? `Notes: ${booking.notes}` : ''}
Status: ${booking.status}
        `.trim(),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Baku',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Baku',
        },
      };

      await calendar.events.update({
        auth,
        calendarId,
        eventId: booking.googleEventId,
        requestBody: event,
        sendUpdates: 'all',
      });

      logger.info('Calendar event updated', {
        bookingId,
        eventId: booking.googleEventId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Update event error', { error });
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(bookingId: string, tenantId: string) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, tenantId },
      });

      if (!booking || !booking.googleEventId) {
        throw new AppError('Booking or event not found', 404);
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleCalendarId: true },
      });

      const calendarId = tenant?.googleCalendarId || 'primary';

      await calendar.events.delete({
        auth,
        calendarId,
        eventId: booking.googleEventId,
        sendUpdates: 'all',
      });

      // Remove event ID from booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId: null },
      });

      logger.info('Calendar event deleted', {
        bookingId,
        eventId: booking.googleEventId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Delete event error', { error });
      throw error;
    }
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(tenantId: string, days: number = 7) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleCalendarId: true },
      });

      const calendarId = tenant?.googleCalendarId || 'primary';

      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + days);

      const response = await calendar.events.list({
        auth,
        calendarId,
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      logger.error('Get upcoming events error', { error });
      throw error;
    }
  }

  /**
   * Check calendar availability
   */
  async checkAvailability(
    tenantId: string,
    dateTime: Date,
    duration: number
  ) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleCalendarId: true },
      });

      const calendarId = tenant?.googleCalendarId || 'primary';

      const startTime = new Date(dateTime);
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const response = await calendar.freebusy.query({
        auth,
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: calendarId }],
        },
      });

      const busy = response.data.calendars?.[calendarId]?.busy || [];

      return busy.length === 0;
    } catch (error) {
      logger.error('Check availability error', { error });
      throw error;
    }
  }

  /**
   * Sync all bookings to calendar
   */
  async syncAllBookings(tenantId: string) {
    try {
      // Get all confirmed bookings without event IDs
      const bookings = await prisma.booking.findMany({
        where: {
          tenantId,
          status: 'confirmed',
          googleEventId: null,
          dateTime: {
            gte: new Date(), // Future bookings only
          },
        },
      });

      const results = [];

      for (const booking of bookings) {
        try {
          const result = await this.createEventFromBooking(booking.id, tenantId);
          results.push({ bookingId: booking.id, success: true, ...result });
        } catch (error) {
          logger.error('Sync booking error', { bookingId: booking.id, error });
          results.push({ bookingId: booking.id, success: false });
        }
      }

      logger.info('Bookings synced to calendar', {
        tenantId,
        total: bookings.length,
        success: results.filter((r) => r.success).length,
      });

      return results;
    } catch (error) {
      logger.error('Sync all bookings error', { error });
      throw error;
    }
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(tenantId: string) {
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          googleCalendarId: null,
        },
      });

      logger.info('Google Calendar disconnected', { tenantId });

      return { success: true };
    } catch (error) {
      logger.error('Disconnect error', { error });
      throw error;
    }
  }
}

export default new GoogleCalendarService();
