import { Router } from 'express';
import channelsController from './channels.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';

const router = Router();

// ================== WhatsApp Routes ==================

// Webhook (public - called by Twilio)
router.post('/whatsapp/webhook', channelsController.handleWhatsAppWebhook);

// Protected WhatsApp routes
router.post(
  '/whatsapp/send',
  authenticate,
  authorize('admin', 'owner', 'staff'),
  channelsController.sendWhatsAppMessage
);

router.post(
  '/whatsapp/order-confirmation',
  authenticate,
  authorize('admin', 'owner', 'staff'),
  channelsController.sendWhatsAppOrderConfirmation
);

// ================== Web Chat Routes ==================

// Public routes for customers
router.post('/webchat/tenants/:tenantId/sessions', channelsController.createChatSession);
router.post('/webchat/sessions/:sessionId/messages', channelsController.sendChatMessage);
router.get('/webchat/sessions/:sessionId/history', channelsController.getChatHistory);
router.post('/webchat/sessions/:sessionId/end', channelsController.endChatSession);

// Protected routes for staff
router.get(
  '/webchat/tenants/:tenantId/sessions/active',
  authenticate,
  authorize('admin', 'owner', 'staff'),
  channelsController.getActiveSessions
);

router.post(
  '/webchat/sessions/:sessionId/transfer',
  authenticate,
  authorize('admin', 'owner', 'staff'),
  channelsController.transferToAgent
);

// ================== QR Ordering Routes ==================

// Public route to validate QR code
router.get('/qr/:qrId/validate', channelsController.validateQRCode);

// Protected QR routes
router.post(
  '/qr/tenants/:tenantId/generate',
  authenticate,
  authorize('admin', 'owner'),
  channelsController.generateQRCode
);

router.get(
  '/qr/tenants/:tenantId/image',
  authenticate,
  authorize('admin', 'owner'),
  channelsController.generateQRCodeImage
);

router.get(
  '/qr/tenants/:tenantId',
  authenticate,
  authorize('admin', 'owner'),
  channelsController.getTenantQRCodes
);

router.post(
  '/qr/tenants/:tenantId/bulk',
  authenticate,
  authorize('admin', 'owner'),
  channelsController.generateBulkQRCodes
);

router.delete(
  '/qr/:qrId',
  authenticate,
  authorize('admin', 'owner'),
  channelsController.deactivateQRCode
);

// ================== Statistics ==================

router.get(
  '/stats/tenants/:tenantId',
  authenticate,
  authorize('admin', 'owner'),
  channelsController.getChannelStats
);

export default router;
