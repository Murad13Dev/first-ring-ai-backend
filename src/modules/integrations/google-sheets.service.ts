import { google } from 'googleapis';
import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

const sheets = google.sheets('v4');

interface SheetExportOptions {
  type: 'bookings' | 'orders' | 'calls' | 'leads';
  dateFrom?: Date;
  dateTo?: Date;
}

export class GoogleSheetsService {
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
        throw new AppError('Google Sheets not connected', 400);
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
   * Initialize OAuth2 flow
   */
  async getAuthUrl(tenantId: string) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      const scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: tenantId, // Pass tenant ID in state
        prompt: 'consent',
      });

      return url;
    } catch (error) {
      logger.error('Get auth URL error', { error });
      throw error;
    }
  }

  /**
   * Handle OAuth2 callback
   */
  async handleCallback(code: string, tenantId: string) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      const { tokens } = await oauth2Client.getToken(code);

      // Save tokens to database
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
        },
      });

      logger.info('Google Sheets connected', { tenantId });

      return { success: true };
    } catch (error) {
      logger.error('Handle callback error', { error });
      throw error;
    }
  }

  /**
   * Create new spreadsheet
   */
  async createSpreadsheet(tenantId: string, title: string) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const response = await sheets.spreadsheets.create({
        auth,
        requestBody: {
          properties: {
            title,
          },
          sheets: [
            {
              properties: {
                title: 'Data',
              },
            },
          ],
        },
      });

      const spreadsheetId = response.data.spreadsheetId!;

      // Save to tenant
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { googleSheetId: spreadsheetId },
      });

      logger.info('Spreadsheet created', { tenantId, spreadsheetId });

      return {
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
      };
    } catch (error) {
      logger.error('Create spreadsheet error', { error });
      throw error;
    }
  }

  /**
   * Export bookings to Google Sheets
   */
  async exportBookings(tenantId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const auth = await this.getAuthClient(tenantId);

      // Get tenant's sheet ID
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleSheetId: true },
      });

      if (!tenant?.googleSheetId) {
        throw new AppError('No spreadsheet configured', 400);
      }

      // Get bookings
      const where: any = { tenantId };
      if (dateFrom || dateTo) {
        where.dateTime = {};
        if (dateFrom) where.dateTime.gte = dateFrom;
        if (dateTo) where.dateTime.lte = dateTo;
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Prepare data
      const headers = [
        'ID',
        'Customer Name',
        'Phone',
        'Email',
        'Service',
        'Date',
        'Time',
        'Party Size',
        'Status',
        'Created At',
      ];

      const rows = bookings.map((b) => [
        b.id.slice(0, 8),
        b.customerName,
        b.customerPhone,
        b.customerEmail || '',
        b.serviceName,
        new Date(b.dateTime).toLocaleDateString(),
        new Date(b.dateTime).toLocaleTimeString(),
        b.partySize?.toString() || '',
        b.status,
        new Date(b.createdAt).toLocaleString(),
      ]);

      // Write to sheet
      const sheetName = `Bookings_${new Date().toISOString().split('T')[0]}`;

      // Create new sheet
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId: tenant.googleSheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      // Write data
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: tenant.googleSheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });

      logger.info('Bookings exported to Sheets', {
        tenantId,
        count: bookings.length,
      });

      return {
        sheetName,
        recordCount: bookings.length,
        url: `https://docs.google.com/spreadsheets/d/${tenant.googleSheetId}`,
      };
    } catch (error) {
      logger.error('Export bookings error', { error });
      throw error;
    }
  }

  /**
   * Export orders to Google Sheets
   */
  async exportOrders(tenantId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleSheetId: true },
      });

      if (!tenant?.googleSheetId) {
        throw new AppError('No spreadsheet configured', 400);
      }

      const where: any = { tenantId };
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'ID',
        'Customer',
        'Phone',
        'Items',
        'Subtotal',
        'Tax',
        'Total',
        'Payment Status',
        'Status',
        'Created At',
      ];

      const rows = orders.map((o) => [
        o.id.slice(0, 8),
        o.customerName || 'N/A',
        o.customerPhone,
        (o.items as any).length.toString(),
        o.subtotal.toFixed(2),
        o.tax.toFixed(2),
        o.total.toFixed(2),
        o.paymentStatus,
        o.status,
        new Date(o.createdAt).toLocaleString(),
      ]);

      const sheetName = `Orders_${new Date().toISOString().split('T')[0]}`;

      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId: tenant.googleSheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: tenant.googleSheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });

      logger.info('Orders exported to Sheets', {
        tenantId,
        count: orders.length,
      });

      return {
        sheetName,
        recordCount: orders.length,
        url: `https://docs.google.com/spreadsheets/d/${tenant.googleSheetId}`,
      };
    } catch (error) {
      logger.error('Export orders error', { error });
      throw error;
    }
  }

  /**
   * Export calls to Google Sheets
   */
  async exportCalls(tenantId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const auth = await this.getAuthClient(tenantId);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { googleSheetId: true },
      });

      if (!tenant?.googleSheetId) {
        throw new AppError('No spreadsheet configured', 400);
      }

      const where: any = { tenantId };
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const calls = await prisma.call.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const headers = [
        'From',
        'To',
        'Direction',
        'Duration (sec)',
        'Intent',
        'Outcome',
        'AI Confidence',
        'Sentiment',
        'Created At',
      ];

      const rows = calls.map((c) => [
        c.fromNumber,
        c.toNumber,
        c.direction,
        c.duration.toString(),
        c.intent || '',
        c.outcome || '',
        c.aiConfidence?.toFixed(2) || '',
        c.sentiment || '',
        new Date(c.createdAt).toLocaleString(),
      ]);

      const sheetName = `Calls_${new Date().toISOString().split('T')[0]}`;

      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId: tenant.googleSheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: tenant.googleSheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers, ...rows],
        },
      });

      logger.info('Calls exported to Sheets', {
        tenantId,
        count: calls.length,
      });

      return {
        sheetName,
        recordCount: calls.length,
        url: `https://docs.google.com/spreadsheets/d/${tenant.googleSheetId}`,
      };
    } catch (error) {
      logger.error('Export calls error', { error });
      throw error;
    }
  }

  /**
   * Auto-sync: Export data to Sheets daily
   */
  async autoSync(tenantId: string) {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Export yesterday's data
      await Promise.all([
        this.exportBookings(tenantId, yesterday, today),
        this.exportOrders(tenantId, yesterday, today),
        this.exportCalls(tenantId, yesterday, today),
      ]);

      logger.info('Auto-sync completed', { tenantId });

      return { success: true };
    } catch (error) {
      logger.error('Auto-sync error', { error });
      throw error;
    }
  }

  /**
   * Disconnect Google Sheets
   */
  async disconnect(tenantId: string) {
    try {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          googleAccessToken: null,
          googleRefreshToken: null,
          googleSheetId: null,
        },
      });

      logger.info('Google Sheets disconnected', { tenantId });

      return { success: true };
    } catch (error) {
      logger.error('Disconnect error', { error });
      throw error;
    }
  }
}

export default new GoogleSheetsService();
