import express from 'express';
import { integrationsController } from './integrations.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = express.Router();

// Apply authentication and tenant isolation to all routes
router.use(authenticateToken);
router.use(tenantIsolation);

/**
 * Integration Management Routes
 */

// Get integration settings
router.get('/', integrationsController.getIntegration.bind(integrationsController));

// Configure Discord
router.post('/discord/configure', integrationsController.configureDiscord.bind(integrationsController));

// Test Discord webhook
router.post('/discord/test', integrationsController.testDiscordWebhook.bind(integrationsController));

// Configure Whop (placeholder - can be implemented similar to Discord)
// router.post('/whop/configure', integrationsController.configureWhop.bind(integrationsController));

// Handle Whop webhook (no auth required - verified by signature)
router.post('/whop/webhook', integrationsController.handleWhopWebhook.bind(integrationsController));

// Sync Whop products
// router.post('/whop/sync-products', integrationsController.syncWhopProducts.bind(integrationsController));

// Get Whop products
// router.get('/whop/products', integrationsController.getWhopProducts.bind(integrationsController));

// Set product mappings
// router.post('/product-mappings', integrationsController.setProductMappings.bind(integrationsController));

// Get access grants
// router.get('/access-grants', integrationsController.getAccessGrants.bind(integrationsController));

// Link Discord user to grant
// router.post('/access-grants/:grantId/link-discord', integrationsController.linkDiscordUser.bind(integrationsController));

// Revoke access
// router.post('/access-grants/:grantId/revoke', integrationsController.revokeAccess.bind(integrationsController));

// Enable/disable integration
// router.post('/enable', integrationsController.enableIntegration.bind(integrationsController));
// router.post('/disable', integrationsController.disableIntegration.bind(integrationsController));

export default router;
