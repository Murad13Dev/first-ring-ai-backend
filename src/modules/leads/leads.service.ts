import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import nodemailer from 'nodemailer';
import twilioProvisioningService from '../../services/twilio-provisioning.service';
import retellProvisioningService from '../../services/retell-provisioning.service';

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
  private transporter: nodemailer.Transporter;

  constructor() {
    // Initialize email transporter (only if credentials are configured)
    const hasEmailConfig = process.env.SMTP_HOST &&
                          process.env.SMTP_USER &&
                          process.env.SMTP_PASSWORD &&
                          process.env.SMTP_PASSWORD !== 'your-app-password';

    if (hasEmailConfig) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email credentials not configured - email notifications disabled');
      // @ts-ignore - Allow null transporter when email is disabled
      this.transporter = null;
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
    // Skip email sending if transporter is not configured
    if (!this.transporter) {
      logger.info('Email notifications skipped (not configured)', {
        leadId: lead.id,
      });
      return;
    }

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

    // Selected plan (20 points)
    if (data.selectedPlan === 'enterprise') score += 20;
    else if (data.selectedPlan === 'pro') score += 15;
    else if (data.selectedPlan === 'basic') score += 10;

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
    // Skip if email not configured
    if (!this.transporter) {
      return;
    }

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

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.SALES_EMAIL,
        subject: `${priorityEmoji} New Lead: ${lead.businessName} (${lead.selectedPlan.toUpperCase()})`,
        html,
      });

      logger.info('Admin notification sent', { leadId: lead.id });
    } catch (error) {
      logger.error('Admin notification error', { error });
    }
  }

  /**
   * Send confirmation to lead
   */
  private async sendLeadConfirmation(lead: any) {
    // Skip if email not configured
    if (!this.transporter) {
      return;
    }

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

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: lead.email,
        subject: 'Your request has been received - First Ring AI',
        html,
      });

      logger.info('Lead confirmation sent', { leadId: lead.id });
    } catch (error) {
      logger.error('Lead confirmation error', { error });
    }
  }

  /**
   * Send welcome email to new tenant
   */
  private async sendWelcomeEmail(lead: any, tenant: any, tempPassword: string) {
    // Skip if email not configured
    if (!this.transporter) {
      logger.info('Welcome email skipped (not configured)', { tenantId: tenant.id });
      return;
    }

    try {
      const html = `
        <h2>🎉 Welcome, ${tenant.name}!</h2>

        <p>Dear ${lead.contactName},</p>

        <p>Welcome to First Ring AI platform! Your account has been activated.</p>

        <h3>🔐 Login credentials:</h3>
        <table style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <tr><td><strong>Dashboard:</strong></td><td><a href="${process.env.FRONTEND_URL}">${process.env.FRONTEND_URL}</a></td></tr>
          <tr><td><strong>Email:</strong></td><td>${lead.email}</td></tr>
          <tr><td><strong>Temporary password:</strong></td><td><code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></td></tr>
        </table>

        <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffa726; margin: 20px 0;">
          <strong>⚠️ Important:</strong> Change your password after first login!
        </p>

        <h3>🚀 Next steps:</h3>
        <ol>
          <li>Login to Dashboard</li>
          <li>Complete Setup Wizard (5 minutes)</li>
          <li>Add your services/menu</li>
          <li>Add your FAQs</li>
          <li>Test your AI agent</li>
        </ol>

        <p style="margin-top: 30px;">
          <a href="${process.env.FRONTEND_URL}"
             style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Go to Dashboard
          </a>
        </p>

        <p style="margin-top: 40px;">Need help?<br>
        📧 ${process.env.SALES_EMAIL}</p>

        <p>Best regards,<br>
        First Ring AI Team</p>
      `;

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: lead.email,
        subject: '🎉 Welcome to First Ring AI!',
        html,
      });

      logger.info('Welcome email sent', { tenantId: tenant.id });
    } catch (error) {
      logger.error('Welcome email error', { error });
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
}

export default new LeadsService();
