import { Router, Response, NextFunction } from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';
import { UsageTrackingService } from '../../services/usage-tracking.service';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
const usageService = new UsageTrackingService();

/**
 * @route GET /api/usage
 * @desc Get current usage for tenant
 * @access Private
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant ID required', 400);
    }

    const usage = await usageService.getCurrentUsage(tenantId);

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/usage/check
 * @desc Check if tenant can make calls (within limits)
 * @access Private
 */
router.get('/check', authenticateToken, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new AppError('Tenant ID required', 400);
    }

    const result = await usageService.checkLimit(tenantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
