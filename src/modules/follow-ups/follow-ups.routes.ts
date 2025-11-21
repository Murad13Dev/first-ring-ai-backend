import { Router } from 'express';
import followUpsController from './follow-ups.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// Get default templates (public)
router.get('/templates', followUpsController.getDefaultTemplates);

// Process pending follow-ups (internal/cron)
router.post('/process', followUpsController.processPendingFollowUps);

// Protected routes
router.use(authenticate);

// Configuration
router.post(
  '/tenants/:tenantId/configure',
  authorize('admin', 'owner'),
  followUpsController.configureFollowUp
);

router.get(
  '/tenants/:tenantId/config',
  authorize('admin', 'owner'),
  followUpsController.getConfigurations
);

router.patch(
  '/tenants/:tenantId/config/:type/toggle',
  authorize('admin', 'owner'),
  followUpsController.toggleFollowUp
);

// Scheduling
router.post(
  '/tenants/:tenantId/missed-call',
  authorize('admin', 'owner', 'staff'),
  followUpsController.scheduleMissedCallFollowUp
);

router.post(
  '/tenants/:tenantId/orders/:orderId/upsell',
  authorize('admin', 'owner', 'staff'),
  followUpsController.scheduleOrderUpsell
);

router.post(
  '/tenants/:tenantId/bookings/:bookingId/reminder',
  authorize('admin', 'owner', 'staff'),
  followUpsController.scheduleBookingReminder
);

router.post(
  '/tenants/:tenantId/bookings/:bookingId/aftercare',
  authorize('admin', 'owner', 'staff'),
  followUpsController.scheduleAftercareFollowUp
);

router.post(
  '/tenants/:tenantId/loyalty-reward',
  authorize('admin', 'owner', 'staff'),
  followUpsController.scheduleLoyaltyReward
);

router.post(
  '/tenants/:tenantId/reactivation',
  authorize('admin', 'owner'),
  followUpsController.triggerReactivation
);

router.post(
  '/tenants/:tenantId/review-request',
  authorize('admin', 'owner', 'staff'),
  followUpsController.scheduleReviewRequest
);

// Management
router.get(
  '/tenants/:tenantId/pending',
  authorize('admin', 'owner'),
  followUpsController.getPendingFollowUps
);

router.delete(
  '/jobs/:jobId',
  authorize('admin', 'owner'),
  followUpsController.cancelFollowUp
);

// Statistics
router.get(
  '/tenants/:tenantId/stats',
  authorize('admin', 'owner'),
  followUpsController.getStatistics
);

export default router;
