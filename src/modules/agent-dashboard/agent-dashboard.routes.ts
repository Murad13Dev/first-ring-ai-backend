import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest, authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import prisma from '../../config/database';
import logger from '../../config/logger';
import retellProvisioningService from '../../services/retell-provisioning.service';
import tenantsService from '../tenants/tenants.service';

const router = Router();

// ==========================================
// AGENT DASHBOARD SERVICE
// ==========================================

const agentDashboardService = {
  /**
   * Get the authenticated user's agent details
   * Combines local DB config with live Retell API data
   */
  async getMyAgent(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        businessType: true,
        retellAgentId: true,
        twilioNumber: true,
        customAgentName: true,
        customAgentPrompt: true,
        agentVoiceGender: true,
        agentVoiceId: true,
        agentTemperature: true,
        enabledTools: true,
        createdAt: true,
      },
    });

    if (!tenant) {
      return null;
    }

    // Fetch live agent details from Retell API if agent exists
    let retellAgent = null;
    if (tenant.retellAgentId) {
      try {
        retellAgent = await retellProvisioningService.getAgentDetails(tenant.retellAgentId);
      } catch (error) {
        logger.warn('Failed to fetch Retell agent details', {
          tenantId,
          retellAgentId: tenant.retellAgentId,
          error,
        });
        // Don't fail - return local data even if Retell API is unavailable
      }
    }

    return {
      agent: {
        retellAgentId: tenant.retellAgentId,
        name: tenant.customAgentName || `${tenant.name} AI Agent`,
        businessType: tenant.businessType,
        phoneNumber: tenant.twilioNumber,
        customPrompt: tenant.customAgentPrompt,
        voiceGender: tenant.agentVoiceGender || 'male',
        voiceId: tenant.agentVoiceId,
        temperature: tenant.agentTemperature ?? 0.7,
        enabledTools: tenant.enabledTools || ['booking', 'ordering', 'faq', 'check_availability'],
        createdAt: tenant.createdAt,
        // Live data from Retell API
        retellDetails: retellAgent ? {
          agentName: retellAgent.agent_name,
          voiceId: retellAgent.voice_id,
          language: retellAgent.language,
          lastModified: retellAgent.last_modification_timestamp,
        } : null,
      },
      hasAgent: !!tenant.retellAgentId,
    };
  },

  /**
   * Update the authenticated user's agent configuration
   */
  async updateMyAgent(tenantId: string, config: {
    customAgentName?: string;
    customAgentPrompt?: string;
    agentVoiceGender?: 'male' | 'female';
    agentVoiceId?: string;
    agentTemperature?: number;
    enabledTools?: string[];
  }) {
    return tenantsService.updateAgentConfig(tenantId, config);
  },

  /**
   * Get call history for the agent's tenant
   */
  async getAgentCalls(tenantId: string, page: number = 1, limit: number = 20) {
    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where: { tenantId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
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
      prisma.call.count({ where: { tenantId } }),
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
   * Get analytics for the agent's calls
   */
  async getAgentAnalytics(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [calls, bookingsCount, ordersCount, totalCalls] = await Promise.all([
      prisma.call.findMany({
        where: {
          tenantId,
          createdAt: { gte: startDate },
        },
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
      prisma.call.count({ where: { tenantId } }),
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
   * Get current user's agent
   * GET /api/agent-dashboard/my-agent
   */
  async getMyAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await agentDashboardService.getMyAgent(tenantId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update current user's agent configuration
   * PATCH /api/agent-dashboard/my-agent
   */
  async updateMyAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const {
        customAgentName,
        customAgentPrompt,
        agentVoiceGender,
        agentVoiceId,
        agentTemperature,
        enabledTools,
      } = req.body;

      const result = await agentDashboardService.updateMyAgent(tenantId, {
        customAgentName,
        customAgentPrompt,
        agentVoiceGender,
        agentVoiceId,
        agentTemperature,
        enabledTools,
      });

      return res.json({
        success: true,
        message: 'Agent configuration updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current user's agent call history
   * GET /api/agent-dashboard/my-agent/calls
   */
  async getAgentCalls(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page = 1, limit = 20 } = req.query;

      const result = await agentDashboardService.getAgentCalls(
        tenantId,
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
   * Get current user's agent analytics
   * GET /api/agent-dashboard/my-agent/analytics
   */
  async getAgentAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { days = 30 } = req.query;

      const analytics = await agentDashboardService.getAgentAnalytics(
        tenantId,
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
   * Get agent configuration options (voices, tools, etc.)
   * GET /api/agent-dashboard/my-agent/config-options
   */
  async getConfigOptions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const config = await tenantsService.getAgentConfig(tenantId);

      return res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// All routes require authentication + tenant isolation
// The user only sees their own tenant's agent
// ==========================================

router.use(authenticateToken, tenantIsolation);

// Get my agent details
router.get('/my-agent', agentDashboardController.getMyAgent);

// Update my agent configuration
router.patch('/my-agent', agentDashboardController.updateMyAgent);

// Get my agent's call history
router.get('/my-agent/calls', agentDashboardController.getAgentCalls);

// Get my agent's analytics
router.get('/my-agent/analytics', agentDashboardController.getAgentAnalytics);

// Get available configuration options (voices, tools, temperature range)
router.get('/my-agent/config-options', agentDashboardController.getConfigOptions);

export default router;
