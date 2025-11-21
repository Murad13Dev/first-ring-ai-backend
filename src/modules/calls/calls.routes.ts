import { Router } from 'express';
import callsController from './calls.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = Router();
router.use(authenticateToken, tenantIsolation);

router.post('/', callsController.createCall);
router.get('/', callsController.getCalls);
router.get('/stats', callsController.getCallStats);
router.get('/:id', callsController.getCallById);

export default router;
