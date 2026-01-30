import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticateToken, authenticateAdmin } from '../../middleware/auth.middleware';
import auditService, { ActionType, EntityType } from '../../services/audit.service';

const router = Router();

/**
 * GET /api/audit
 * Get audit logs (Admin only)
 */
router.get(
  '/',
  authenticateAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        tenantId,
        actorId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const result = await auditService.getActivities({
        tenantId: tenantId as string,
        actorId: actorId as string,
        action: action as ActionType,
        entityType: entityType as EntityType,
        entityId: entityId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json({
        success: true,
        data: result.activities,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/audit/tenant/:tenantId/summary
 * Get activity summary for a tenant (Admin or tenant owner)
 */
router.get(
  '/tenant/:tenantId/summary',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId } = req.params;
      const { days = 30 } = req.query;

      // Check access - admin or tenant owner
      if (req.user!.role !== 'admin' && req.user!.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const summary = await auditService.getTenantActivitySummary(
        tenantId,
        parseInt(days as string)
      );

      return res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get history for a specific entity
 */
router.get(
  '/entity/:entityType/:entityId',
  authenticateToken,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { entityType, entityId } = req.params;

      const history = await auditService.getEntityHistory(
        entityType as EntityType,
        entityId
      );

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/audit/cleanup
 * Clean up old audit logs (Admin only)
 */
router.post(
  '/cleanup',
  authenticateAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { retentionDays = 90 } = req.body;

      const deletedCount = await auditService.cleanup(retentionDays);

      return res.json({
        success: true,
        message: `Deleted ${deletedCount} old audit logs`,
        deletedCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
