import { Router } from 'express';
import tenantsController from './tenants.controller';
import languageController from './language.controller';
import { authenticateToken, authenticateAdmin } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import { checkWhopSubscription, injectSubscriptionStatus } from '../../middleware/whop-subscription.middleware';

const router = Router();

/**
 * @route   POST /api/tenants
 * @desc    Create new tenant
 * @access  Admin only
 */
router.post('/', authenticateAdmin, tenantsController.createTenant);

/**
 * @route   GET /api/tenants
 * @desc    Get all tenants with filters
 * @access  Admin only
 */
router.get('/', authenticateAdmin, tenantsController.getAllTenants);

/**
 * @route   GET /api/tenants/stats/all
 * @desc    Get all tenants statistics
 * @access  Admin only
 */
router.get('/stats/all', authenticateAdmin, tenantsController.getAllTenantsStats);

/**
 * @route   GET /api/tenants/languages
 * @desc    Get supported languages
 * @access  Private
 */
router.get('/languages', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, languageController.getSupportedLanguages);

/**
 * @route   POST /api/tenants/languages/test
 * @desc    Test translation
 * @access  Private
 */
router.post('/languages/test', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, languageController.testTranslation);

/**
 * @route   GET /api/tenants/:id
 * @desc    Get tenant by ID
 * @access  Admin or Tenant owner
 */
router.get('/:id', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.getTenantById);

/**
 * @route   PUT /api/tenants/:id
 * @desc    Update tenant
 * @access  Admin or Tenant owner
 */
router.put('/:id', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.updateTenant);

/**
 * @route   DELETE /api/tenants/:id
 * @desc    Deactivate tenant
 * @access  Admin only
 */
router.delete('/:id', authenticateAdmin, tenantsController.deleteTenant);

/**
 * @route   GET /api/tenants/:id/stats
 * @desc    Get tenant statistics
 * @access  Admin or Tenant owner
 */
router.get('/:id/stats', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.getTenantStats);

/**
 * @route   PUT /api/tenants/:id/subscription
 * @desc    Update tenant subscription
 * @access  Admin only
 */
router.put('/:id/subscription', authenticateAdmin, tenantsController.updateSubscription);

/**
 * @route   PUT /api/tenants/:id/language
 * @desc    Set tenant default language
 * @access  Admin or Tenant owner
 */
router.put('/:id/language', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, languageController.setTenantLanguage);

/**
 * @route   GET /api/tenants/:id/agent-config
 * @desc    Get AI agent configuration
 * @access  Admin or Tenant owner
 */
router.get('/:id/agent-config', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.getAgentConfig);

/**
 * @route   PATCH /api/tenants/:id/agent-config
 * @desc    Update AI agent configuration
 * @access  Admin or Tenant owner
 */
router.patch('/:id/agent-config', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.updateAgentConfig);

/**
 * @route   GET /api/tenants/:id/settings
 * @desc    Get tenant settings
 * @access  Admin or Tenant owner
 */
router.get('/:id/settings', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.getSettings);

/**
 * @route   PUT /api/tenants/:id/settings
 * @desc    Update tenant settings
 * @access  Admin or Tenant owner
 */
router.put('/:id/settings', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.updateSettings);

/**
 * @route   PUT /api/tenants/:id/business-hours
 * @desc    Update business hours
 * @access  Admin or Tenant owner
 */
router.put('/:id/business-hours', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.updateBusinessHours);

/**
 * @route   PUT /api/tenants/:id/notifications
 * @desc    Update notification preferences
 * @access  Admin or Tenant owner
 */
router.put('/:id/notifications', authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantsController.updateNotificationPreferences);

export default router;
