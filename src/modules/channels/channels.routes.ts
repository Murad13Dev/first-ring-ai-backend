import { Router } from 'express';
import channelsController from './channels.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// ================== WhatsApp Routes ==================

// Webhook (public - called by Twilio)
router.post('/whatsapp/webhook', channelsController.handleWhatsAppWebhook);

// Protected WhatsApp routes
router.post('/whatsapp/send', authenticateToken, channelsController.sendWhatsAppMessage);
router.post('/whatsapp/order-confirmation', authenticateToken, channelsController.sendWhatsAppOrderConfirmation);

// ================== Web Chat Routes ==================

// Public routes for customers
router.post('/webchat/tenants/:tenantId/sessions', channelsController.createChatSession);
router.post('/webchat/sessions/:sessionId/messages', channelsController.sendChatMessage);
router.get('/webchat/sessions/:sessionId/history', channelsController.getChatHistory);
router.post('/webchat/sessions/:sessionId/end', channelsController.endChatSession);

// Protected routes for staff
router.get('/webchat/tenants/:tenantId/sessions/active', authenticateToken, channelsController.getActiveSessions);
router.post('/webchat/sessions/:sessionId/transfer', authenticateToken, channelsController.transferToAgent);

// ================== QR Ordering Routes ==================

// Public route to validate QR code
router.get('/qr/:qrId/validate', channelsController.validateQRCode);

// Protected QR routes
router.post('/qr/tenants/:tenantId/generate', authenticateToken, channelsController.generateQRCode);
router.get('/qr/tenants/:tenantId/image', authenticateToken, channelsController.generateQRCodeImage);
router.get('/qr/tenants/:tenantId', authenticateToken, channelsController.getTenantQRCodes);
router.post('/qr/tenants/:tenantId/bulk', authenticateToken, channelsController.generateBulkQRCodes);
router.delete('/qr/:qrId', authenticateToken, channelsController.deactivateQRCode);

// ================== Statistics ==================

router.get('/stats/tenants/:tenantId', authenticateToken, channelsController.getChannelStats);

export default router;
