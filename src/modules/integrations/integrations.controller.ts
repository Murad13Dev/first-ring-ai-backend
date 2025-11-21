import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import googleSheetsService from './google-sheets.service';
import googleCalendarService from './google-calendar.service';

export class IntegrationsController {
  // Google Sheets
  async getSheetsAuthUrl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const url = await googleSheetsService.getAuthUrl(tenantId);
      return res.status(200).json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  async handleSheetsCallback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      const result = await googleSheetsService.handleCallback(code as string, state as string);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async createSpreadsheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { title } = req.body;
      const result = await googleSheetsService.createSpreadsheet(tenantId, title || 'First Ring AI Data');
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateFrom, dateTo } = req.query;
      const result = await googleSheetsService.exportBookings(
        tenantId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateFrom, dateTo } = req.query;
      const result = await googleSheetsService.exportOrders(
        tenantId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async exportCalls(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateFrom, dateTo } = req.query;
      const result = await googleSheetsService.exportCalls(
        tenantId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async disconnectSheets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      await googleSheetsService.disconnect(tenantId);
      return res.status(200).json({ success: true, message: 'Disconnected' });
    } catch (error) {
      next(error);
    }
  }

  // Google Calendar
  async getCalendarAuthUrl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const url = await googleCalendarService.getAuthUrl(tenantId);
      return res.status(200).json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  async listCalendars(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const calendars = await googleCalendarService.listCalendars(tenantId);
      return res.status(200).json({ success: true, data: calendars });
    } catch (error) {
      next(error);
    }
  }

  async createCalendarEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { bookingId } = req.body;
      const result = await googleCalendarService.createEventFromBooking(bookingId, tenantId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getUpcomingEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { days } = req.query;
      const events = await googleCalendarService.getUpcomingEvents(
        tenantId,
        days ? parseInt(days as string) : 7
      );
      return res.status(200).json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  }

  async syncAllBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const results = await googleCalendarService.syncAllBookings(tenantId);
      return res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }

  async disconnectCalendar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      await googleCalendarService.disconnect(tenantId);
      return res.status(200).json({ success: true, message: 'Disconnected' });
    } catch (error) {
      next(error);
    }
  }
}

export default new IntegrationsController();
