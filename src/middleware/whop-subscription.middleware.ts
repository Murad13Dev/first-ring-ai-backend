import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import { AppError } from './error.middleware';

/**
 * Whop Subscription Middleware
 *
 * Strategy: SOFT BLOCK with 7-day grace period
 *
 * - If subscription is active: Allow access ✓
 * - If subscription expired but within grace period (7 days): Allow access + warning
 * - If grace period ended: Block access (403 Forbidden)
 *
 * Response includes subscriptionStatus field for frontend to display warnings
 */

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
  };
  subscriptionStatus?: {
    isActive: boolean;
    isExpired: boolean;
    isInGracePeriod: boolean;
    expiryDate?: Date;
    gracePeriodEnds?: Date;
    warning?: string;
  };
}

export const checkWhopSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip if no user (will be caught by auth middleware)
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;

    // Get user with subscription details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        whopMembershipId: true,
        whopSubscriptionActive: true,
        whopSubscriptionExpiry: true,
        whopGracePeriodEnds: true,
        whopLastCheckedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // CASE 1: No Whop membership linked (new user or not required)
    if (!user.whopMembershipId) {
      logger.debug('User has no Whop membership linked', { userId });
      // Allow access for now (can be changed based on business logic)
      return next();
    }

    const now = new Date();

    // CASE 2: Subscription is active
    if (user.whopSubscriptionActive) {
      // Check if approaching expiry (within 3 days)
      if (user.whopSubscriptionExpiry) {
        const daysUntilExpiry = Math.ceil(
          (user.whopSubscriptionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
          req.subscriptionStatus = {
            isActive: true,
            isExpired: false,
            isInGracePeriod: false,
            expiryDate: user.whopSubscriptionExpiry,
            warning: `Your subscription expires in ${daysUntilExpiry} day(s). Please renew to avoid service interruption.`,
          };
        }
      }

      logger.debug('Whop subscription is active', { userId, email: user.email });
      return next();
    }

    // CASE 3: Subscription expired - check grace period
    if (user.whopGracePeriodEnds) {
      const gracePeriodActive = now < user.whopGracePeriodEnds;

      if (gracePeriodActive) {
        // SOFT BLOCK: Allow access but send warning
        const daysRemaining = Math.ceil(
          (user.whopGracePeriodEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        req.subscriptionStatus = {
          isActive: false,
          isExpired: true,
          isInGracePeriod: true,
          expiryDate: user.whopSubscriptionExpiry || undefined,
          gracePeriodEnds: user.whopGracePeriodEnds,
          warning: `⚠️ Your subscription has expired! You have ${daysRemaining} day(s) remaining in your grace period. Renew now to continue using First Ring AI.`,
        };

        logger.warn('User in grace period', {
          userId,
          email: user.email,
          daysRemaining,
        });

        return next();
      }
    }

    // CASE 4: HARD BLOCK - Grace period ended
    logger.error('Whop subscription expired and grace period ended', {
      userId,
      email: user.email,
      whopMembershipId: user.whopMembershipId,
      expiryDate: user.whopSubscriptionExpiry,
      gracePeriodEnds: user.whopGracePeriodEnds,
    });

    throw new AppError(
      'Your subscription has expired. Please renew your Whop subscription to continue using First Ring AI.',
      403
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to inject subscription status into API responses
 * Use this AFTER checkWhopSubscription to add warning to response
 */
export const injectSubscriptionStatus = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to inject subscription status
  res.json = function (body: any) {
    if (req.subscriptionStatus?.warning) {
      return originalJson({
        ...body,
        _subscription: {
          status: req.subscriptionStatus.isActive ? 'active' : 'expired',
          warning: req.subscriptionStatus.warning,
          isInGracePeriod: req.subscriptionStatus.isInGracePeriod,
          gracePeriodEnds: req.subscriptionStatus.gracePeriodEnds,
        },
      });
    }
    return originalJson(body);
  };

  next();
};

/**
 * Helper: Calculate grace period end date (7 days from expiry)
 */
export const calculateGracePeriodEnd = (expiryDate: Date): Date => {
  const gracePeriod = new Date(expiryDate);
  gracePeriod.setDate(gracePeriod.getDate() + 7);
  return gracePeriod;
};

/**
 * Helper: Check if user needs subscription check (based on role)
 *
 * Currently: All tenant owners need Whop subscription
 * Staff/managers inherit access from tenant owner
 */
export const requiresWhopSubscription = (role: string): boolean => {
  return role === 'owner';
};
