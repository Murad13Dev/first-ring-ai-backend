import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest, authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import prisma from '../../config/database';
import logger from '../../config/logger';
import agentsService from '../agents/agents.service';

const router = Router();

// ==========================================
// AGENT DASHBOARD SERVICE
// ==========================================

const agentDashboardService = {
  /**
   * Get all agents for the tenant
   */
  async getMyAgents(tenantId: string) {
    return agentsService.getAgentsByTenant(tenantId);
  },

  /**
   * Get a single agent by ID
   */
  async getMyAgent(tenantId: string, agentId: string) {
    return agentsService.getAgent(agentId, tenantId);
  },

  /**
   * Get call history for a specific agent or all agents
   */
  async getAgentCalls(tenantId: string, agentId?: string, page: number = 1, limit: number = 20) {
    const where: any = { tenantId };
    if (agentId) {
      where.agentId = agentId;
    }

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          agentId: true,
          fromNumber: true,
          toNumber: true,
          direction: true,
          duration: true,
          transcript: true,
          intent: true,
          outcome: true,
          aiConfidence: true,
          sentiment: true,
          bookingId: true,
          orderId: true,
          createdAt: true,
        },
      }),
      prisma.call.count({ where }),
    ]);

    return {
      calls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get analytics for a specific agent or all agents
   */
  async getAgentAnalytics(tenantId: string, agentId?: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const callWhere: any = { tenantId, createdAt: { gte: startDate } };
    const totalCallWhere: any = { tenantId };
    if (agentId) {
      callWhere.agentId = agentId;
      totalCallWhere.agentId = agentId;
    }

    const [calls, bookingsCount, ordersCount, totalCalls] = await Promise.all([
      prisma.call.findMany({
        where: callWhere,
        select: {
          duration: true,
          outcome: true,
          sentiment: true,
          intent: true,
          aiConfidence: true,
          createdAt: true,
        },
      }),
      prisma.booking.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.order.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      }),
      prisma.call.count({ where: totalCallWhere }),
    ]);

    // Group calls by date
    const byDate: Record<string, number> = {};
    calls.forEach((call) => {
      const date = call.createdAt.toISOString().slice(0, 10);
      byDate[date] = (byDate[date] || 0) + 1;
    });

    // By outcome
    const byOutcome: Record<string, number> = {};
    calls.forEach((call) => {
      const outcome = call.outcome || 'unknown';
      byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
    });

    // By sentiment
    const bySentiment: Record<string, number> = {};
    calls.forEach((call) => {
      const sentiment = call.sentiment || 'unknown';
      bySentiment[sentiment] = (bySentiment[sentiment] || 0) + 1;
    });

    // By intent
    const byIntent: Record<string, number> = {};
    calls.forEach((call) => {
      const intent = call.intent || 'unknown';
      byIntent[intent] = (byIntent[intent] || 0) + 1;
    });

    // Average confidence
    const confidences = calls.filter(c => c.aiConfidence !== null).map(c => c.aiConfidence!);
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : null;

    return {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
      summary: {
        totalCallsAllTime: totalCalls,
        totalCallsInPeriod: calls.length,
        bookingsThisMonth: bookingsCount,
        ordersThisMonth: ordersCount,
        avgDuration: calls.length > 0
          ? Math.round(calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length)
          : 0,
        avgConfidence,
      },
      byDate,
      byOutcome,
      bySentiment,
      byIntent,
    };
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const agentDashboardController = {
  /**
   * Get all agents for the tenant
   * GET /api/agent-dashboard/my-agents
   */
  async getMyAgents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const agents = await agentDashboardService.getMyAgents(tenantId);

      return res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single agent
   * GET /api/agent-dashboard/my-agents/:agentId
   */
  async getMyAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;
      const agent = await agentDashboardService.getMyAgent(tenantId, agentId);

      return res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get call history (all agents or specific agent)
   * GET /api/agent-dashboard/calls?agentId=xxx
   */
  async getAgentCalls(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page = 1, limit = 20, agentId } = req.query;

      const result = await agentDashboardService.getAgentCalls(
        tenantId,
        agentId as string | undefined,
        Number(page),
        Number(limit)
      );

      return res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get analytics (all agents or specific agent)
   * GET /api/agent-dashboard/analytics?agentId=xxx
   */
  async getAgentAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { days = 30, agentId } = req.query;

      const analytics = await agentDashboardService.getAgentAnalytics(
        tenantId,
        agentId as string | undefined,
        Number(days)
      );

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get configuration options (voices, tools, etc.)
   * GET /api/agent-dashboard/config-options
   */
  async getConfigOptions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = agentsService.getConfigOptions();

      return res.json({
        success: true,
        data: options,
      });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// All routes require authentication + tenant isolation
// ==========================================

router.use(authenticateToken, tenantIsolation);

// List all my agents
router.get('/my-agents', agentDashboardController.getMyAgents);

// Get specific agent details
router.get('/my-agents/:agentId', agentDashboardController.getMyAgent);

// Get call history (optional ?agentId= filter)
router.get('/calls', agentDashboardController.getAgentCalls);

// Get analytics (optional ?agentId= filter)
router.get('/analytics', agentDashboardController.getAgentAnalytics);

// Get configuration options
router.get('/config-options', agentDashboardController.getConfigOptions);

export default router;
