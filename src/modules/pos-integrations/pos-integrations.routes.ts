import { Router } from 'express';
import posIntegrationsController from './pos-integrations.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Get supported POS providers (public)
router.get('/providers', posIntegrationsController.getSupportedProviders);

// Protected routes
router.use(authenticateToken);

// Configure POS for tenant
router.post('/tenants/:tenantId/configure', posIntegrationsController.configurePOS);

// Get POS configuration
router.get('/tenants/:tenantId/config', posIntegrationsController.getPOSConfig);

// Test POS connection
router.post('/tenants/:tenantId/test', posIntegrationsController.testConnection);

// Push order to POS
router.post('/tenants/:tenantId/orders/:orderId/push', posIntegrationsController.pushOrder);

// Push appointment to POS
router.post('/tenants/:tenantId/bookings/:bookingId/push', posIntegrationsController.pushAppointment);

// Sync menu from POS
router.post('/tenants/:tenantId/sync-menu', posIntegrationsController.syncMenu);

// Get availability from POS
router.get('/tenants/:tenantId/availability', posIntegrationsController.getAvailability);

// Cancel order in POS
router.post('/tenants/:tenantId/orders/:orderId/cancel', posIntegrationsController.cancelOrder);

export default router;
