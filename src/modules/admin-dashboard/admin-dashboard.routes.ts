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

  // Get tenant orders (for admin to send payment links)
  async getTenantOrders(tenantId: string, paymentStatus?: string) {
    const where: any = { tenantId };

    // Filter by payment status if provided (e.g., 'pending')
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50 orders
    });

    return orders;
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

  // Get all agents across all tenants (Admin)
  async getAllAgents(page: number = 1, limit: number = 20, search?: string) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tenant: { name: { contains: search, mode: 'insensitive' } } },
        { tenant: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true,
              businessType: true,
              plan: true,
              subscriptionStatus: true,
            },
          },
          _count: { select: { calls: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.agent.count({ where }),
    ]);

    const result = agents.map((a) => {
      const effectiveGender = a.voiceGender || 'male';
      const defaultVoiceId = effectiveGender === 'female' ? '11labs-Emily' : '11labs-Adrian';
      return {
        id: a.id,
        tenantId: a.tenant.id,
        tenantName: a.tenant.name,
        tenantEmail: a.tenant.email,
        businessType: a.tenant.businessType,
        plan: a.tenant.plan,
        subscriptionStatus: a.tenant.subscriptionStatus,
        agent: {
          retellAgentId: a.retellAgentId,
          name: a.name || `${a.tenant.name} AI Agent`,
          phoneNumber: a.phoneNumber,
          voiceGender: effectiveGender,
          voiceId: a.voiceId || defaultVoiceId,
          language: a.language,
          temperature: a.temperature,
          enabledTools: a.enabledTools || [],
          hasCustomPrompt: !!a.systemPrompt,
          isActive: a.isActive,
        },
        callCount: a._count.calls,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    return { agents: result, total, page, pages: Math.ceil(total / limit) };
  },

  // Populate test data for production testing
  async populateTestData() {
    const timestamp = Date.now();
    const results: any = { created: {} };

    // 1. Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: `Test Spa & Wellness ${timestamp}`,
        businessType: 'salon',
        email: `test-${timestamp}@spa.com`,
        phone: '+1234567890',
        address: '123 Main Street, New York',
        city: 'New York',
        country: 'United States',
        plan: 'professional',
        subscriptionStatus: 'active',
      },
    });

    // Create test agent for the tenant
    await prisma.agent.create({
      data: {
        tenantId: tenant.id,
        retellAgentId: `agent_test_${timestamp}`,
        name: `Test Spa & Wellness ${timestamp} AI Agent`,
        voiceGender: 'male',
        language: 'en-US',
        temperature: 0.7,
        enabledTools: ['booking', 'ordering', 'faq', 'check_availability'],
      },
    });

    results.created.tenant = tenant.id;

    // 2. Create test call logs
    const callLogs = await prisma.$transaction([
      prisma.callLog.create({
        data: {
          callId: `call_${timestamp}_1`,
          fromNumber: '+1234567001',
          toNumber: '+1234567890',
          status: 'ended',
          duration: 180,
          transcript: 'Customer: Hi, I would like to book a massage appointment. Agent: Sure, what day works for you?',
          summary: 'Customer requested massage appointment',
          sentiment: 'positive',
          tenantId: tenant.id,
          startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          endedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      }),
      prisma.callLog.create({
        data: {
          callId: `call_${timestamp}_2`,
          fromNumber: '+1234567002',
          toNumber: '+1234567890',
          status: 'ended',
          duration: 120,
          transcript: 'Customer: What are your hours? Agent: We are open from 9 AM to 8 PM daily.',
          summary: 'Customer inquired about business hours',
          sentiment: 'neutral',
          tenantId: tenant.id,
          startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
          endedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
      }),
      prisma.callLog.create({
        data: {
          callId: `call_${timestamp}_3`,
          fromNumber: '+1234567003',
          toNumber: '+1234567890',
          status: 'ended',
          duration: 240,
          transcript: 'Customer: I want to book a facial treatment. Agent: Great! We have availability this week.',
          summary: 'Customer booked facial treatment',
          sentiment: 'positive',
          tenantId: tenant.id,
          startedAt: new Date(Date.now() - 30 * 60 * 1000),
          endedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
      }),
    ]);
    results.created.callLogs = callLogs.length;

    // 3. Create Call records for analytics
    const calls = await prisma.$transaction([
      prisma.call.create({
        data: {
          tenantId: tenant.id,
          fromNumber: '+1234567001',
          toNumber: '+1234567890',
          direction: 'inbound',
          duration: 180,
          intent: 'booking',
          outcome: 'successful',
          sentiment: 'positive',
          aiConfidence: 0.95,
        },
      }),
      prisma.call.create({
        data: {
          tenantId: tenant.id,
          fromNumber: '+1234567002',
          toNumber: '+1234567890',
          direction: 'inbound',
          duration: 120,
          intent: 'inquiry',
          outcome: 'successful',
          sentiment: 'neutral',
          aiConfidence: 0.88,
        },
      }),
      prisma.call.create({
        data: {
          tenantId: tenant.id,
          fromNumber: '+1234567003',
          toNumber: '+1234567890',
          direction: 'inbound',
          duration: 240,
          intent: 'booking',
          outcome: 'successful',
          sentiment: 'positive',
          aiConfidence: 0.92,
        },
      }),
    ]);
    results.created.calls = calls.length;

    // 4. Create test leads
    const leads = await prisma.$transaction([
      prisma.lead.create({
        data: {
          contactName: 'Michael Johnson',
          email: `michael-${timestamp}@business.com`,
          phone: '+1234567890',
          businessName: 'Johnson Wellness Center',
          businessType: 'salon',
          selectedPlan: 'professional',
          source: 'ai_call',
          status: 'new',
          aiNotes: 'Very interested in AI solution. 50+ daily calls for spa bookings.',
          qualificationScore: 85,
          priority: 'high',
          aiCallData: {
            companySize: '10-50',
            dailyCallVolume: '50-100',
            timeline: 'Within 2 weeks',
          },
        },
      }),
      prisma.lead.create({
        data: {
          contactName: 'Sarah Williams',
          email: `sarah-${timestamp}@salon.com`,
          phone: '+1234567891',
          businessName: 'Elegant Beauty Spa',
          businessType: 'salon',
          selectedPlan: 'starter',
          source: 'ai_call',
          status: 'new',
          aiNotes: 'Interested in appointment booking and SMS reminder features.',
          qualificationScore: 70,
          priority: 'normal',
          aiCallData: {
            companySize: '1-10',
            dailyCallVolume: '10-20',
          },
        },
      }),
    ]);
    results.created.leads = leads.length;

    // 5. Create test bookings
    const bookings = await prisma.$transaction([
      prisma.booking.create({
        data: {
          tenantId: tenant.id,
          customerName: 'Emily Davis',
          customerPhone: '+1234567892',
          customerEmail: 'emily@example.com',
          serviceName: 'Swedish Massage - 60 min',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          partySize: 1,
          status: 'confirmed',
          notes: 'Prefers deep tissue pressure',
        },
      }),
      prisma.booking.create({
        data: {
          tenantId: tenant.id,
          customerName: 'Robert Anderson',
          customerPhone: '+1234567893',
          customerEmail: 'robert@example.com',
          serviceName: 'Couples Spa Package',
          dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
          partySize: 2,
          status: 'confirmed',
          notes: 'Anniversary celebration',
        },
      }),
    ]);
    results.created.bookings = bookings.length;

    // 6. Create test orders
    const orders = await prisma.$transaction([
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerName: 'Jennifer Taylor',
          customerPhone: '+1234567894',
          customerEmail: 'jennifer@example.com',
          items: [{ name: 'Aromatherapy Essential Oil Set', quantity: 1, price: 45 }],
          subtotal: 45,
          total: 48.6,
          deliveryType: 'delivery',
          deliveryAddress: '456 Park Avenue, New York',
          status: 'confirmed',
        },
      }),
      prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerName: 'David Martinez',
          customerPhone: '+1234567895',
          customerEmail: 'david@example.com',
          items: [{ name: 'Spa Gift Card - $100', quantity: 2, price: 100 }],
          subtotal: 200,
          total: 200,
          deliveryType: 'pickup',
          status: 'ready',
        },
      }),
    ]);
    results.created.orders = orders.length;

    return {
      success: true,
      message: 'Test data created successfully!',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
      },
      summary: {
        callLogs: results.created.callLogs,
        calls: results.created.calls,
        leads: results.created.leads,
        bookings: results.created.bookings,
        orders: results.created.orders,
      },
    };
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

  async getTenantOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { paymentStatus } = req.query;
      const orders = await adminDashboardService.getTenantOrders(
        tenantId,
        paymentStatus as string
      );
      res.json({ success: true, data: { orders } });
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

  async getAllAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const result = await adminDashboardService.getAllAgents(
        Number(page),
        Number(limit),
        search as string
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async populateTestData(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminDashboardService.populateTestData();
      res.json(result);
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
router.get('/tenants/:tenantId/orders', adminDashboardController.getTenantOrders);
router.put('/tenants/:tenantId/status', adminDashboardController.updateTenantStatus);
router.get('/analytics/revenue', adminDashboardController.getRevenueAnalytics);
router.get('/analytics/calls', adminDashboardController.getCallAnalytics);
router.get('/analytics/subscriptions', adminDashboardController.getSubscriptionAnalytics);
router.get('/activities', adminDashboardController.getRecentActivities);

// Agents management
router.get('/agents', adminDashboardController.getAllAgents);

// User approval management
router.get('/users/pending-approval', adminDashboardController.getPendingApprovalUsers);
router.post('/users/:userId/approve', adminDashboardController.approveUser);
router.post('/users/:userId/reject', adminDashboardController.rejectUser);

// Test data population (for production testing)
router.post('/test/populate', adminDashboardController.populateTestData);

export default router;
