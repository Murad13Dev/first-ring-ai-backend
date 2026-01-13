import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

export class CertifiedRepsService {
  /**
   * Create or update Certified Rep from Whop purchase
   */
  async handleWhopPurchase(params: {
    userId: string;
    whopMemberId: string;
    whopProductId: string;
    whopSubscriptionId?: string;
    discordUserId?: string;
  }) {
    try {
      const { userId, whopMemberId, whopProductId, whopSubscriptionId, discordUserId } = params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Create or update Certified Rep
      const certifiedRep = await prisma.certifiedRep.upsert({
        where: { userId },
        update: {
          whopMemberId,
          whopProductId,
          whopSubscriptionId,
          discordUserId: discordUserId || undefined,
          status: 'active',
          subscriptionActive: true,
          accessGrantedAt: new Date(),
          lastPaymentAt: new Date(),
        },
        create: {
          userId,
          whopMemberId,
          whopProductId,
          whopSubscriptionId,
          discordUserId: discordUserId || undefined,
          status: 'active',
          subscriptionActive: true,
          accessGrantedAt: new Date(),
          lastPaymentAt: new Date(),
        },
      });

      logger.info('Certified Rep activated', {
        repId: certifiedRep.id,
        userId,
        whopMemberId,
      });

      return certifiedRep;
    } catch (error) {
      logger.error('Handle Whop purchase error', { error });
      throw error;
    }
  }

  /**
   * Handle Whop subscription cancellation
   */
  async handleWhopCancellation(whopMemberId: string) {
    try {
      const certifiedRep = await prisma.certifiedRep.findUnique({
        where: { whopMemberId },
      });

      if (!certifiedRep) {
        logger.warn('Certified Rep not found for cancellation', { whopMemberId });
        return null;
      }

      // Update status
      const updated = await prisma.certifiedRep.update({
        where: { id: certifiedRep.id },
        data: {
          status: 'cancelled',
          subscriptionActive: false,
          accessRevokedAt: new Date(),
        },
      });

      logger.info('Certified Rep subscription cancelled', {
        repId: updated.id,
        whopMemberId,
      });

      return updated;
    } catch (error) {
      logger.error('Handle Whop cancellation error', { error });
      throw error;
    }
  }

  /**
   * Get all Certified Reps (admin)
   */
  async getAllReps(filters: {
    status?: string;
    subscriptionActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    try {
      const { status, subscriptionActive, page = 1, limit = 20 } = filters;

      const where: any = {};
      if (status) where.status = status;
      if (subscriptionActive !== undefined) where.subscriptionActive = subscriptionActive;

      const [reps, total] = await Promise.all([
        prisma.certifiedRep.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            _count: {
              select: {
                clients: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.certifiedRep.count({ where }),
      ]);

      return {
        reps,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get all reps error', { error });
      throw error;
    }
  }

  /**
   * Get rep by ID
   */
  async getRepById(repId: string) {
    try {
      const rep = await prisma.certifiedRep.findUnique({
        where: { id: repId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          clients: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!rep) {
        throw new AppError('Certified Rep not found', 404);
      }

      return rep;
    } catch (error) {
      logger.error('Get rep by ID error', { error });
      throw error;
    }
  }

  /**
   * Add client for rep
   */
  async addClient(repId: string, clientData: {
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    businessType?: string;
    setupFee?: number;
    monthlyFee?: number;
    status?: string;
    notes?: string;
  }) {
    try {
      // Verify rep exists
      const rep = await prisma.certifiedRep.findUnique({
        where: { id: repId },
      });

      if (!rep) {
        throw new AppError('Certified Rep not found', 404);
      }

      if (rep.status !== 'active' || !rep.subscriptionActive) {
        throw new AppError('Certified Rep subscription is not active', 403);
      }

      // Create client
      const client = await prisma.repClient.create({
        data: {
          repId,
          ...clientData,
        },
      });

      // Update rep stats
      await prisma.certifiedRep.update({
        where: { id: repId },
        data: {
          totalClients: { increment: 1 },
          activeClients:
            clientData.status === 'active' ? { increment: 1 } : undefined,
        },
      });

      logger.info('Client added to Certified Rep', {
        repId,
        clientId: client.id,
      });

      return client;
    } catch (error) {
      logger.error('Add client error', { error });
      throw error;
    }
  }

  /**
   * Get rep statistics
   */
  async getRepStats() {
    try {
      const [
        totalReps,
        activeReps,
        totalClients,
        activeClients,
        totalRevenue,
      ] = await Promise.all([
        prisma.certifiedRep.count(),
        prisma.certifiedRep.count({
          where: { status: 'active', subscriptionActive: true },
        }),
        prisma.repClient.count(),
        prisma.repClient.count({ where: { status: 'active' } }),
        prisma.repClient.aggregate({
          where: { status: 'active' },
          _sum: { monthlyFee: true },
        }),
      ]);

      return {
        totalReps,
        activeReps,
        inactiveReps: totalReps - activeReps,
        totalClients,
        activeClients,
        prospectClients: totalClients - activeClients,
        estimatedMonthlyRevenue: totalRevenue._sum.monthlyFee || 0,
      };
    } catch (error) {
      logger.error('Get rep stats error', { error });
      throw error;
    }
  }
}

export default new CertifiedRepsService();
