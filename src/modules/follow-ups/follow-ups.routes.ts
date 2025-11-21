import { Router } from 'express';
import followUpsController from './follow-ups.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Get default templates (public)
router.get('/templates', followUpsController.getDefaultTemplates);

// Process pending follow-ups (internal/cron)
router.post('/process', followUpsController.processPendingFollowUps);

// Protected routes
router.use(authenticateToken);

// Configuration
router.post('/tenants/:tenantId/configure', followUpsController.configureFollowUp);
router.get('/tenants/:tenantId/config', followUpsController.getConfigurations);
router.patch('/tenants/:tenantId/config/:type/toggle', followUpsController.toggleFollowUp);

// Scheduling
router.post('/tenants/:tenantId/missed-call', followUpsController.scheduleMissedCallFollowUp);
router.post('/tenants/:tenantId/orders/:orderId/upsell', followUpsController.scheduleOrderUpsell);
router.post('/tenants/:tenantId/bookings/:bookingId/reminder', followUpsController.scheduleBookingReminder);
router.post('/tenants/:tenantId/bookings/:bookingId/aftercare', followUpsController.scheduleAftercareFollowUp);
router.post('/tenants/:tenantId/loyalty-reward', followUpsController.scheduleLoyaltyReward);
router.post('/tenants/:tenantId/reactivation', followUpsController.triggerReactivation);
router.post('/tenants/:tenantId/review-request', followUpsController.scheduleReviewRequest);

// Management
router.get('/tenants/:tenantId/pending', followUpsController.getPendingFollowUps);
router.delete('/jobs/:jobId', followUpsController.cancelFollowUp);

// Statistics
router.get('/tenants/:tenantId/stats', followUpsController.getStatistics);

export default router;
