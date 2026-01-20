import { Router } from 'express';
import servicesController from './services.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import { checkWhopSubscription, injectSubscriptionStatus } from '../../middleware/whop-subscription.middleware';

const router = Router();

// All routes require authentication, Whop subscription check, and tenant isolation
router.use(authenticateToken, checkWhopSubscription, injectSubscriptionStatus, tenantIsolation);

/**
 * @route   POST /api/services
 * @desc    Create new service
 * @access  Private (Tenant)
 */
router.post('/', servicesController.createService);

/**
 * @route   GET /api/services
 * @desc    Get all services
 * @access  Private (Tenant)
 */
router.get('/', servicesController.getServices);

/**
 * @route   GET /api/services/categories/list
 * @desc    Get all categories
 * @access  Private (Tenant)
 */
router.get('/categories/list', servicesController.getCategories);

/**
 * @route   GET /api/services/stock/low
 * @desc    Get low stock services
 * @access  Private (Tenant)
 */
router.get('/stock/low', servicesController.getLowStockServices);

/**
 * @route   PUT /api/services/bulk/availability
 * @desc    Bulk update service availability
 * @access  Private (Tenant)
 */
router.put('/bulk/availability', servicesController.bulkUpdateAvailability);

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Private (Tenant)
 */
router.get('/:id', servicesController.getServiceById);

/**
 * @route   PUT /api/services/:id
 * @desc    Update service
 * @access  Private (Tenant)
 */
router.put('/:id', servicesController.updateService);

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service
 * @access  Private (Tenant)
 */
router.delete('/:id', servicesController.deleteService);

/**
 * @route   PUT /api/services/:id/stock
 * @desc    Update service stock
 * @access  Private (Tenant)
 */
router.put('/:id/stock', servicesController.updateStock);

/**
 * @route   POST /api/services/:id/duplicate
 * @desc    Duplicate service
 * @access  Private (Tenant)
 */
router.post('/:id/duplicate', servicesController.duplicateService);

export default router;
