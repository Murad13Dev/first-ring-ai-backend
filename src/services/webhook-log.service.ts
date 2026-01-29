import prisma from '../config/database';
import logger from '../config/logger';

export type WebhookSource = 'retell' | 'twilio' | 'stripe' | 'whop' | 'square';
export type WebhookStatus = 'received' | 'processed' | 'failed';

interface CreateWebhookLogData {
  source: WebhookSource;
  event: string;
  method?: string;
  path: string;
  headers?: Record<string, string>;
  body?: any;
  tenantId?: string;
  callId?: string;
}

interface UpdateWebhookLogData {
  status: WebhookStatus;
  statusCode?: number;
  responseBody?: any;
  error?: string;
  processingMs?: number;
}

// Headers to filter out (sensitive data)
const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'x-twilio-signature',
  'stripe-signature',
  'x-whop-signature',
];

export class WebhookLogService {
  /**
   * Filter out sensitive headers
   */
  private filterHeaders(headers: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        filtered[key] = value;
      } else {
        filtered[key] = '[REDACTED]';
      }
    }
    return filtered;
  }

  /**
   * Create a webhook log entry
   */
  async create(data: CreateWebhookLogData): Promise<string> {
    try {
      const log = await prisma.webhookLog.create({
        data: {
          source: data.source,
          event: data.event,
          method: data.method || 'POST',
          path: data.path,
          headers: data.headers ? this.filterHeaders(data.headers) : null,
          body: data.body || null,
          tenantId: data.tenantId || null,
          callId: data.callId || null,
          status: 'received',
        },
      });

      return log.id;
    } catch (error) {
      logger.error('Failed to create webhook log', { error, data });
      // Don't throw - logging shouldn't break webhook processing
      return '';
    }
  }

  /**
   * Update a webhook log with processing result
   */
  async update(logId: string, data: UpdateWebhookLogData): Promise<void> {
    if (!logId) return;

    try {
      await prisma.webhookLog.update({
        where: { id: logId },
        data: {
          status: data.status,
          statusCode: data.statusCode,
          responseBody: data.responseBody || null,
          error: data.error || null,
          processingMs: data.processingMs,
        },
      });
    } catch (error) {
      logger.error('Failed to update webhook log', { error, logId, data });
    }
  }

  /**
   * Get webhook logs with filtering
   */
  async getLogs(filters: {
    source?: WebhookSource;
    event?: string;
    status?: WebhookStatus;
    tenantId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.source) where.source = filters.source;
    if (filters.event) where.event = { contains: filters.event, mode: 'insensitive' };
    if (filters.status) where.status = filters.status;
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          source: true,
          event: true,
          method: true,
          path: true,
          status: true,
          statusCode: true,
          error: true,
          processingMs: true,
          tenantId: true,
          callId: true,
          createdAt: true,
        },
      }),
      prisma.webhookLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single webhook log by ID
   */
  async getById(id: string) {
    return prisma.webhookLog.findUnique({
      where: { id },
    });
  }

  /**
   * Get webhook statistics
   */
  async getStats(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, bySource, byStatus, recentErrors] = await Promise.all([
      prisma.webhookLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.webhookLog.groupBy({
        by: ['source'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.webhookLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.webhookLog.findMany({
        where: {
          status: 'failed',
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          source: true,
          event: true,
          error: true,
          createdAt: true,
        },
      }),
    ]);

    // Calculate average processing time
    const avgProcessingTime = await prisma.webhookLog.aggregate({
      where: {
        createdAt: { gte: startDate },
        processingMs: { not: null },
      },
      _avg: { processingMs: true },
    });

    return {
      period: `${days} days`,
      totalLogs,
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      avgProcessingTimeMs: Math.round(avgProcessingTime._avg.processingMs || 0),
      recentErrors,
    };
  }

  /**
   * Cleanup old logs (keep last 30 days by default)
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.webhookLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    logger.info('Webhook logs cleanup completed', {
      deletedCount: result.count,
      retentionDays,
    });

    return result.count;
  }
}

export const webhookLogService = new WebhookLogService();
export default webhookLogService;
