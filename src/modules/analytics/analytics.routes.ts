import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

const router = Router();

// ==========================================
// ANALYTICS SERVICE
// ==========================================

const analyticsService = {
  // Track event
  async trackEvent(data: {
    tenantId?: string;
    eventType: string;
    eventData?: any;
    callDuration?: number;
    callOutcome?: string;
    sentiment?: string;
  }) {
    return prisma.analyticsEvent.create({ data });
  },

  // Get events by tenant
  async getEvents(tenantId: string, eventType?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (eventType) where.eventType = eventType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return prisma.analyticsEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  },

  // Get aggregated analytics
  async getAggregated(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await prisma.analyticsEvent.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
    });

    // Group by event type
    const byType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Call metrics
    const callEvents = events.filter((e) => e.eventType === 'call_completed');
    const avgDuration = callEvents.length > 0
      ? callEvents.reduce((sum, e) => sum + (e.callDuration || 0), 0) / callEvents.length
      : 0;

    // Sentiment analysis
    const sentiments = events.reduce((acc, e) => {
      if (e.sentiment) {
        acc[e.sentiment] = (acc[e.sentiment] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Daily trends
    const dailyTrends: Record<string, number> = {};
    events.forEach((e) => {
      const date = e.createdAt.toISOString().slice(0, 10);
      dailyTrends[date] = (dailyTrends[date] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      byType,
      callMetrics: {
        total: callEvents.length,
        avgDuration,
      },
      sentiments,
      dailyTrends,
    };
  },

  // Get platform-wide analytics (admin)
  async getPlatformAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [events, tenantCount, callCount] = await Promise.all([
      (prisma.analyticsEvent.groupBy as any)({
        by: ['eventType'],
        where: { createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.tenant.count(),
      prisma.call.count({ where: { createdAt: { gte: startDate } } }),
    ]);

    return {
      eventsByType: events,
      totalTenants: tenantCount,
      totalCalls: callCount,
    };
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const analyticsController = {
  async trackEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const event = await analyticsService.trackEvent(req.body);
      res.status(201).json({ success: true, data: event });
    } catch (error) {
      next(error);
    }
  },

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { eventType, startDate, endDate } = req.query;
      const events = await analyticsService.getEvents(
        tenantId,
        eventType as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json({ success: true, data: events });
    } catch (error) {
      next(error);
    }
  },

  async getAggregated(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { days = 30 } = req.query;
      const analytics = await analyticsService.getAggregated(tenantId, Number(days));
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  },

  async getPlatformAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { days = 30 } = req.query;
      const analytics = await analyticsService.getPlatformAnalytics(Number(days));
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// ==========================================

router.post('/track', analyticsController.trackEvent);
router.get('/platform', analyticsController.getPlatformAnalytics);
router.get('/:tenantId', analyticsController.getAggregated);
router.get('/:tenantId/events', analyticsController.getEvents);

export default router;
