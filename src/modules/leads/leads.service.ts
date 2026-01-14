import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import twilioProvisioningService from '../../services/twilio-provisioning.service';
import retellProvisioningService from '../../services/retell-provisioning.service';
import stripeService from '../../services/stripe.service';

interface CreateLeadData {
  source: string;
  contactName: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  selectedPlan: string;
  callVolume?: number;
  challenges?: string;
  requirements?: string;
  website?: string;
  address?: string;
  preferredContact?: string;
  urgency?: string;
  budget?: string;
  campaign?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  // AI Call data
  callId?: string;
  callDuration?: number;
  callRecordingUrl?: string;
  callTranscript?: string;
  aiConfidence?: number;
  aiNotes?: string;
}

export class LeadsService {
  private transporter: nodemailer.Transporter | null = null;
  private emailService: 'sendgrid' | 'smtp';

  constructor() {
    // Determine which email service to use
    this.emailService = (process.env.EMAIL_SERVICE as 'sendgrid' | 'smtp') || 'smtp';

    if (this.emailService === 'sendgrid' && process.env.SENDGRID_API_KEY) {
      // Initialize SendGrid
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      logger.info('Email service initialized with SendGrid');
    } else {
      // Initialize SMTP (Gmail fallback)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      logger.info('Email service initialized with SMTP (Gmail)');
    }
  }

  /**
   * Create new lead
   */
  async createLead(data: CreateLeadData) {
    try {
      // Calculate qualification score
      const qualificationScore = this.calculateQualificationScore(data);

      // Determine priority
      const priority = this.determinePriority(qualificationScore, data.urgency);

      // Create lead
      const lead = await prisma.lead.create({
        data: {
          ...data,
          qualificationScore,
          priority,
          status: 'new',
        },
      });

      logger.info('Lead created successfully', {
        leadId: lead.id,
        email: lead.email,
        source: lead.source,
      });

      // Send emails asynchronously (fire-and-forget to prevent timeout)
      this.sendLeadEmailsAsync(lead).catch((error) => {
        logger.error('Failed to send lead emails', {
          error,
          leadId: lead.id,
        });
      });

      return lead;
    } catch (error) {
      logger.error('Create lead error', { error });
      throw error;
    }
  }

  /**
   * Send lead emails asynchronously (background)
   */
  private async sendLeadEmailsAsync(lead: any): Promise<void> {
    try {
      // Send notification email to admin
      await this.sendAdminNotification(lead);
      logger.info('Admin notification sent', { leadId: lead.id });
    } catch (error) {
      logger.error('Failed to send admin notification', {
        error,
        leadId: lead.id,
      });
    }

    try {
      // Send confirmation to lead
      await this.sendLeadConfirmation(lead);
      logger.info('Lead confirmation sent', { leadId: lead.id });
    } catch (error) {
      logger.error('Failed to send lead confirmation', {
        error,
        leadId: lead.id,
      });
    }
  }

