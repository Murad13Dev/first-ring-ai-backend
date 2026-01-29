import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest, authenticateToken } from '../../middleware/auth.middleware';
import { checkWhopSubscription, injectSubscriptionStatus } from '../../middleware/whop-subscription.middleware';
import agentsService from './agents.service';

const router = Router();

/**
 * GET /api/agents
 * List all agents for the authenticated user's tenant
 */
router.get(
  '/',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const agents = await agentsService.getAgentsByTenant(tenantId);

      return res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/agents/config-options
 * Get available configuration options (voices, tools, etc.)
 */
router.get(
  '/config-options',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const options = agentsService.getConfigOptions();

      return res.json({
        success: true,
        data: options,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/agents/phones/available
 * Get available phone numbers for assignment
 * NOTE: Must be defined before /:agentId routes
 */
router.get(
  '/phones/available',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const phoneNumbers = await agentsService.getAvailablePhoneNumbers(tenantId);

      return res.json({
        success: true,
        data: phoneNumbers,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/agents/:agentId
 * Get a single agent's details
 */
router.get(
  '/:agentId',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;
      const agent = await agentsService.getAgent(agentId, tenantId);

      return res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents
 * Create a new agent
 */
router.post(
  '/',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const {
        name,
        systemPrompt,
        voiceGender,
        voiceId,
        language,
        temperature,
        enabledTools,
        phoneNumber,
        retellAgentId,
      } = req.body;

      const agent = await agentsService.createAgent(tenantId, {
        name,
        systemPrompt,
        voiceGender,
        voiceId,
        language,
        temperature,
        enabledTools,
        phoneNumber,
        retellAgentId,
      });

      return res.status(201).json({
        success: true,
        message: 'Agent created successfully',
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/agents/:agentId
 * Update an agent's configuration
 */
router.patch(
  '/:agentId',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;
      const {
        name,
        systemPrompt,
        voiceGender,
        voiceId,
        language,
        temperature,
        enabledTools,
        phoneNumber,
        isActive,
      } = req.body;

      const agent = await agentsService.updateAgent(agentId, tenantId, {
        name,
        systemPrompt,
        voiceGender,
        voiceId,
        language,
        temperature,
        enabledTools,
        phoneNumber,
        isActive,
      });

      return res.json({
        success: true,
        message: 'Agent updated successfully',
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/agents/:agentId
 * Delete an agent
 */
router.delete(
  '/:agentId',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;

      await agentsService.deleteAgent(agentId, tenantId);

      return res.json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/:agentId/link-retell
 * Link an existing Retell agent to this agent
 */
router.post(
  '/:agentId/link-retell',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;
      const { retellAgentId } = req.body;

      if (!retellAgentId) {
        return res.status(400).json({
          success: false,
          message: 'retellAgentId is required',
        });
      }

      const agent = await agentsService.linkRetellAgent(agentId, tenantId, retellAgentId);

      return res.json({
        success: true,
        message: 'Retell agent linked successfully',
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/agents/:agentId/assign-phone
 * Assign a phone number to an agent
 */
router.post(
  '/:agentId/assign-phone',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'phoneNumber is required',
        });
      }

      const agent = await agentsService.assignPhoneNumber(agentId, tenantId, phoneNumber);

      return res.json({
        success: true,
        message: 'Phone number assigned successfully',
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/agents/:agentId/assign-phone
 * Remove phone number from an agent
 */
router.delete(
  '/:agentId/assign-phone',
  authenticateToken,
  checkWhopSubscription,
  injectSubscriptionStatus,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.user!.tenantId!;
      const { agentId } = req.params;

      const agent = await agentsService.unassignPhoneNumber(agentId, tenantId);

      return res.json({
        success: true,
        message: 'Phone number unassigned successfully',
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
