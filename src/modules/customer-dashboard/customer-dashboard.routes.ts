import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import {
  calculateOverageCharges,
  calculateUsagePercentage,
  getUsageStatus
} from '../../utils/billing.utils';

const router = Router();

// ==========================================
// CUSTOMER DASHBOARD SERVICE
// ==========================================

const customerDashboardService = {
  // Get dashboard overview for tenant (includes agent info)
  async getOverview(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      tenant,
      subscription,
      callsThisMonth,
      bookingsThisMonth,
      ordersThisMonth,
      usage,
    ] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          businessType: true,
          retellAgentId: true,
          twilioNumber: true,
          agents: {
            select: {
              id: true,
              name: true,
              retellAgentId: true,
              voiceGender: true,
              voiceId: true,
              language: true,
              temperature: true,
              enabledTools: true,
              phoneNumber: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.subscription.findUnique({
        where: { tenantId },
        include: { plan: true },
      }),
      prisma.call.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.booking.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.order.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.usageRecord.findFirst({
        where: { tenantId, periodStart: startOfMonth },
      }),
    ]);

    // Calculate overage if usage exists
    const usageData = usage || {
      callMinutes: 0,
      callCount: 0,
      callMinutesLimit: subscription?.plan?.callMinutes || 0,
      callCountLimit: subscription?.plan?.maxCalls || 0,
      overageMinutes: 0,
      overageCharges: 0,
    };

    let overageInfo = null;
    if (subscription?.plan && usageData.callMinutes > 0) {
      const overageRate = subscription.plan.overageRatePerMinute || 0;
      const overageCalc = calculateOverageCharges(
        usageData.callMinutes,
        subscription.plan.callMinutes,
        overageRate
      );

      overageInfo = {
        ...overageCalc,
        usagePercentage: calculateUsagePercentage(
          usageData.callMinutes,
          subscription.plan.callMinutes
        ),
        usageStatus: getUsageStatus(
          usageData.callMinutes,
          subscription.plan.callMinutes
        ),
      };
    }

    // Build agents info for this tenant
    const agents = tenant?.agents?.map((a) => {
      const effectiveGender = a.voiceGender || 'male';
      const defaultVoiceId = effectiveGender === 'female' ? '11labs-Emily' : '11labs-Adrian';
      return {
        id: a.id,
        retellAgentId: a.retellAgentId,
        name: a.name || `${tenant.name} AI Agent`,
        voiceGender: effectiveGender,
        voiceId: a.voiceId || defaultVoiceId,
        language: a.language,
        temperature: a.temperature,
        enabledTools: a.enabledTools || ['booking', 'ordering', 'faq', 'check_availability'],
        phoneNumber: a.phoneNumber,
        isActive: a.isActive,
      };
    }) || [];

    return {
      subscription,
      agents,
      agentCount: agents.length,
      stats: {
        callsThisMonth,
        bookingsThisMonth,
        ordersThisMonth,
      },
      usage: usageData,
      overage: overageInfo,
    };
  },

  // Get call history
  async getCallHistory(tenantId: string, page: number = 1, limit: number = 20) {
    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.call.count({ where: { tenantId } }),
    ]);

    return { calls, total, page, pages: Math.ceil(total / limit) };
  },

  // Get call analytics
  async getCallAnalytics(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await prisma.call.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate },
      },
      select: {
        duration: true,
        outcome: true,
        createdAt: true,
      },
    });

    // Group by date
    const byDate: Record<string, number> = {};
    calls.forEach((call) => {
      const date = call.createdAt.toISOString().slice(0, 10);
      byDate[date] = (byDate[date] || 0) + 1;
    });

    // By outcome
    const byStatus = calls.reduce((acc, call) => {
      const outcome = call.outcome || 'unknown';
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: calls.length,
      avgDuration: calls.length > 0
        ? calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length
        : 0,
      byDate,
      byStatus,
    };
  },

  // Get usage history
  async getUsageHistory(tenantId: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return prisma.usageRecord.findMany({
      where: {
        tenantId,
        periodStart: { gte: startDate },
      },
      orderBy: { periodStart: 'desc' },
    });
  },

  // Get invoices
  async getInvoices(tenantId: string, page: number = 1, limit: number = 20) {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { tenantId },
        include: { items: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.invoice.count({ where: { tenantId } }),
    ]);

    return { invoices, total, page, pages: Math.ceil(total / limit) };
  },

  // Get notifications
  async getNotifications(tenantId: string, unreadOnly: boolean = false) {
    return prisma.notification.findMany({
      where: {
        tenantId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  // Mark notification as read
  async markNotificationRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  // Get recent activities
  async getRecentActivities(tenantId: string, limit: number = 20) {
    const [calls, bookings, orders] = await Promise.all([
      prisma.call.findMany({
        where: { tenantId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fromNumber: true,
          duration: true,
          outcome: true,
          createdAt: true,
        },
      }),
      prisma.booking.findMany({
        where: { tenantId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          dateTime: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { tenantId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          customerName: true,
          total: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Merge and sort by date
    const activities = [
      ...calls.map((c) => ({ ...c, type: 'call' })),
      ...bookings.map((b) => ({ ...b, type: 'booking' })),
      ...orders.map((o) => ({ ...o, type: 'order' })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return activities.slice(0, limit);
  },

  // Get real-time stats (today's numbers)
  async getRealTimeStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      callsToday,
      bookingsToday,
      ordersToday,
      totalCallMinutesToday,
      revenueToday,
      activeAgents,
    ] = await Promise.all([
      prisma.call.count({
        where: { tenantId, createdAt: { gte: today } },
      }),
      prisma.booking.count({
        where: { tenantId, createdAt: { gte: today } },
      }),
      prisma.order.count({
        where: { tenantId, createdAt: { gte: today } },
      }),
      prisma.call.aggregate({
        where: { tenantId, createdAt: { gte: today } },
        _sum: { duration: true },
      }),
      prisma.order.aggregate({
        where: { tenantId, paymentStatus: 'paid', createdAt: { gte: today } },
        _sum: { total: true },
      }),
      prisma.agent.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    return {
      today: {
        calls: callsToday,
        bookings: bookingsToday,
        orders: ordersToday,
        callMinutes: Math.round((totalCallMinutesToday._sum.duration || 0) / 60),
        revenue: revenueToday._sum.total || 0,
      },
      activeAgents,
      timestamp: new Date().toISOString(),
    };
  },

  // Get comparison stats (this period vs previous period)
  async getComparisonStats(tenantId: string, period: 'day' | 'week' | 'month' = 'week') {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'day':
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(currentStart);
        break;
      case 'week':
        const dayOfWeek = now.getDay();
        currentStart = new Date(now);
        currentStart.setDate(now.getDate() - dayOfWeek);
        currentStart.setHours(0, 0, 0, 0);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        break;
      case 'month':
      default:
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(currentStart);
        break;
    }

    const [currentCalls, previousCalls, currentBookings, previousBookings, currentOrders, previousOrders, currentRevenue, previousRevenue] = await Promise.all([
      prisma.call.count({
        where: { tenantId, createdAt: { gte: currentStart } },
      }),
      prisma.call.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      prisma.booking.count({
        where: { tenantId, createdAt: { gte: currentStart } },
      }),
      prisma.booking.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      prisma.order.count({
        where: { tenantId, createdAt: { gte: currentStart } },
      }),
      prisma.order.count({
        where: { tenantId, createdAt: { gte: previousStart, lt: previousEnd } },
      }),
      prisma.order.aggregate({
        where: { tenantId, paymentStatus: 'paid', createdAt: { gte: currentStart } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { tenantId, paymentStatus: 'paid', createdAt: { gte: previousStart, lt: previousEnd } },
        _sum: { total: true },
      }),
    ]);

    const calculateChange = (current: number, previous: number): { value: number; percentage: number; trend: 'up' | 'down' | 'stable' } => {
      if (previous === 0) {
        return { value: current, percentage: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'stable' };
      }
      const percentage = Math.round(((current - previous) / previous) * 100);
      return {
        value: current - previous,
        percentage,
        trend: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable',
      };
    };

    return {
      period,
      calls: {
        current: currentCalls,
        previous: previousCalls,
        change: calculateChange(currentCalls, previousCalls),
      },
      bookings: {
        current: currentBookings,
        previous: previousBookings,
        change: calculateChange(currentBookings, previousBookings),
      },
      orders: {
        current: currentOrders,
        previous: previousOrders,
        change: calculateChange(currentOrders, previousOrders),
      },
      revenue: {
        current: currentRevenue._sum.total || 0,
        previous: previousRevenue._sum.total || 0,
        change: calculateChange(currentRevenue._sum.total || 0, previousRevenue._sum.total || 0),
      },
    };
  },

  // Get peak hours analysis
  async getPeakHoursAnalysis(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await prisma.call.findMany({
      where: { tenantId, createdAt: { gte: startDate } },
      select: { createdAt: true, duration: true },
    });

    // Group by hour of day
    const hourlyStats: Record<number, { count: number; totalDuration: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyStats[i] = { count: 0, totalDuration: 0 };
    }

    calls.forEach((call) => {
      const hour = call.createdAt.getHours();
      hourlyStats[hour].count++;
      hourlyStats[hour].totalDuration += call.duration || 0;
    });

    // Find peak hours
    const sortedHours = Object.entries(hourlyStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        displayHour: `${parseInt(hour).toString().padStart(2, '0')}:00`,
        calls: stats.count,
        avgDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
      }));

    return {
      hourlyBreakdown: Object.entries(hourlyStats).map(([hour, stats]) => ({
        hour: parseInt(hour),
        displayHour: `${parseInt(hour).toString().padStart(2, '0')}:00`,
        calls: stats.count,
        avgDuration: stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0,
      })),
      peakHours: sortedHours.slice(0, 5),
      quietHours: sortedHours.slice(-5).reverse(),
      periodDays: days,
    };
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const customerDashboardController = {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const overview = await customerDashboardService.getOverview(tenantId);
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  },

  async getCallHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const result = await customerDashboardService.getCallHistory(
        tenantId,
        Number(page),
        Number(limit)
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getCallAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { days = 30 } = req.query;
      const analytics = await customerDashboardService.getCallAnalytics(
        tenantId,
        Number(days)
      );
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  },

  async getUsageHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { months = 6 } = req.query;
      const usage = await customerDashboardService.getUsageHistory(
        tenantId,
        Number(months)
      );
      res.json({ success: true, data: usage });
    } catch (error) {
      next(error);
    }
  },

  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const result = await customerDashboardService.getInvoices(
        tenantId,
        Number(page),
        Number(limit)
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { unreadOnly } = req.query;
      const notifications = await customerDashboardService.getNotifications(
        tenantId,
        unreadOnly === 'true'
      );
      res.json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  },

  async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { notificationId } = req.params;
      const notification = await customerDashboardService.markNotificationRead(notificationId);
      res.json({ success: true, data: notification });
    } catch (error) {
      next(error);
    }
  },

  async getRecentActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { limit = 20 } = req.query;
      const activities = await customerDashboardService.getRecentActivities(
        tenantId,
        Number(limit)
      );
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },

  async getRealTimeStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const stats = await customerDashboardService.getRealTimeStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  async getComparisonStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { period = 'week' } = req.query;
      const stats = await customerDashboardService.getComparisonStats(
        tenantId,
        period as 'day' | 'week' | 'month'
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },

  async getPeakHoursAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { days = 30 } = req.query;
      const analysis = await customerDashboardService.getPeakHoursAnalysis(
        tenantId,
        Number(days)
      );
      res.json({ success: true, data: analysis });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// ==========================================

router.get('/:tenantId/overview', customerDashboardController.getOverview);
router.get('/:tenantId/calls', customerDashboardController.getCallHistory);
router.get('/:tenantId/calls/analytics', customerDashboardController.getCallAnalytics);
router.get('/:tenantId/usage', customerDashboardController.getUsageHistory);
router.get('/:tenantId/invoices', customerDashboardController.getInvoices);
router.get('/:tenantId/notifications', customerDashboardController.getNotifications);
router.put('/notifications/:notificationId/read', customerDashboardController.markNotificationRead);
router.get('/:tenantId/activities', customerDashboardController.getRecentActivities);
router.get('/:tenantId/realtime', customerDashboardController.getRealTimeStats);
router.get('/:tenantId/comparison', customerDashboardController.getComparisonStats);
router.get('/:tenantId/peak-hours', customerDashboardController.getPeakHoursAnalysis);

export default router;
