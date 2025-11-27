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

  // Get pending approval users
  async getPendingApprovalUsers(page: number = 1, limit: number = 20) {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          emailVerified: true,
          adminApproved: false,
          isActive: true,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              businessType: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({
        where: {
          emailVerified: true,
          adminApproved: false,
          isActive: true,
        },
      }),
    ]);

    return { users, total, page, pages: Math.ceil(total / limit) };
  },

  // Approve user
  async approveUser(userId: string, adminId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.emailVerified) {
      throw new Error('User email not verified');
    }

    if (user.adminApproved) {
      throw new Error('User already approved');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        adminApproved: true,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send approval confirmation email
    const { emailService } = require('../../services/email.service');
    try {
      await emailService.sendApprovalConfirmationEmail(updatedUser.email, updatedUser.name);
    } catch (emailError) {
      // Log error but don't fail the approval
      console.error('Failed to send approval email:', emailError);
    }

    return updatedUser;
  },

  // Reject user
  async rejectUser(userId: string, reason?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.adminApproved) {
      throw new Error('Cannot reject already approved user');
    }

    // Deactivate the user instead of deleting
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
      },
    });

    // TODO: Send rejection email with reason (optional enhancement)

    return updatedUser;
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

  async getPendingApprovalUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await adminDashboardService.getPendingApprovalUsers(
        Number(page),
        Number(limit)
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async approveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const adminId = (req as any).user?.id; // Get admin ID from auth middleware
      const user = await adminDashboardService.approveUser(userId, adminId);
      res.json({
        success: true,
        data: user,
        message: 'User approved successfully and confirmation email sent.',
      });
    } catch (error) {
      next(error);
    }
  },

  async rejectUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const user = await adminDashboardService.rejectUser(userId, reason);
      res.json({
        success: true,
        data: user,
        message: 'User rejected successfully.',
      });
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

// User approval management
router.get('/users/pending-approval', adminDashboardController.getPendingApprovalUsers);
router.post('/users/:userId/approve', adminDashboardController.approveUser);
router.post('/users/:userId/reject', adminDashboardController.rejectUser);

export default router;
