import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import bookingsService from './bookings.service';

export class BookingsController {
  async createBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const {
        customerName,
        customerPhone,
        customerEmail,
        serviceId,
        serviceName,
        dateTime,
        duration,
        partySize,
        notes,
        specialRequests,
      } = req.body;

      if (!customerName || !customerPhone || !serviceName || !dateTime) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: customerName, customerPhone, serviceName, dateTime',
        });
      }

      const booking = await bookingsService.createBooking({
        tenantId,
        customerName,
        customerPhone,
        customerEmail,
        serviceId,
        serviceName,
        dateTime: new Date(dateTime),
        duration,
        partySize,
        notes,
        specialRequests,
      });

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { status, dateFrom, dateTo, customerPhone, page, limit } = req.query;

      const result = await bookingsService.getBookings(tenantId, {
        status: status as string,
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        customerPhone: customerPhone as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      // Prevent caching to ensure fresh booking data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const booking = await bookingsService.getBookingById(id, tenantId);

      // Prevent caching to ensure fresh booking data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      return res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const data = req.body;

      if (data.dateTime) {
        data.dateTime = new Date(data.dateTime);
      }

      const booking = await bookingsService.updateBooking(id, tenantId, data);

      return res.status(200).json({
        success: true,
        message: 'Booking updated successfully',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const booking = await bookingsService.confirmBooking(id, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Booking confirmed',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const { reason } = req.body;

      const booking = await bookingsService.cancelBooking(id, tenantId, reason);

      return res.status(200).json({
        success: true,
        message: 'Booking cancelled',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async markNoShow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const booking = await bookingsService.markNoShow(id, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Booking marked as no-show',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  async checkAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateTime, duration } = req.query;

      if (!dateTime) {
        return res.status(400).json({
          success: false,
          message: 'dateTime is required',
        });
      }

      const isAvailable = await bookingsService.checkAvailability(
        tenantId,
        new Date(dateTime as string),
        duration ? parseInt(duration as string) : 60
      );

      return res.status(200).json({
        success: true,
        data: { available: isAvailable },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableSlots(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { date, duration } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'date is required',
        });
      }

      const result = await bookingsService.getAvailableSlots(
        tenantId,
        new Date(date as string),
        duration ? parseInt(duration as string) : 60
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBookingStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateFrom, dateTo } = req.query;

      const stats = await bookingsService.getBookingStats(
        tenantId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      // Prevent caching to ensure fresh booking statistics
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new BookingsController();
