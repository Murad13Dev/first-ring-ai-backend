import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

interface CreateCallData {
  tenantId: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  recordingUrl?: string;
  transcript?: string;
  intent?: string;
  outcome?: string;
  aiConfidence?: number;
  sentiment?: string;
  bookingId?: string;
  orderId?: string;
  leadId?: string;
  metadata?: any;
}

export class CallsService {
  async createCall(data: CreateCallData) {
    try {
      const call = await prisma.call.create({ data });
      logger.info('Call logged', { callId: call.id, tenantId: data.tenantId });
      return call;
    } catch (error) {
      logger.error('Create call error', { error });
      throw error;
    }
  }

  async getCalls(tenantId: string, filters?: {
    intent?: string;
    outcome?: string;
    direction?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { tenantId };
      if (filters?.intent) where.intent = filters.intent;
      if (filters?.outcome) where.outcome = filters.outcome;
      if (filters?.direction) where.direction = filters.direction;
      
      if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) where.createdAt.lte = filters.dateTo;
      }

      const [calls, total] = await Promise.all([
        prisma.call.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
        prisma.call.count({ where }),
      ]);

      return {
        calls,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      logger.error('Get calls error', { error });
      throw error;
    }
  }

  async getCallById(id: string, tenantId: string) {
    try {
      const call = await prisma.call.findFirst({ where: { id, tenantId } });
      if (!call) throw new AppError('Call not found', 404);
      return call;
    } catch (error) {
      logger.error('Get call by ID error', { error });
      throw error;
    }
  }

  async getCallStats(tenantId: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const where: any = { tenantId };
      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt.gte = dateFrom;
        if (dateTo) where.createdAt.lte = dateTo;
      }

      const [totalCalls, totalDuration, byIntent, byOutcome, avgDuration] = await Promise.all([
        prisma.call.count({ where }),
        prisma.call.aggregate({ where, _sum: { duration: true } }),
        prisma.call.groupBy({ by: ['intent'], where, _count: true }),
        prisma.call.groupBy({ by: ['outcome'], where, _count: true }),
        prisma.call.aggregate({ where, _avg: { duration: true } }),
      ]);

      return {
        totalCalls,
        totalDuration: totalDuration._sum.duration || 0,
        avgDuration: avgDuration._avg.duration || 0,
        byIntent,
        byOutcome,
      };
    } catch (error) {
      logger.error('Get call stats error', { error });
      throw error;
    }
  }
}

export default new CallsService();
