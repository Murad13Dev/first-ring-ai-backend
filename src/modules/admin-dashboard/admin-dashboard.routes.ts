import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

const router = Router();

// ==========================================
// ADMIN DASHBOARD SERVICE
// ==========================================

const adminDashboardService = {
  // Get platform overview stats
  async getOverview() {
    const [
      totalTenants,
      activeTenants,
      totalCalls,
      totalRevenue,
      newTenantsThisMonth,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { subscriptionStatus: 'active' } }),
      prisma.call.count(),
      prisma.invoice.aggregate({
        where: { status: 'paid' },
        _sum: { total: true },
      }),
      prisma.tenant.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1)), // First day of month
          },
        },
      }),
    ]);

    return {
      totalTenants,
      activeTenants,
      totalCalls,
      totalRevenue: totalRevenue._sum.total || 0,
      newTenantsThisMonth,
      churnRate: totalTenants > 0 ? ((totalTenants - activeTenants) / totalTenants * 100).toFixed(2) : 0,
    };
  },

  // Get all tenants with details
  async getTenants(page: number = 1, limit: number = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { calls: true, bookings: true, orders: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tenant.count({ where }),
    ]);

    return { tenants, total, page, pages: Math.ceil(total / limit) };
  },

  // Get tenant details
  async getTenantDetails(tenantId: string) {
    return prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: { include: { plan: true } },
        users: true,
        _count: {
          select: {
            calls: true,
            bookings: true,
            orders: true,
            services: true,
          },
        },
      },
    });
  },

  // Get revenue analytics
  async getRevenueAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = { status: 'paid' };
    if (startDate) where.createdAt = { gte: startDate };
    if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyRevenue: Record<string, number> = {};
    invoices.forEach((inv) => {
      const month = inv.createdAt.toISOString().slice(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + inv.total;
    });

    return {
      total: invoices.reduce((sum, inv) => sum + inv.total, 0),
      byMonth: monthlyRevenue,
    };
  },

  // Get call analytics
  async getCallAnalytics() {
    const [totalCalls, callsByStatus, avgDuration] = await Promise.all([
      prisma.call.count(),
      (prisma.call.groupBy as any)({
        by: ['status'],
        _count: true,
      }),
      prisma.call.aggregate({
        _avg: { duration: true },
      }),
    ]);

    return {
      totalCalls,
      byStatus: callsByStatus,
      avgDuration: avgDuration._avg.duration || 0,
    };
  },

  // Get subscription analytics
  async getSubscriptionAnalytics() {
    const subscriptions = await (prisma.subscription.groupBy as any)({
      by: ['status'],
      _count: true,
    });

    const byPlan = await (prisma.subscription.groupBy as any)({
      by: ['planId'],
      _count: true,
    });

    return { byStatus: subscriptions, byPlan };
  },

  // Get recent activities
  async getRecentActivities(limit: number = 50) {
    const [calls, bookings, leads] = await Promise.all([
      prisma.call.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { name: true } } },
      }),
      prisma.booking.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { tenant: { select: { name: true } } },
      }),
      prisma.lead.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { calls, bookings, leads };
  },

  // Update tenant status
  async updateTenantStatus(tenantId: string, status: string) {
    return prisma.tenant.update({
      where: { id: tenantId },
      data: { subscriptionStatus: status },
    });
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const adminDashboardController = {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await adminDashboardService.getOverview();
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  },

  async getTenants(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const result = await adminDashboardService.getTenants(
        Number(page),
        Number(limit),
        search as string
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getTenantDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const tenant = await adminDashboardService.getTenantDetails(tenantId);
      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  },

  async getRevenueAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await adminDashboardService.getRevenueAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  },

  async getCallAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await adminDashboardService.getCallAnalytics();
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  },

  async getSubscriptionAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await adminDashboardService.getSubscriptionAnalytics();
      res.json({ success: true, data: analytics });
    } catch (error) {
      next(error);
    }
  },

  async getRecentActivities(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 50 } = req.query;
      const activities = await adminDashboardService.getRecentActivities(Number(limit));
      res.json({ success: true, data: activities });
    } catch (error) {
      next(error);
    }
  },

  async updateTenantStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { status } = req.body;
      const tenant = await adminDashboardService.updateTenantStatus(tenantId, status);
      res.json({ success: true, data: tenant });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// ==========================================

router.get('/overview', adminDashboardController.getOverview);
router.get('/tenants', adminDashboardController.getTenants);
router.get('/tenants/:tenantId', adminDashboardController.getTenantDetails);
router.put('/tenants/:tenantId/status', adminDashboardController.updateTenantStatus);
router.get('/analytics/revenue', adminDashboardController.getRevenueAnalytics);
router.get('/analytics/calls', adminDashboardController.getCallAnalytics);
router.get('/analytics/subscriptions', adminDashboardController.getSubscriptionAnalytics);
router.get('/activities', adminDashboardController.getRecentActivities);

export default router;
