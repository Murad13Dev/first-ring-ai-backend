import { Router } from 'express';
import posIntegrationsController from './pos-integrations.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// Get supported POS providers (public)
router.get('/providers', posIntegrationsController.getSupportedProviders);

// Protected routes
router.use(authenticate);

// Configure POS for tenant
router.post(
  '/tenants/:tenantId/configure',
  authorize('admin', 'owner'),
  posIntegrationsController.configurePOS
);

// Get POS configuration
router.get(
  '/tenants/:tenantId/config',
  authorize('admin', 'owner'),
  posIntegrationsController.getPOSConfig
);

// Test POS connection
router.post(
  '/tenants/:tenantId/test',
  authorize('admin', 'owner'),
  posIntegrationsController.testConnection
);

// Push order to POS
router.post(
  '/tenants/:tenantId/orders/:orderId/push',
  authorize('admin', 'owner', 'staff'),
  posIntegrationsController.pushOrder
);

// Push appointment to POS
router.post(
  '/tenants/:tenantId/bookings/:bookingId/push',
  authorize('admin', 'owner', 'staff'),
  posIntegrationsController.pushAppointment
);

// Sync menu from POS
router.post(
  '/tenants/:tenantId/sync-menu',
  authorize('admin', 'owner'),
  posIntegrationsController.syncMenu
);

// Get availability from POS
router.get(
  '/tenants/:tenantId/availability',
  posIntegrationsController.getAvailability
);

// Cancel order in POS
router.post(
  '/tenants/:tenantId/orders/:orderId/cancel',
  authorize('admin', 'owner', 'staff'),
  posIntegrationsController.cancelOrder
);

export default router;
