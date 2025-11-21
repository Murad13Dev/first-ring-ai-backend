import { Router } from 'express';
import aiAgentController from './ai-agent.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = Router();

/**
 * Twilio Webhooks (Public - no auth)
 */

/**
 * @route   POST /api/ai-agent/incoming
 * @desc    Handle incoming call from Twilio
 * @access  Public (Twilio webhook)
 */
router.post('/incoming', aiAgentController.handleIncomingCall);

/**
 * @route   POST /api/ai-agent/process
 * @desc    Process user speech input
 * @access  Public (Twilio webhook)
 */
router.post('/process', aiAgentController.processUserInput);

/**
 * @route   POST /api/ai-agent/status
 * @desc    Handle call status updates
 * @access  Public (Twilio webhook)
 */
router.post('/status', aiAgentController.handleCallStatus);

/**
 * @route   GET /api/ai-agent/outbound-twiml
 * @desc    Generate TwiML for outbound calls
 * @access  Public (Twilio webhook)
 */
router.get('/outbound-twiml', aiAgentController.generateOutboundTwiML);

/**
 * Authenticated Routes
 */

/**
 * @route   POST /api/ai-agent/outbound
 * @desc    Initiate outbound call
 * @access  Private
 */
router.post(
  '/outbound',
  authenticateToken,
  tenantIsolation,
  aiAgentController.initiateOutboundCall
);

/**
 * @route   POST /api/ai-agent/sms
 * @desc    Send SMS
 * @access  Private
 */
router.post(
  '/sms',
  authenticateToken,
  tenantIsolation,
  aiAgentController.sendSMS
);

/**
 * @route   POST /api/ai-agent/test
 * @desc    Test AI agent (development)
 * @access  Private
 */
router.post(
  '/test',
  authenticateToken,
  tenantIsolation,
  aiAgentController.testAIAgent
);

export default router;
