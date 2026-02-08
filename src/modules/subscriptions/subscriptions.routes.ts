import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

const router = Router();

// ==========================================
// SERVICE
// ==========================================

const subscriptionsService = {
  // Get all plans
  async getPlans() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  },

  // Get tenant subscription
  async getSubscription(tenantId: string) {
    return prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });
  },

  // Create subscription
  async createSubscription(tenantId: string, planId: string, billingCycle: string = 'monthly') {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('Plan not found', 404);

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (billingCycle === 'yearly' ? 12 : 1));

    const [subscription] = await prisma.$transaction([
      prisma.subscription.create({
        data: {
          tenantId,
          planId,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          status: 'active',
        },
        include: { plan: true },
      }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: plan.slug,
          subscriptionStatus: 'active',
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    return subscription;
  },

  // Update subscription (upgrade/downgrade)
  async updateSubscription(tenantId: string, planId: string, billingCycle?: string) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('Plan not found', 404);

    const now = new Date();
    const cycle = billingCycle || 'monthly';
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (cycle === 'yearly' ? 12 : 1));

    const data: Record<string, any> = { planId };
    if (billingCycle) {
      data.billingCycle = billingCycle;
      data.currentPeriodStart = now;
      data.currentPeriodEnd = periodEnd;
    }

    const [subscription] = await prisma.$transaction([
      prisma.subscription.upsert({
        where: { tenantId },
        update: data,
        create: {
          tenantId,
          planId,
          billingCycle: cycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          status: 'active',
        },
        include: { plan: true },
      }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: {
          plan: plan.slug,
          subscriptionStatus: 'active',
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    return subscription;
  },

  // Cancel subscription
  async cancelSubscription(tenantId: string, cancelAtPeriodEnd: boolean = true) {
    const subscription = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) throw new AppError('Subscription not found', 404);

    const newStatus = cancelAtPeriodEnd ? 'active' : 'cancelled';

    const [updated] = await prisma.$transaction([
      prisma.subscription.update({
        where: { tenantId },
        data: {
          cancelAtPeriodEnd,
          status: newStatus,
        },
      }),
      prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionStatus: newStatus,
        },
      }),
    ]);

    return updated;
  },

  // Seed default plans
  async seedPlans() {
    const plans = [
      {
        slug: 'starter',
        name: 'Starter Plan',
        description: 'Designed for small businesses. One AI phone line with essential features.',
        price: 500,
        yearlyPrice: null, // Monthly billing only
        callMinutes: 1000,
        maxCalls: 2000, // Legacy field
        maxUsers: 1,
        maxPhoneLines: 1,
        hasUnlimitedPhoneLines: false,
        overageRatePerMinute: 0.75,
        features: [
          'One AI phone line',
          'Up to 1,000 monthly minutes',
          'Inbound call answering',
          'Order & reservation taking',
          'Business hours routing',
          'Email support',
        ],
      },
      {
        slug: 'professional',
        name: 'Professional Plan',
        description: 'Designed for growing businesses. Up to three AI phone lines with advanced features.',
        price: 1500,
        yearlyPrice: null, // Monthly billing only
        callMinutes: 3000,
        maxCalls: 6000, // Legacy field
        maxUsers: 5,
        maxPhoneLines: 3,
        hasUnlimitedPhoneLines: false,
        overageRatePerMinute: 0.75,
        features: [
          'Up to three AI phone lines',
          'Up to 3,000 monthly minutes',
          'Advanced call flows',
          'After-hours handling',
          'CRM & booking system integrations',
          'Priority support',
        ],
        isPopular: true,
      },
      {
        slug: 'enterprise',
        name: 'Enterprise Plan',
        description: 'Built for multi-location businesses and clinics. Up to ten AI phone lines.',
        price: 3000,
        yearlyPrice: null, // Monthly billing only
        callMinutes: 6000,
        maxCalls: 12000, // Legacy field
        maxUsers: 20,
        maxPhoneLines: 10,
        hasUnlimitedPhoneLines: false,
        overageRatePerMinute: 0.60,
        features: [
          'Up to ten AI phone lines',
          'Up to 6,000 monthly minutes',
          'Custom call logic by department',
          'Analytics reporting',
          'Booking & payment routing',
          'Dedicated onboarding',
          'SLA-backed support',
        ],
      },
      {
        slug: 'executive',
        name: 'Executive Plan',
        description: 'For high-volume operators and brands. Unlimited AI phone lines with full customization.',
        price: 5000,
        yearlyPrice: null, // Monthly billing only
        callMinutes: 12000,
        maxCalls: 24000, // Legacy field
        maxUsers: 50,
        maxPhoneLines: null, // Unlimited
        hasUnlimitedPhoneLines: true,
        overageRatePerMinute: 0.50,
        features: [
          'Unlimited AI phone lines',
          'Up to 12,000 monthly minutes',
          'Fully customized AI behavior',
          'White-labeled deployment',
          'Advanced integrations',
          'Dedicated account manager',
          '24/7 premium support',
        ],
      },
    ];

    for (const plan of plans) {
      await prisma.plan.upsert({
        where: { slug: plan.slug },
        update: plan,
        create: plan,
      });
    }

    return { message: 'Plans seeded successfully' };
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const subscriptionsController = {
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await subscriptionsService.getPlans();
      res.json({ success: true, data: plans });
    } catch (error) {
      next(error);
    }
  },

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const subscription = await subscriptionsService.getSubscription(tenantId);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  },

  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, planId, billingCycle } = req.body;

      if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid billingCycle. Must be one of: monthly, yearly',
          providedBillingCycle: billingCycle,
        });
      }

      const subscription = await subscriptionsService.createSubscription(tenantId, planId, billingCycle);
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  },

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { planId, billingCycle } = req.body;

      if (billingCycle && !['monthly', 'yearly'].includes(billingCycle)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid billingCycle. Must be one of: monthly, yearly',
          providedBillingCycle: billingCycle,
        });
      }

      const subscription = await subscriptionsService.updateSubscription(tenantId, planId, billingCycle);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  },

  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { cancelAtPeriodEnd } = req.body;
      const subscription = await subscriptionsService.cancelSubscription(tenantId, cancelAtPeriodEnd);
      res.json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  },

  async seedPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionsService.seedPlans();
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// ==========================================

router.get('/plans', subscriptionsController.getPlans);
router.post('/plans/seed', subscriptionsController.seedPlans);
router.get('/:tenantId', subscriptionsController.getSubscription);
router.post('/', subscriptionsController.createSubscription);
router.put('/:tenantId', subscriptionsController.updateSubscription);
router.post('/:tenantId/cancel', subscriptionsController.cancelSubscription);

export default router;
