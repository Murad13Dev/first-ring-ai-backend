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

    return prisma.subscription.create({
      data: {
        tenantId,
        planId,
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: 'active',
      },
      include: { plan: true },
    });
  },

  // Update subscription (upgrade/downgrade)
  async updateSubscription(tenantId: string, planId: string) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new AppError('Plan not found', 404);

    return prisma.subscription.update({
      where: { tenantId },
      data: { planId },
      include: { plan: true },
    });
  },

  // Cancel subscription
  async cancelSubscription(tenantId: string, cancelAtPeriodEnd: boolean = true) {
    return prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
      },
    });
  },

  // Seed default plans
  async seedPlans() {
    const plans = [
      {
        slug: 'starter',
        name: 'Starter',
        description: 'Perfect for small businesses',
        price: 49,
        yearlyPrice: 470,
        callMinutes: 100,
        maxCalls: 200,
        maxUsers: 1,
        features: ['AI Phone Agent', 'Basic Analytics', 'Email Support'],
      },
      {
        slug: 'professional',
        name: 'Professional',
        description: 'For growing businesses',
        price: 149,
        yearlyPrice: 1430,
        callMinutes: 500,
        maxCalls: 1000,
        maxUsers: 5,
        features: ['AI Phone Agent', 'Advanced Analytics', 'Priority Support', 'Custom Prompts', 'CRM Integration'],
        isPopular: true,
      },
      {
        slug: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations',
        price: 499,
        yearlyPrice: 4790,
        callMinutes: 2000,
        maxCalls: 5000,
        maxUsers: 20,
        features: ['AI Phone Agent', 'Full Analytics', '24/7 Support', 'Custom Integration', 'Dedicated Manager', 'SLA'],
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
      const subscription = await subscriptionsService.createSubscription(tenantId, planId, billingCycle);
      res.status(201).json({ success: true, data: subscription });
    } catch (error) {
      next(error);
    }
  },

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { planId } = req.body;
      const subscription = await subscriptionsService.updateSubscription(tenantId, planId);
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
