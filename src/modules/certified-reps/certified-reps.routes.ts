import { Router } from 'express';
import certifiedRepsController from './certified-reps.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';

const router = Router();

/**
 * Get all Certified Reps (admin only)
 * GET /api/certified-reps
 */
router.get('/', authenticateAdmin, certifiedRepsController.getAllReps);

/**
 * Get Certified Rep statistics (admin only)
 * GET /api/certified-reps/stats
 */
router.get('/stats', authenticateAdmin, certifiedRepsController.getRepStats);

/**
 * Get Certified Rep by ID (admin only)
 * GET /api/certified-reps/:id
 */
router.get('/:id', authenticateAdmin, certifiedRepsController.getRepById);

/**
 * Add client for Certified Rep (admin or rep owner)
 * POST /api/certified-reps/:repId/clients
 */
router.post('/:repId/clients', authenticateAdmin, certifiedRepsController.addClient);

export default router;
