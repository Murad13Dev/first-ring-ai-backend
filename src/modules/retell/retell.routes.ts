import { Router } from 'express';
import { retellController } from './retell.controller';

const router = Router();

/**
 * @swagger
 * /api/retell/webhook:
 *   post:
 *     summary: Retell AI webhook endpoint
 *     tags: [Retell]
 *     description: Receives webhooks from Retell AI for call events and function calls
 */
router.post('/webhook', retellController.webhook);

/**
 * @swagger
 * /api/retell/functions/general:
 *   post:
 *     summary: General platform functions
 *     tags: [Retell]
 *     description: Functions for main AI agent (pricing, features, demos)
 */
router.post('/functions/general', retellController.generalFunctions);

/**
 * @swagger
 * /api/retell/functions/{tenantId}:
 *   post:
 *     summary: Client-specific functions
 *     tags: [Retell]
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema:
 *           type: string
 */
router.post('/functions/:tenantId', retellController.clientFunctions);

/**
 * @swagger
 * /api/retell/functions/{tenantId}/available:
 *   get:
 *     summary: Get available functions for tenant
 *     tags: [Retell]
 */
router.get('/functions/:tenantId/available', retellController.getAvailableFunctions);

export default router;
