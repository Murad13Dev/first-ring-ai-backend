import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

interface ExportFilters {
  dateFrom?: Date;
  dateTo?: Date;
}

interface ExportResult {
  data: string;
  filename: string;
  contentType: string;
  recordCount: number;
}

export class ExportService {
  /**
   * Export bookings to CSV
   */
  async exportBookingsCSV(tenantId: string, filters?: ExportFilters): Promise<ExportResult> {
    try {
      const where: any = { tenantId };
      if (filters?.dateFrom || filters?.dateTo) {
        where.dateTime = {};
        if (filters.dateFrom) where.dateTime.gte = filters.dateFrom;
        if (filters.dateTo) where.dateTime.lte = filters.dateTo;
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'Customer Name',
        'Phone',
        'Email',
        'Service',
        'Date',
        'Time',
        'Duration (min)',
        'Party Size',
        'Status',
        'Notes',
        'Created At',
      ];

      const rows = bookings.map((b) => [
        b.id,
        this.escapeCSV(b.customerName),
        b.customerPhone || '',
        b.customerEmail || '',
        this.escapeCSV(b.serviceName),
        new Date(b.dateTime).toLocaleDateString('en-US'),
        new Date(b.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        b.duration?.toString() || '60',
        b.partySize?.toString() || '',
        b.status,
        this.escapeCSV(b.notes || ''),
        new Date(b.createdAt).toLocaleString('en-US'),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const filename = `bookings_${new Date().toISOString().split('T')[0]}.csv`;

      logger.info('Bookings exported to CSV', { tenantId, count: bookings.length });

      return {
        data: csv,
        filename,
        contentType: 'text/csv',
        recordCount: bookings.length,
      };
    } catch (error) {
      logger.error('Export bookings CSV error', { error });
      throw error;
    }
  }

  /**
   * Export orders to CSV
   */
  async exportOrdersCSV(tenantId: string, filters?: ExportFilters): Promise<ExportResult> {
    try {
      const where: any = { tenantId };
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'Customer Name',
        'Phone',
        'Email',
        'Items Count',
        'Subtotal',
        'Tax',
        'Tip',
        'Discount',
        'Total',
        'Payment Status',
        'Payment Method',
        'Order Status',
        'Delivery Type',
        'Created At',
      ];

      const rows = orders.map((o) => [
        o.id,
        this.escapeCSV(o.customerName || 'N/A'),
        o.customerPhone,
        o.customerEmail || '',
        Array.isArray(o.items) ? (o.items as any[]).length.toString() : '0',
        o.subtotal.toFixed(2),
        o.tax.toFixed(2),
        o.tip.toFixed(2),
        o.discount.toFixed(2),
        o.total.toFixed(2),
        o.paymentStatus,
        o.paymentMethod || '',
        o.status,
        o.deliveryType || '',
        new Date(o.createdAt).toLocaleString('en-US'),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;

      logger.info('Orders exported to CSV', { tenantId, count: orders.length });

      return {
        data: csv,
        filename,
        contentType: 'text/csv',
        recordCount: orders.length,
      };
    } catch (error) {
      logger.error('Export orders CSV error', { error });
      throw error;
    }
  }

  /**
   * Export calls to CSV
   */
  async exportCallsCSV(tenantId: string, filters?: ExportFilters): Promise<ExportResult> {
    try {
      const where: any = { tenantId };
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const calls = await prisma.call.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'From Number',
        'To Number',
        'Direction',
        'Duration (sec)',
        'Intent',
        'Outcome',
        'AI Confidence',
        'Sentiment',
        'Summary',
        'Created At',
      ];

      const rows = calls.map((c) => [
        c.id,
        c.fromNumber,
        c.toNumber,
        c.direction,
        c.duration.toString(),
        c.intent || '',
        c.outcome || '',
        c.aiConfidence?.toFixed(2) || '',
        c.sentiment || '',
        this.escapeCSV(c.summary || ''),
        new Date(c.createdAt).toLocaleString('en-US'),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const filename = `calls_${new Date().toISOString().split('T')[0]}.csv`;

      logger.info('Calls exported to CSV', { tenantId, count: calls.length });

      return {
        data: csv,
        filename,
        contentType: 'text/csv',
        recordCount: calls.length,
      };
    } catch (error) {
      logger.error('Export calls CSV error', { error });
      throw error;
    }
  }

  /**
   * Export leads to CSV
   */
  async exportLeadsCSV(filters?: ExportFilters): Promise<ExportResult> {
    try {
      const where: any = {};
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'Contact Name',
        'Email',
        'Phone',
        'Business Name',
        'Business Type',
        'Source',
        'Selected Plan',
        'Status',
        'Priority',
        'Qualification Score',
        'Created At',
      ];

      const rows = leads.map((l) => [
        l.id,
        this.escapeCSV(l.contactName),
        l.email,
        l.phone,
        this.escapeCSV(l.businessName),
        l.businessType,
        l.source,
        l.selectedPlan,
        l.status,
        l.priority,
        l.qualificationScore?.toString() || '',
        new Date(l.createdAt).toLocaleString('en-US'),
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const filename = `leads_${new Date().toISOString().split('T')[0]}.csv`;

      logger.info('Leads exported to CSV', { count: leads.length });

      return {
        data: csv,
        filename,
        contentType: 'text/csv',
        recordCount: leads.length,
      };
    } catch (error) {
      logger.error('Export leads CSV error', { error });
      throw error;
    }
  }

  /**
   * Export all data for a tenant (combined report)
   */
  async exportAllDataCSV(tenantId: string, filters?: ExportFilters): Promise<ExportResult[]> {
    try {
      const [bookings, orders, calls] = await Promise.all([
        this.exportBookingsCSV(tenantId, filters),
        this.exportOrdersCSV(tenantId, filters),
        this.exportCallsCSV(tenantId, filters),
      ]);

      logger.info('All data exported', { tenantId });

      return [bookings, orders, calls];
    } catch (error) {
      logger.error('Export all data error', { error });
      throw error;
    }
  }

  /**
   * Get export summary/stats
   */
  async getExportSummary(tenantId: string, filters?: ExportFilters) {
    try {
      const where: any = { tenantId };
      const dateWhere: any = {};

      if (filters?.dateFrom || filters?.dateTo) {
        if (filters.dateFrom) dateWhere.gte = filters.dateFrom;
        if (filters.dateTo) dateWhere.lte = filters.dateTo;
      }

      const [bookingsCount, ordersCount, callsCount] = await Promise.all([
        prisma.booking.count({
          where: {
            ...where,
            ...(Object.keys(dateWhere).length > 0 ? { dateTime: dateWhere } : {}),
          },
        }),
        prisma.order.count({
          where: {
            ...where,
            ...(Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {}),
          },
        }),
        prisma.call.count({
          where: {
            ...where,
            ...(Object.keys(dateWhere).length > 0 ? { createdAt: dateWhere } : {}),
          },
        }),
      ]);

      return {
        bookingsCount,
        ordersCount,
        callsCount,
        totalRecords: bookingsCount + ordersCount + callsCount,
        filters: {
          dateFrom: filters?.dateFrom?.toISOString() || null,
          dateTo: filters?.dateTo?.toISOString() || null,
        },
      };
    } catch (error) {
      logger.error('Get export summary error', { error });
      throw error;
    }
  }

  /**
   * Escape CSV field
   */
  private escapeCSV(value: string): string {
    if (!value) return '';
    // If value contains comma, newline, or quote, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

export default new ExportService();
