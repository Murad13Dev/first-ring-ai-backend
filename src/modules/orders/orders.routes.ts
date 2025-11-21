import { Router } from 'express';
import ordersController from './orders.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = Router();
router.use(authenticateToken, tenantIsolation);

router.post('/', ordersController.createOrder);
router.get('/', ordersController.getOrders);
router.get('/stats', ordersController.getOrderStats);
router.get('/:id', ordersController.getOrderById);
router.put('/:id', ordersController.updateOrder);
router.post('/:id/checkout', ordersController.createCheckoutLink);

export default router;
