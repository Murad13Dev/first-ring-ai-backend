import { Router } from 'express';
import ordersController from './orders.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import { checkWhopSubscription, injectSubscriptionStatus } from '../../middleware/whop-subscription.middleware';

const router = Router();
router.use(authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantIsolation);

router.post('/', ordersController.createOrder);
router.get('/', ordersController.getOrders);
router.get('/stats', ordersController.getOrderStats);
router.get('/:id', ordersController.getOrderById);
router.put('/:id', ordersController.updateOrder);
router.post('/:id/checkout', ordersController.createCheckoutLink);

export default router;
