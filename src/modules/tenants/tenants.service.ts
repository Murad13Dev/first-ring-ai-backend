import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import bcrypt from 'bcryptjs';
import twilioProvisioningService from '../../services/twilio-provisioning.service';
import retellProvisioningService from '../../services/retell-provisioning.service';

interface CreateTenantData {
  name: string;
  businessType: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  website?: string;
  plan?: string;
  // Owner user data (OPTIONAL - if not provided, uses tenant email/name)
  ownerName?: string;
  ownerEmail?: string;
  ownerPassword?: string;
  // Auto-provisioning options
  autoProvisionPhone?: boolean; // Automatically provision Twilio number
  autoProvisionAgent?: boolean; // Automatically create Retell agent
  phoneAreaCode?: string; // Area code for phone number (e.g., '929')
  language?: string; // Agent language (default: 'en-US')
}

interface UpdateTenantData {
  name?: string;
  businessType?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  timezone?: string;
  businessHours?: any;
  plan?: string;
  subscriptionStatus?: string;
  twilioNumber?: string;
  squareLocationId?: string;
  googleCalendarId?: string;
  googleSheetId?: string;
  settings?: any;
}

export class TenantsService {
  /**
   * Create new tenant with owner user
   */
  async createTenant(data: CreateTenantData) {
    try {
      // Check if email already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { email: data.email },
      });

      if (existingTenant) {
        throw new AppError('Email already registered', 400);
      }

      // Determine owner email (use provided or fallback to tenant email)
      const ownerEmail = data.ownerEmail || data.email;
      const ownerName = data.ownerName || data.name;

      // Check if owner email exists
      const existingUser = await prisma.user.findUnique({
        where: { email: ownerEmail },
      });

      if (existingUser) {
        throw new AppError('Owner email already registered', 400);
      }

      // Determine if we need email verification flow
      const needsVerification = !data.ownerPassword;

      // Generate verification token if password not provided
      let verificationToken: string | undefined;
      let verificationTokenExpires: Date | undefined;

