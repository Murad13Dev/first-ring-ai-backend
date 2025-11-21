import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';
import bcrypt from 'bcryptjs';

interface CreateTenantData {
  name: string;
  businessType: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  website?: string;
  plan?: string;
  // Owner user data
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

interface UpdateTenantData {
  name?: string;
  businessType?: string;
  phone?: string;
  address?: string;
  city?: string;
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

      // Check if owner email exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.ownerEmail },
      });

      if (existingUser) {
        throw new AppError('Owner email already registered', 400);
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

        // Hash password
        const passwordHash = await bcrypt.hash(data.ownerPassword, 10);

        // Create owner user
        const owner = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: data.ownerEmail,
            name: data.ownerName,
            passwordHash,
            role: 'owner',
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        });

        return { tenant, owner };
      });

      logger.info('Tenant created successfully', {
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
      });

      return result;
    } catch (error) {
      logger.error('Create tenant error', { error });
      throw error;
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

      const updated = await prisma.tenant.update({
        where: { id },
        data: {
          ...data,
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
      plan: string;
      subscriptionStatus: string;
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
