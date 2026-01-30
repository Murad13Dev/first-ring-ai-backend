import prisma from '../config/database';
import logger from '../config/logger';
import { Request } from 'express';

export type ActorType = 'user' | 'admin' | 'system';
export type ActionType = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export' | 'import' | 'approve' | 'reject';
export type EntityType = 'tenant' | 'user' | 'lead' | 'booking' | 'order' | 'call' | 'agent' | 'service' | 'subscription' | 'invoice' | 'customer' | 'settings';

interface LogActivityParams {
  actorType: ActorType;
  actorId?: string;
  actorEmail?: string;
  tenantId?: string;
  action: ActionType;
  entityType: EntityType;
  entityId?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  req?: Request;
}

interface ActivityQuery {
  tenantId?: string;
  actorId?: string;
  action?: ActionType;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

class AuditService {
  /**
   * Log an activity/audit event
   */
  async log(params: LogActivityParams): Promise<void> {
    try {
      const {
        actorType,
        actorId,
        actorEmail,
        tenantId,
        action,
        entityType,
        entityId,
        changes,
        metadata,
        req,
      } = params;

      // Extract IP and user agent from request if provided
      const ipAddress = req
        ? (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || req.socket.remoteAddress
        : undefined;
      const userAgent = req ? req.headers['user-agent'] : undefined;

      await prisma.activityLog.create({
        data: {
          actorType,
          actorId,
          actorEmail,
          tenantId,
          action,
          entityType,
          entityId,
          changes: changes || undefined,
          metadata: metadata || undefined,
          ipAddress,
          userAgent,
        },
      });

      logger.debug('Audit log created', {
        actorType,
        action,
        entityType,
        entityId,
        tenantId,
      });
    } catch (error) {
      // Don't throw - audit logging shouldn't break the main operation
      logger.error('Failed to create audit log', { error, params });
    }
  }

  /**
   * Log user action with request context
   */
  async logUserAction(
    req: Request,
    action: ActionType,
    entityType: EntityType,
    entityId?: string,
    changes?: Record<string, { old: any; new: any }>,
    metadata?: Record<string, any>
  ): Promise<void> {
    const user = (req as any).user;

    await this.log({
      actorType: user?.role === 'admin' ? 'admin' : 'user',
      actorId: user?.id,
      actorEmail: user?.email,
      tenantId: user?.tenantId,
      action,
      entityType,
      entityId,
      changes,
      metadata,
      req,
    });
  }

  /**
   * Log system action
   */
  async logSystemAction(
    action: ActionType,
    entityType: EntityType,
    entityId?: string,
    tenantId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      actorType: 'system',
      tenantId,
      action,
      entityType,
      entityId,
      metadata,
    });
  }

  /**
   * Query activity logs
   */
  async getActivities(query: ActivityQuery) {
    const {
      tenantId,
      actorId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = query;

    const where: any = {};

    if (tenantId) where.tenantId = tenantId;
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get activity summary for a tenant
   */
  async getTenantActivitySummary(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [byAction, byEntityType, byActor, recentActivities] = await Promise.all([
      prisma.activityLog.groupBy({
        by: ['action'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.activityLog.groupBy({
        by: ['entityType'],
        where: { tenantId, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.activityLog.groupBy({
        by: ['actorEmail'],
        where: { tenantId, createdAt: { gte: startDate }, actorEmail: { not: null } },
        _count: true,
        orderBy: { _count: { actorEmail: 'desc' } },
        take: 10,
      }),
      prisma.activityLog.findMany({
        where: { tenantId },
        take: 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          actorType: true,
          actorEmail: true,
          action: true,
          entityType: true,
          entityId: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      period: `${days} days`,
      byAction: byAction.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byEntityType: byEntityType.reduce((acc, item) => {
        acc[item.entityType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      topActors: byActor.map((item) => ({
        email: item.actorEmail,
        actionCount: item._count,
      })),
      recentActivities,
    };
  }

  /**
   * Get entity history
   */
  async getEntityHistory(entityType: EntityType, entityId: string) {
    const activities = await prisma.activityLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return activities;
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.activityLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    logger.info('Audit logs cleanup completed', {
      deletedCount: result.count,
      retentionDays,
    });

    return result.count;
  }
}

export const auditService = new AuditService();
export default auditService;