      if (needsVerification) {
        // Generate random token
        const crypto = require('crypto');
        verificationToken = crypto.randomBytes(32).toString('hex');
        // Token expires in 24 hours
        verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      // Create tenant and owner in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: data.name,
            businessType: data.businessType,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            website: data.website,
            plan: data.plan || 'free',
            subscriptionStatus: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          },
        });

        // Prepare user data
        const userData: any = {
          tenantId: tenant.id,
          email: ownerEmail,
          name: ownerName,
          role: 'owner',
          emailVerified: !needsVerification, // Auto-verify if password provided
          adminApproved: !needsVerification, // Auto-approve if password provided
        };

        // Add password or verification token
        if (needsVerification) {
          // Email verification flow - no password yet
          userData.verificationToken = verificationToken;
          userData.verificationTokenExpires = verificationTokenExpires;
          userData.passwordHash = ''; // Temporary empty password
        } else {
          // Direct creation with password
          userData.passwordHash = await bcrypt.hash(data.ownerPassword!, 10);
          userData.approvedAt = new Date();
        }

        // Create owner user
        const owner = await tx.user.create({
          data: userData,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            verificationToken: true,
            createdAt: true,
          },
        });

        return { tenant, owner, needsVerification, verificationToken };
      });

      logger.info('Tenant created successfully', {
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
      });

      // Run post-creation tasks asynchronously (fire-and-forget to prevent timeout)
      this.runPostCreationTasksAsync(result, data).catch((error) => {
        logger.error('Failed to run post-creation tasks', {
          error,
          tenantId: result.tenant.id,
        });
      });

      return result;
    } catch (error) {
      logger.error('Create tenant error', { error });
      throw error;
    }
  }

  /**
   * Run post-creation tasks asynchronously (background)
   * This includes: phone provisioning, agent provisioning, and email sending
   */
  private async runPostCreationTasksAsync(
    result: any,
    data: CreateTenantData
  ): Promise<void> {
    // Auto-provision Twilio phone number if requested
    if (data.autoProvisionPhone) {
      try {
        logger.info('Auto-provisioning Twilio phone number', {
          tenantId: result.tenant.id,
        });

        const twilioNumber = await twilioProvisioningService.autoProvisionForTenant(
          result.tenant.id,
          {
            areaCode: data.phoneAreaCode,
            countryCode: 'US',
          }
        );

        // Update tenant with phone number
        await prisma.tenant.update({
          where: { id: result.tenant.id },
          data: { twilioNumber },
        });

        logger.info('Twilio phone number provisioned', {
          tenantId: result.tenant.id,
          twilioNumber,
        });
      } catch (error) {
        logger.error('Failed to auto-provision phone number', {
          error,
          tenantId: result.tenant.id,
        });
        // Don't fail - just log the error
      }
    }

    // Auto-provision Retell AI agent if requested
    if (data.autoProvisionAgent) {
      try {
        logger.info('Auto-provisioning Retell AI agent', {
          tenantId: result.tenant.id,
        });

        const retellAgentId = await retellProvisioningService.createAgentForTenant({
          tenantId: result.tenant.id,
          tenantName: result.tenant.name,
          businessType: result.tenant.businessType,
          language: data.language || 'en-US',
        });

        // Update tenant with agent ID
        await prisma.tenant.update({
          where: { id: result.tenant.id },
          data: { retellAgentId },
        });

        logger.info('Retell AI agent provisioned', {
          tenantId: result.tenant.id,
          retellAgentId,
        });
      } catch (error) {
        logger.error('Failed to auto-provision Retell agent', {
          error,
          tenantId: result.tenant.id,
        });
        // Don't fail - just log the error
      }
    }

    // Send verification email if needed
    if (result.needsVerification && result.verificationToken) {
      try {
        const { emailService } = require('../../services/email.service');
        await emailService.sendTenantWelcomeEmail(
          result.owner.email,
          result.owner.name,
          result.tenant.name,
          result.verificationToken
        );

        logger.info('Verification email sent', {
          tenantId: result.tenant.id,
          ownerEmail: result.owner.email,
        });
      } catch (emailError) {
        logger.error('Failed to send verification email', {
          error: emailError,
          tenantId: result.tenant.id,
        });
        // Don't fail - just log the error
      }
    }
  }

  /**
   * Get all tenants (admin only)
   */
  async getAllTenants(filters?: {
    plan?: string;
    subscriptionStatus?: string;
    businessType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters?.plan) where.plan = filters.plan;
      if (filters?.subscriptionStatus) where.subscriptionStatus = filters.subscriptionStatus;
      if (filters?.businessType) where.businessType = filters.businessType;
      
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [tenants, total] = await Promise.all([
        prisma.tenant.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            users: {
              where: { role: 'owner' },
              select: {
                id: true,
                name: true,
                email: true,
                lastLoginAt: true,
              },
            },
            _count: {
              select: {
                users: true,
                services: true,
                bookings: true,
                orders: true,
                calls: true,
              },
            },
          },
        }),
        prisma.tenant.count({ where }),
      ]);

      return {
        tenants,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get all tenants error', { error });
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(id: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              phone: true,
              isActive: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              services: true,
              faqs: true,
              bookings: true,
              orders: true,
              calls: true,
            },
          },
        },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      return tenant;
    } catch (error) {
      logger.error('Get tenant by ID error', { error });
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(id: string, data: UpdateTenantData) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      // Filter data to only include valid updatable fields
      const updateData: any = {};
      const allowedFields = [
        'name',
        'businessType',
        'phone',
        'address',
        'city',
        'country',
        'website',
        'timezone',
        'businessHours',
        'plan',
        'subscriptionStatus',
        'twilioNumber',
        'squareLocationId',
        'googleCalendarId',
        'googleSheetId',
        'settings',
      ];

      for (const field of allowedFields) {
        if (data[field as keyof UpdateTenantData] !== undefined) {
          updateData[field] = data[field as keyof UpdateTenantData];
        }
      }

      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      logger.info('Tenant updated successfully', { tenantId: id });

      return updated;
    } catch (error) {
      logger.error('Update tenant error', { error });
      throw error;
    }
  }

  /**
   * Delete tenant (soft delete - deactivate)
   */
  async deleteTenant(id: string) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id },
      });

      if (!tenant) {
        throw new AppError('Tenant not found', 404);
      }

      // Deactivate tenant (change subscription status)
      await prisma.tenant.update({
        where: { id },
        data: {
          subscriptionStatus: 'cancelled',
        },
      });

      // Deactivate all users
      await prisma.user.updateMany({
        where: { tenantId: id },
        data: { isActive: false },
      });

      logger.info('Tenant deactivated successfully', { tenantId: id });

      return { message: 'Tenant deactivated successfully' };
    } catch (error) {
      logger.error('Delete tenant error', { error });
      throw error;
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId: string) {
    try {
      const [
        totalServices,
        totalFaqs,
        totalBookings,
        totalOrders,
        totalCalls,
        recentBookings,
        recentOrders,
        recentCalls,
      ] = await Promise.all([
        prisma.service.count({ where: { tenantId } }),
        prisma.fAQ.count({ where: { tenantId } }),
        prisma.booking.count({ where: { tenantId } }),
        prisma.order.count({ where: { tenantId } }),
        prisma.call.count({ where: { tenantId } }),
        prisma.booking.count({
          where: {
            tenantId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
        prisma.order.count({
          where: {
            tenantId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.call.count({
          where: {
            tenantId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      // Calculate revenue (last 7 days)
      const ordersRevenue = await prisma.order.aggregate({
        where: {
          tenantId,
          paymentStatus: 'paid',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: {
          total: true,
        },
      });

      return {
        total: {
          services: totalServices,
          faqs: totalFaqs,
          bookings: totalBookings,
          orders: totalOrders,
          calls: totalCalls,
        },
        last7Days: {
          bookings: recentBookings,
          orders: recentOrders,
          calls: recentCalls,
          revenue: ordersRevenue._sum.total || 0,
        },
      };
    } catch (error) {
      logger.error('Get tenant stats error', { error });
      throw error;
    }
  }

  /**
   * Get all tenants statistics (admin)
   */
  async getAllTenantsStats() {
    try {
      const [
        totalTenants,
        activeTenants,
        trialTenants,
        cancelledTenants,
        totalRevenue,
      ] = await Promise.all([
        prisma.tenant.count(),
        prisma.tenant.count({ where: { subscriptionStatus: 'active' } }),
        prisma.tenant.count({ where: { subscriptionStatus: 'trial' } }),
        prisma.tenant.count({ where: { subscriptionStatus: 'cancelled' } }),
        prisma.order.aggregate({
          where: { paymentStatus: 'paid' },
          _sum: { total: true },
        }),
      ]);

      // Tenants by plan
      const byPlan = await prisma.tenant.groupBy({
        by: ['plan'],
        _count: true,
      });

      // Tenants by business type
      const byBusinessType = await prisma.tenant.groupBy({
        by: ['businessType'],
        _count: true,
      });

      return {
        totalTenants,
        activeTenants,
        trialTenants,
        cancelledTenants,
        totalRevenue: totalRevenue._sum.total || 0,
        byPlan,
        byBusinessType,
      };
    } catch (error) {
      logger.error('Get all tenants stats error', { error });
      throw error;
    }
  }

  /**
   * Update tenant subscription
   */
  async updateSubscription(
    tenantId: string,
    data: {
      plan?: string;
      subscriptionStatus?: string;
      subscriptionId?: string;
      currentPeriodEnd?: Date;
    }
  ) {
    try {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data,
      });

      logger.info('Tenant subscription updated', {
        tenantId,
        plan: data.plan,
        status: data.subscriptionStatus,
      });

      return tenant;
    } catch (error) {
      logger.error('Update subscription error', { error });
      throw error;
    }
  }
}

export default new TenantsService();
