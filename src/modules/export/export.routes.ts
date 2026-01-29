import { Router, Response, NextFunction } from 'express';
import exportController from './export.controller';
import { authenticateToken, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Async handler wrapper
const asyncHandler = (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * @route GET /api/export/summary
 * @desc Get export summary (record counts)
 * @access Private
 */
router.get('/summary', asyncHandler(exportController.getExportSummary.bind(exportController)));

/**
 * @route GET /api/export/bookings
 * @desc Export bookings to CSV
 * @access Private
 * @query dateFrom - Start date (optional)
 * @query dateTo - End date (optional)
 */
router.get('/bookings', asyncHandler(exportController.exportBookings.bind(exportController)));

/**
 * @route GET /api/export/orders
 * @desc Export orders to CSV
 * @access Private
 * @query dateFrom - Start date (optional)
 * @query dateTo - End date (optional)
 */
router.get('/orders', asyncHandler(exportController.exportOrders.bind(exportController)));

/**
 * @route GET /api/export/calls
 * @desc Export calls to CSV
 * @access Private
 * @query dateFrom - Start date (optional)
 * @query dateTo - End date (optional)
 */
router.get('/calls', asyncHandler(exportController.exportCalls.bind(exportController)));

export default router;
