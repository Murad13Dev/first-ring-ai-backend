import { Router } from 'express';
import leadsController from './leads.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Create new lead
 *     description: Create a new lead from landing page form or AI call
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source
 *               - contactName
 *               - email
 *               - phone
 *               - businessName
 *               - businessType
 *               - selectedPlan
 *             properties:
 *               source:
 *                 type: string
 *                 enum: [landing_page_form, ai_call, contact_form, referral]
 *                 example: landing_page_form
 *               contactName:
 *                 type: string
 *                 example: John Smith
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@pizzahouse.com
 *               phone:
 *                 type: string
 *                 example: "+15551234567"
 *               businessName:
 *                 type: string
 *                 example: Pizza House
 *               businessType:
 *                 type: string
 *                 enum: [restaurant, hotel, fitness, clinic, salon, other]
 *                 example: restaurant
 *               selectedPlan:
 *                 type: string
 *                 enum: [basic, pro, enterprise]
 *                 example: pro
 *               callVolume:
 *                 type: integer
 *                 example: 30
 *               challenges:
 *                 type: string
 *                 example: Missing calls during busy hours
 *               requirements:
 *                 type: string
 *                 example: Need SMS notifications
 *               website:
 *                 type: string
 *                 example: https://pizzahouse.az
 *               address:
 *                 type: string
 *                 example: Nizami st. 123, Baku
 *               urgency:
 *                 type: string
 *                 enum: [immediate, week, month, exploring]
 *                 example: week
 *               budget:
 *                 type: string
 *                 example: $100-200/month
 *               preferredContact:
 *                 type: string
 *                 enum: [phone, email]
 *                 default: phone
 *               campaign:
 *                 type: string
 *                 example: google-ads-nov
 *               utmSource:
 *                 type: string
 *                 example: google
 *               utmMedium:
 *                 type: string
 *                 example: cpc
 *               utmCampaign:
 *                 type: string
 *                 example: restaurant-campaign
 *               callId:
 *                 type: string
 *                 description: Twilio call SID (if from AI call)
 *               callDuration:
 *                 type: integer
 *                 description: Call duration in seconds
 *               callTranscript:
 *                 type: string
 *                 description: AI call transcript
 *               aiConfidence:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.94
 *               aiNotes:
 *                 type: string
 *                 description: AI-generated summary
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lead created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Bad request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', leadsController.createLead);

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Get all leads (admin only)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, contacted, qualified, in_progress, converted, lost]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, normal, high, hot]
 *         description: Filter by priority
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *         description: Filter by source
 *       - in: query
 *         name: businessType
 *         schema:
 *           type: string
 *         description: Filter by business type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lead'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 145
 *                     pages:
 *                       type: integer
 *                       example: 8
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/', authenticateAdmin, leadsController.getLeads);

/**
 * @swagger
 * /api/leads/stats:
 *   get:
 *     summary: Get lead statistics (admin only)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lead statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalLeads:
 *                       type: integer
 *                       example: 145
 *                     newLeads:
 *                       type: integer
 *                       example: 23
 *                     qualifiedLeads:
 *                       type: integer
 *                       example: 45
 *                     convertedLeads:
 *                       type: integer
 *                       example: 38
 *                     lostLeads:
 *                       type: integer
 *                       example: 15
 *                     hotLeads:
 *                       type: integer
 *                       example: 12
 *                     conversionRate:
 *                       type: number
 *                       format: float
 *                       example: 26.21
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticateAdmin, leadsController.getLeadStats);

/**
 * @swagger
 * /api/leads/payment-link/resend:
 *   post:
 *     summary: Resend payment link to tenant (admin only)
 *     description: Resend payment link for tenants with pending_payment status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *               - email
 *             properties:
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *     responses:
 *       200:
 *         description: Payment link sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Payment link has been sent successfully
 *       400:
 *         description: Bad request - Tenant already has active subscription
 *       404:
 *         description: Tenant not found
 *       401:
 *         description: Unauthorized
 */
router.post('/payment-link/resend', authenticateAdmin, leadsController.resendPaymentLink);

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     summary: Get lead by ID (admin only)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authenticateAdmin, leadsController.getLeadById);

/**
 * @swagger
 * /api/leads/{id}:
 *   put:
 *     summary: Update lead (admin only)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, contacted, qualified, in_progress, converted, lost]
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, hot]
 *               adminNotes:
 *                 type: string
 *               assignedToEmail:
 *                 type: string
 *                 format: email
 *               nextFollowUp:
 *                 type: string
 *                 format: date-time
 *               lostReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lead updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', authenticateAdmin, leadsController.updateLead);

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     summary: Delete lead (admin only)
 *     description: Delete a lead from the system. Cannot delete converted leads.
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lead deleted successfully
 *       400:
 *         description: Cannot delete converted lead
 *       404:
 *         description: Lead not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authenticateAdmin, leadsController.deleteLead);

/**
 * @swagger
 * /api/leads/{id}/convert:
 *   post:
 *     summary: Convert lead to tenant (admin only)
 *     description: Creates a new tenant and user account from a lead after payment confirmation
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead converted to tenant successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Lead converted to tenant successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     tenant:
 *                       $ref: '#/components/schemas/Tenant'
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tempPassword:
 *                       type: string
 *                       example: FRA-X9K2M7P4
 *       400:
 *         description: Lead already converted
 *       404:
 *         description: Lead not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/convert', authenticateAdmin, leadsController.convertToTenant);

export default router;
