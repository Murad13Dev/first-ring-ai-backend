import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticateAdmin } from '../../middleware/auth.middleware';
import webhookLogService, { WebhookSource, WebhookStatus } from '../../services/webhook-log.service';

const router = Router();

/**
 * GET /api/webhook-logs
 * Get webhook logs with filtering (Admin only)
 */
router.get(
  '/',
  authenticateAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const {
        source,
        event,
        status,
        tenantId,
        startDate,
        endDate,
        page,
        limit,
      } = req.query;

      const logs = await webhookLogService.getLogs({
        source: source as WebhookSource,
        event: event as string,
        status: status as WebhookStatus,
        tenantId: tenantId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.json({
        success: true,
        data: logs.logs,
        pagination: logs.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/webhook-logs/stats
 * Get webhook statistics (Admin only)
 */
router.get(
  '/stats',
  authenticateAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { days = 7 } = req.query;
      const stats = await webhookLogService.getStats(parseInt(days as string));

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/webhook-logs/:id
 * Get a single webhook log by ID (Admin only)
 */
router.get(
  '/:id',
  authenticateAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const log = await webhookLogService.getById(id);

      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Webhook log not found',
        });
      }

      return res.json({
        success: true,
        data: log,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/webhook-logs/cleanup
 * Cleanup old webhook logs (Admin only)
 */
router.post(
  '/cleanup',
  authenticateAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { retentionDays = 30 } = req.body;
      const deletedCount = await webhookLogService.cleanup(retentionDays);

      return res.json({
        success: true,
        message: `Deleted ${deletedCount} old webhook logs`,
        deletedCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
