import { Response } from 'express';
import exportService from './export.service';
import { AppError } from '../../middleware/error.middleware';
import { AuthRequest } from '../../middleware/auth.middleware';

export class ExportController {
  /**
   * Export bookings to CSV
   * GET /api/export/bookings
   */
  async exportBookings(req: AuthRequest, res: Response) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant ID required', 400);
    }

    const { dateFrom, dateTo } = req.query;
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const result = await exportService.exportBookingsCSV(tenantId, filters);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  /**
   * Export orders to CSV
   * GET /api/export/orders
   */
  async exportOrders(req: AuthRequest, res: Response) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant ID required', 400);
    }

    const { dateFrom, dateTo } = req.query;
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const result = await exportService.exportOrdersCSV(tenantId, filters);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  /**
   * Export calls to CSV
   * GET /api/export/calls
   */
  async exportCalls(req: AuthRequest, res: Response) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant ID required', 400);
    }

    const { dateFrom, dateTo } = req.query;
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const result = await exportService.exportCallsCSV(tenantId, filters);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  /**
   * Export leads to CSV (Admin only)
   * GET /api/admin/export/leads
   */
  async exportLeads(req: AuthRequest, res: Response) {
    const { dateFrom, dateTo } = req.query;
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const result = await exportService.exportLeadsCSV(filters);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  /**
   * Get export summary (record counts)
   * GET /api/export/summary
   */
  async getExportSummary(req: AuthRequest, res: Response) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant ID required', 400);
    }

    const { dateFrom, dateTo } = req.query;
    const filters = {
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    };

    const summary = await exportService.getExportSummary(tenantId, filters);

    res.json({
      success: true,
      data: summary,
    });
  }
}

export default new ExportController();
