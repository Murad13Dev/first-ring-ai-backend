import { Router } from 'express';
import callsController from './calls.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import { checkWhopSubscription, injectSubscriptionStatus } from '../../middleware/whop-subscription.middleware';

const router = Router();
router.use(authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantIsolation);

router.post('/', callsController.createCall);
router.get('/', callsController.getCalls);
router.get('/stats', callsController.getCallStats);
router.get('/:id', callsController.getCallById);

export default router;