  /**
   * Get all leads (admin)
   */
  async getLeads(filters?: {
    status?: string;
    priority?: string;
    source?: string;
    businessType?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters?.status) where.status = filters.status;
      if (filters?.priority) where.priority = filters.priority;
      if (filters?.source) where.source = filters.source;
      if (filters?.businessType) where.businessType = filters.businessType;

      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' },
          ],
        }),
        prisma.lead.count({ where }),
      ]);

      return {
        leads,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get leads error', { error });
      throw error;
    }
  }

  /**
   * Get single lead by ID
   */
  async getLeadById(id: string) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id },
      });

      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      return lead;
    } catch (error) {
      logger.error('Get lead by ID error', { error });
      throw error;
    }
  }

  /**
   * Update lead
   */
  async updateLead(id: string, data: Partial<CreateLeadData> & {
    status?: string;
    priority?: string;
    adminNotes?: string;
    assignedToEmail?: string;
    nextFollowUp?: Date;
    lostReason?: string;
  }) {
    try {
      const lead = await prisma.lead.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info('Lead updated successfully', { leadId: id });

      return lead;
    } catch (error) {
      logger.error('Update lead error', { error });
      throw error;
    }
  }

  /**
   * Delete lead
   */
  async deleteLead(id: string) {
    try {
      // Check if lead exists
      const lead = await prisma.lead.findUnique({
        where: { id },
      });

      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      // Check if lead is already converted
      if (lead.status === 'converted' && lead.convertedToTenantId) {
        throw new AppError('Cannot delete a converted lead', 400);
      }

      // Delete the lead
      await prisma.lead.delete({
        where: { id },
      });

      logger.info('Lead deleted successfully', { leadId: id });

      return { message: 'Lead deleted successfully' };
    } catch (error) {
      logger.error('Delete lead error', { error });
      throw error;
    }
  }

  /**
   * Convert lead to tenant
   */
  async convertLeadToTenant(leadId: string) {
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) {
        throw new AppError('Lead not found', 404);
      }

      if (lead.status === 'converted') {
        throw new AppError('Lead already converted', 400);
      }

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: lead.email },
      });

      if (existingUser) {
        throw new AppError('A user with this email already exists', 400);
      }

      // Check if tenant with this email already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { email: lead.email },
      });

      if (existingTenant) {
        throw new AppError('A tenant with this email already exists', 400);
      }

      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: lead.businessName,
          businessType: lead.businessType,
          email: lead.email,
          phone: lead.phone,
          address: lead.address,
          plan: lead.selectedPlan,
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        },
      });

      // Generate random password
      const tempPassword = this.generateTempPassword();
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: lead.email,
          name: lead.contactName,
          passwordHash,
          role: 'owner',
          emailVerified: true, // Auto-verify converted leads
          adminApproved: true, // Auto-approve converted leads
          approvedAt: new Date(),
        },
      });

      // Update lead status
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'converted',
          convertedToTenantId: tenant.id,
          convertedAt: new Date(),
        },
      });

      logger.info('Lead converted to tenant successfully', {
        leadId,
        tenantId: tenant.id,
      });

      // Start async provisioning in background (fire-and-forget)
      // This prevents 504 timeout on slow Twilio/Retell API calls
      this.provisionServicesAsync(tenant, lead, tempPassword).catch((error) => {
        logger.error('Background provisioning failed', {
          error,
          tenantId: tenant.id,
          leadId,
        });
      });

      return {
        tenant,
        user,
        tempPassword,
      };
    } catch (error) {
      logger.error('Convert lead to tenant error', { error });
      throw error;
    }
  }

  /**
   * Provision services asynchronously in background
   * This runs after lead conversion to prevent timeout issues
   */
  private async provisionServicesAsync(
    tenant: any,
    lead: any,
    tempPassword: string
  ): Promise<void> {
    // Auto-provision Twilio phone number
    try {
      logger.info('Auto-provisioning Twilio phone number for converted lead', {
        tenantId: tenant.id,
      });

      const twilioNumber = await twilioProvisioningService.autoProvisionForTenant(
        tenant.id,
        {
          countryCode: 'US',
        }
      );

      // Update tenant with phone number
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { twilioNumber },
      });

      logger.info('Twilio phone number auto-provisioned', {
        tenantId: tenant.id,
        twilioNumber,
      });
    } catch (error) {
      logger.error('Failed to auto-provision phone number for converted lead', {
        error,
        tenantId: tenant.id,
      });
      // Don't fail if phone provisioning fails
    }

    // Auto-provision Retell AI agent
    try {
      logger.info('Auto-provisioning Retell AI agent for converted lead', {
        tenantId: tenant.id,
      });

      const retellAgentId = await retellProvisioningService.createAgentForTenant({
        tenantId: tenant.id,
        tenantName: tenant.name,
        businessType: tenant.businessType,
        language: 'en-US', // Default language, can be customized
      });

      // Update tenant with agent ID
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { retellAgentId },
      });

      logger.info('Retell AI agent auto-provisioned', {
        tenantId: tenant.id,
        retellAgentId,
      });
    } catch (error) {
      logger.error('Failed to auto-provision Retell agent for converted lead', {
        error,
        tenantId: tenant.id,
      });
      // Don't fail if agent provisioning fails
    }

    // Generate and send payment link for subscription
    try {
      logger.info('Generating payment link for new tenant', {
        tenantId: tenant.id,
        plan: tenant.plan,
      });

      await this.generateAndSendPaymentLink(tenant, lead);
    } catch (error) {
      logger.error('Failed to generate payment link for new tenant', {
        error,
        tenantId: tenant.id,
      });
      // Don't fail if payment link generation fails
    }

    // Send welcome email
    try {
      await this.sendWelcomeEmail(lead, tenant, tempPassword);
    } catch (error) {
      logger.error('Failed to send welcome email for converted lead', {
        error,
        tenantId: tenant.id,
      });
    }
  }

  /**
   * Calculate qualification score (0-100)
   */
  private calculateQualificationScore(data: CreateLeadData): number {
    let score = 0;

    // Call volume (30 points)
    if (data.callVolume) {
      if (data.callVolume >= 50) score += 30;
      else if (data.callVolume >= 20) score += 20;
      else if (data.callVolume >= 10) score += 10;
    }

    // Selected plan (30 points max)
    if (data.selectedPlan === 'executive') score += 30;
    else if (data.selectedPlan === 'enterprise') score += 25;
    else if (data.selectedPlan === 'professional' || data.selectedPlan === 'pro') score += 15;
    else if (data.selectedPlan === 'starter' || data.selectedPlan === 'basic') score += 10;

    // Urgency (20 points)
    if (data.urgency === 'immediate') score += 20;
    else if (data.urgency === 'week') score += 15;
    else if (data.urgency === 'month') score += 10;

    // AI confidence (if from AI call) (15 points)
    if (data.aiConfidence) {
      score += Math.floor(data.aiConfidence * 15);
    }

    // Has challenges/pain points (10 points)
    if (data.challenges && data.challenges.length > 50) score += 10;

    // Has website (5 points)
    if (data.website) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Determine priority based on score and urgency
   */
  private determinePriority(score: number, urgency?: string): string {
    if (score >= 80 || urgency === 'immediate') return 'hot';
    if (score >= 60) return 'high';
    if (score >= 40) return 'normal';
    return 'low';
  }

  /**
   * Send admin notification email
   */
  private async sendAdminNotification(lead: any) {
    try {
      const priorityMap: Record<string, string> = {
        hot: '🔥',
        high: '⚡',
        normal: '🟡',
        low: '⚪',
      };
      const priorityEmoji = priorityMap[lead.priority] || '🟡';

      const html = `
        <h2>${priorityEmoji} New Lead: ${lead.businessName}</h2>
        
        <h3>📊 LEAD DETAILS</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Business Name:</strong></td><td>${lead.businessName}</td></tr>
          <tr><td><strong>Business Type:</strong></td><td>${lead.businessType}</td></tr>
          <tr><td><strong>Selected Plan:</strong></td><td>${lead.selectedPlan}</td></tr>
          <tr><td><strong>Source:</strong></td><td>${lead.source}</td></tr>
        </table>

        <h3>👤 CONTACT INFO</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Name:</strong></td><td>${lead.contactName}</td></tr>
          <tr><td><strong>Email:</strong></td><td>${lead.email}</td></tr>
          <tr><td><strong>Phone:</strong></td><td>${lead.phone}</td></tr>
          <tr><td><strong>Preferred Contact:</strong></td><td>${lead.preferredContact || 'Phone'}</td></tr>
        </table>

        <h3>💼 BUSINESS INFO</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Daily Call Volume:</strong></td><td>${lead.callVolume || 'Not specified'}</td></tr>
          <tr><td><strong>Current Challenges:</strong></td><td>${lead.challenges || 'None specified'}</td></tr>
          <tr><td><strong>Special Requirements:</strong></td><td>${lead.requirements || 'None'}</td></tr>
          <tr><td><strong>Urgency:</strong></td><td>${lead.urgency || 'Not specified'}</td></tr>
        </table>

        ${lead.aiNotes ? `
        <h3>🤖 AI NOTES</h3>
        <p>${lead.aiNotes}</p>
        ` : ''}

        <h3>🎯 QUALIFICATION</h3>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td><strong>Score:</strong></td><td>${lead.qualificationScore}/100</td></tr>
          <tr><td><strong>Priority:</strong></td><td>${lead.priority.toUpperCase()}</td></tr>
        </table>

        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}/admin/leads/${lead.id}" 
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Lead in Dashboard
          </a>
        </p>
      `;

      await this.sendEmail({
        to: process.env.SALES_EMAIL!,
        subject: `${priorityEmoji} New Lead: ${lead.businessName} (${lead.selectedPlan.toUpperCase()})`,
        html,
      });

      logger.info('Admin notification sent', { leadId: lead.id });
    } catch (error) {
      logger.error('Admin notification error', { error });
      throw error; // Re-throw to be caught by retry mechanism
    }
  }

  /**
   * Send confirmation to lead
   */
  private async sendLeadConfirmation(lead: any) {
    try {
      const html = `
        <h2>Your request has been received! ✅</h2>

        <p>Dear ${lead.contactName},</p>

        <p>Thank you for your interest in First Ring AI!</p>

        <p>Your request has been successfully recorded and our team will contact you within 24 hours.</p>

        <h3>Request details:</h3>
        <ul>
          <li><strong>Business:</strong> ${lead.businessName}</li>
          <li><strong>Selected plan:</strong> ${lead.selectedPlan.toUpperCase()}</li>
          <li><strong>Email:</strong> ${lead.email}</li>
          <li><strong>Phone:</strong> ${lead.phone}</li>
        </ul>

        <p>If you have urgent questions, please contact us:</p>
        <p>📧 ${process.env.SALES_EMAIL}</p>

        <p>Best regards,<br>
        First Ring AI Team</p>
      `;

      await this.sendEmail({
        to: lead.email,
        subject: 'Your request has been received - First Ring AI',
        html,
      });

      logger.info('Lead confirmation sent', { leadId: lead.id });
    } catch (error) {
      logger.error('Lead confirmation error', { error });
      throw error; // Re-throw to be caught by retry mechanism
    }
  }

  /**
   * Generate payment link and send to tenant
   */
  private async generateAndSendPaymentLink(tenant: any, lead: any, planFromDb?: any) {
    try {
      // Get plan from database if not provided
      let plan = planFromDb;
      if (!plan) {
        plan = await prisma.plan.findUnique({
          where: { slug: tenant.plan },
        });
      }

      if (!plan) {
        throw new AppError(`Plan not found: ${tenant.plan}`, 404);
      }

      // Map plan slug to Stripe price ID
      const stripePriceMap: Record<string, string> = {
        starter: process.env.STRIPE_PRICE_ID_STARTER || '',
        professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL || '',
        enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
        executive: process.env.STRIPE_PRICE_ID_EXECUTIVE || '',
      };

      const priceId = stripePriceMap[tenant.plan];

      let checkout: { sessionId: string; checkoutUrl: string } | null = null;

      // Create Stripe checkout session if price ID is configured
      if (priceId) {
        checkout = await stripeService.createSubscriptionCheckout({
        tenantId: tenant.id,
        customerEmail: tenant.email,
        customerName: tenant.name,
        priceId,
        trialDays: 0, // No trial, immediate payment required
        metadata: {
          leadId: lead.id,
          plan: tenant.plan,
          source: 'lead_conversion',
        },
          successUrl: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${process.env.FRONTEND_URL}/subscription/cancel`,
        });

        logger.info('Payment checkout created for new tenant', {
          tenantId: tenant.id,
          sessionId: checkout.sessionId,
          checkoutUrl: checkout.checkoutUrl,
        });

        // Store checkout URL in tenant (optional, for reference)
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionStatus: 'pending_payment',
            // Note: subscriptionId field can store checkout session ID temporarily
            subscriptionId: checkout.sessionId,
          },
        });
      } else {
        logger.warn('No Stripe price ID configured for plan - email will be sent without payment link', {
          plan: tenant.plan,
          tenantId: tenant.id,
        });
      }

      // Build plan features from database
      const features: string[] = [];

      // Phone lines
      if (plan.hasUnlimitedPhoneLines) {
        features.push('Unlimited AI phone lines');
      } else if (plan.maxPhoneLines) {
        features.push(`${plan.maxPhoneLines} AI phone line${plan.maxPhoneLines > 1 ? 's' : ''}`);
      }

      // Call minutes
      features.push(`${plan.callMinutes.toLocaleString()} monthly minutes`);

      // Overage rate
      if (plan.overageRatePerMinute) {
        features.push(`$${plan.overageRatePerMinute}/minute overage`);
      }

      // Additional features from plan.features JSON
      if (plan.features && Array.isArray(plan.features)) {
        features.push(...plan.features);
      }

      const planInfo = {
        name: plan.name,
        price: `$${plan.price}/month`,
        features,
      };

      // Build email HTML with or without payment link
      const paymentSection = checkout ? `
        <p style="text-align: center; margin: 30px 0;">
          <a href="${checkout.checkoutUrl}"
             style="background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
            Complete Payment →
          </a>
        </p>

        <p style="background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0;">
          <strong>ℹ️ Secure Payment:</strong> All payments are processed securely through Stripe. Your card information is never stored on our servers.
        </p>

        <p><small>This payment link expires in 24 hours. If you need assistance, please contact us at ${process.env.SALES_EMAIL}</small></p>
      ` : `
        <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffa726; margin: 20px 0;">
          <strong>⚠️ Payment Setup Pending:</strong> We're currently configuring your payment options. Our team will contact you shortly at ${tenant.email} to complete the setup.
        </p>

        <p>If you have any questions, please contact us at ${process.env.SALES_EMAIL || 'support@firstring.ai'}</p>
      `;

      const html = `
        <h2>💳 Complete Your Subscription</h2>

        <p>Dear ${lead.contactName},</p>

        <p>Thank you for choosing First Ring AI! Your account has been created and is ready to go.</p>

        <p>To activate your <strong>${planInfo.name}</strong> subscription${checkout ? ', please complete your payment' : ', we will help you get started'}:</p>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${planInfo.name}</h3>
          <p style="font-size: 24px; color: #667eea; margin: 10px 0;"><strong>${planInfo.price}</strong></p>

          <h4>Included:</h4>
          <ul style="padding-left: 20px;">
            ${planInfo.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>

        ${paymentSection}

        <p>Best regards,<br>
        The First Ring AI Team</p>
      `;

      await this.sendEmail({
        to: tenant.email,
        subject: `Complete Your ${planInfo.name} Subscription - First Ring AI`,
        html,
      });

      logger.info('Payment link email sent', {
        tenantId: tenant.id,
        email: tenant.email,
      });
    } catch (error) {
      logger.error('Generate and send payment link error', { error });
      throw error;
    }
  }

  /**
   * Send welcome email to new tenant
   */
  private async sendWelcomeEmail(lead: any, tenant: any, tempPassword: string) {
    try {
      const html = `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; background:#F3F4F6; padding:24px;">
          <div style="max-width:640px; margin:0 auto; background:#FFFFFF; border-radius:16px; padding:24px 28px; border:1px solid #E5E7EB; color:#0F172A; line-height:1.6;">

            <h2 style="margin:0 0 16px 0; font-size:22px; font-weight:700; color:#0F172A;">
              Welcome, ${tenant.name}!
            </h2>

            <p style="margin:0 0 10px 0;">
              Dear ${lead.contactName},
            </p>

            <p style="margin:0 0 16px 0;">
              Welcome to the <strong style="color:#20C896;">First Ring AI</strong> platform. Your account has been activated and is ready to use.
            </p>

            <h3 style="margin:0 0 10px 0; font-size:16px; font-weight:700; color:#0F172A;">
              Login credentials
            </h3>

            <!-- Карта с логином -->
            <div
              style="
                margin:12px 0 20px 0;
                padding:18px 20px;
                border-radius:12px;
                background:#DDF2D3;
                border:1px solid #20C896;
              "
            >
              <table cellpadding="0" cellspacing="0" style="width:100%; font-size:13px; color:#0F172A;">
                <tr>
                  <td style="padding:4px 0; width:110px; font-weight:600;">Dashboard</td>
                  <td style="padding:4px 0;">
                    <a href="${process.env.FRONTEND_URL}" style="color:#20C896; text-decoration:none;">
                      ${process.env.FRONTEND_URL}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-weight:600; vertical-align:top;">Email</td>
                  <td style="padding:8px 0;">
                    <span
                      style="
                        display:inline-block;
                        padding:6px 12px;
                        border-radius:999px;
                        background:#FFFFFF;
                        border:1px solid #E5E7EB;
                        font-size:14px;
                        font-weight:600;
                        color:#0F172A;
                      "
                    >
                      ${lead.email}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0; font-weight:600; vertical-align:top;">Temporary password</td>
                  <td style="padding:8px 0;">
                    <span
                      style="
                        display:inline-block;
                        padding:6px 14px;
                        border-radius:8px;
                        background:#0F172A;
                        color:#FFFFFF;
                        font-size:14px;
                        letter-spacing:0.04em;
                        font-family:'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                      "
                    >
                      ${tempPassword}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Важное уведомление -->
            <div
              style="
                margin:20px 0;
                padding:12px 14px;
                border-radius:8px;
                border-left:4px solid #20C896;
                background:#F9FAFB;
                font-size:13px;
                color:#0F172A;
              "
            >
              <strong style="display:block; margin-bottom:4px;">Important</strong>
              Please change your password immediately after your first login.
            </div>

            <h3 style="margin:16px 0 8px 0; font-size:16px; font-weight:700; color:#0F172A;">
              Next steps
            </h3>
            <ol style="margin:0 0 20px 20px; padding:0; font-size:13px; color:#4B5563;">
              <li>Log in to your dashboard.</li>
              <li>Complete the setup wizard (about 5 minutes).</li>
              <li>Add your services or menu.</li>
              <li>Add your FAQs.</li>
              <li>Test your AI agent with a few calls.</li>
            </ol>

            <p style="margin:24px 0 28px 0;">
              <a
                href="${process.env.FRONTEND_URL}"
                style="
                  display:inline-block;
                  background:#20C896;
                  color:#FFFFFF;
                  padding:12px 24px;
                  border-radius:999px;
                  text-decoration:none;
                  font-size:14px;
                  font-weight:600;
                "
              >
                Go to dashboard
              </a>
            </p>

            <p style="margin:0 0 8px 0; font-size:13px; color:#4B5563;">
              Need help?<br />
              <a href="mailto:${process.env.SALES_EMAIL}" style="color:#20C896; text-decoration:none;">
                ${process.env.SALES_EMAIL}
              </a>
            </p>

            <p style="margin:16px 0 0 0; font-size:13px; color:#0F172A;">
              Best regards,<br />
              <strong style="color:#20C896;">First Ring AI Team</strong>
            </p>
          </div>
        </div>
      `;

      await this.sendEmail({
        to: lead.email,
        subject: '🎉 Welcome to First Ring AI!',
        html,
      });

      logger.info('Welcome email sent', { tenantId: tenant.id });
    } catch (error) {
      logger.error('Welcome email error', { error });
      // Don't throw - welcome email is not critical
    }
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let password = 'FRA-';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get lead statistics
   */
  async getLeadStats() {
    try {
      const [
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        lostLeads,
        hotLeads,
      ] = await Promise.all([
        prisma.lead.count(),
        prisma.lead.count({ where: { status: 'new' } }),
        prisma.lead.count({ where: { status: 'qualified' } }),
        prisma.lead.count({ where: { status: 'converted' } }),
        prisma.lead.count({ where: { status: 'lost' } }),
        prisma.lead.count({ where: { priority: 'hot' } }),
      ]);

      // Conversion rate
      const conversionRate = totalLeads > 0 
        ? ((convertedLeads / totalLeads) * 100).toFixed(2)
        : 0;

      return {
        totalLeads,
        newLeads,
        qualifiedLeads,
        convertedLeads,
        lostLeads,
        hotLeads,
        conversionRate: parseFloat(conversionRate as string),
      };
    } catch (error) {
      logger.error('Get lead stats error', { error });
      throw error;
    }
  }

  /**
   * Universal email sending method - supports both SendGrid and SMTP
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    retries?: number;
  }): Promise<void> {
    const maxRetries = options.retries || 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.emailService === 'sendgrid') {
          // SendGrid
          await sgMail.send({
            from: process.env.EMAIL_FROM!,
            to: options.to,
            subject: options.subject,
            html: options.html,
          });
        } else {
          // SMTP (Gmail)
          if (!this.transporter) {
            throw new Error('SMTP transporter not initialized');
          }
          await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            html: options.html,
          });
        }

        // Success!
        if (attempt > 1) {
          logger.info(`Email sent successfully on attempt ${attempt}`, {
            to: options.to,
            service: this.emailService,
          });
        }
        return;
      } catch (error: any) {
        lastError = error;
        logger.warn(`Email send attempt ${attempt}/${maxRetries} failed`, {
          error: error.message,
          code: error.code,
          to: options.to,
          service: this.emailService,
        });

        if (attempt < maxRetries) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to send email after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Resend payment link for existing tenant
   */
  async resendPaymentLinkForTenant(tenantId: string, email: string) {
    try {
      // Get tenant with plan details
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      // Check if tenant already has active subscription
      if (tenant.subscriptionStatus === 'active') {
        throw new AppError('Tenant already has an active subscription', 400);
      }

      // Get plan details from database
      const plan = await prisma.plan.findUnique({
        where: { slug: tenant.plan },
      });

      if (!plan) {
        throw new AppError(`Plan not found: ${tenant.plan}`, 404);
      }

      // Get lead for contact info (if exists)
      const lead = await prisma.lead.findFirst({
        where: { email: tenant.email },
      });

      // Create mock lead object if not found
      const leadData = lead || {
        contactName: tenant.name,
        email: tenant.email,
        businessName: tenant.name,
        selectedPlan: tenant.plan,
      };

      // Generate and send payment link with plan details
      await this.generateAndSendPaymentLink(tenant, leadData, plan);

      logger.info('Payment link resent successfully', {
        tenantId,
        email,
        plan: plan.name,
        price: plan.price,
      });

      return { message: 'Payment link sent successfully' };
    } catch (error) {
      logger.error('Resend payment link error', { error });
      throw error;
    }
  }
}

export default new LeadsService();
