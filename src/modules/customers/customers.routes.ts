import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest, authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';
import prisma from '../../config/database';

const router = Router();

// ==========================================
// CUSTOMERS SERVICE
// ==========================================

const customersService = {
  async getCustomers(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    search?: string
  ) {
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total, page, pages: Math.ceil(total / limit) };
  },

  async getCustomerById(tenantId: string, customerId: string) {
    return prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
  },

  async createCustomer(
    tenantId: string,
    data: { phone: string; email?: string; name?: string; tags?: string[] }
  ) {
    return prisma.customer.create({
      data: {
        tenantId,
        phone: data.phone,
        email: data.email,
        name: data.name,
        tags: data.tags || [],
      },
    });
  },

  async updateCustomer(
    tenantId: string,
    customerId: string,
    data: { email?: string; name?: string; tags?: string[] }
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) return null;

    return prisma.customer.update({
      where: { id: customerId },
      data,
    });
  },

  async deleteCustomer(tenantId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) return null;

    await prisma.customer.delete({ where: { id: customerId } });
    return { deleted: true };
  },

  async getCustomerStats(tenantId: string) {
    const [total, totalSpent, avgSpent] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.customer.aggregate({
        where: { tenantId },
        _sum: { totalSpent: true },
      }),
      prisma.customer.aggregate({
        where: { tenantId },
        _avg: { totalSpent: true, loyaltyPoints: true, orderCount: true },
      }),
    ]);

    return {
      totalCustomers: total,
      totalRevenue: totalSpent._sum.totalSpent || 0,
      avgSpent: avgSpent._avg.totalSpent || 0,
      avgLoyaltyPoints: avgSpent._avg.loyaltyPoints || 0,
      avgOrderCount: avgSpent._avg.orderCount || 0,
    };
  },
};

// ==========================================
// CONTROLLER
// ==========================================

const customersController = {
  async getCustomers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { page = 1, limit = 20, search } = req.query;
      const result = await customersService.getCustomers(
        tenantId,
        Number(page),
        Number(limit),
        search as string
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getCustomerById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const customer = await customersService.getCustomerById(tenantId, req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  },

  async createCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { phone, email, name, tags } = req.body;

      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone is required' });
      }

      const customer = await customersService.createCustomer(tenantId, {
        phone,
        email,
        name,
        tags,
      });
      res.status(201).json({ success: true, data: customer });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          message: 'Customer with this phone number already exists',
        });
      }
      next(error);
    }
  },

  async updateCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { email, name, tags } = req.body;
      const customer = await customersService.updateCustomer(tenantId, req.params.id, {
        email,
        name,
        tags,
      });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  },

  async deleteCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const result = await customersService.deleteCustomer(tenantId, req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      res.json({ success: true, message: 'Customer deleted' });
    } catch (error) {
      next(error);
    }
  },

  async getCustomerStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const stats = await customersService.getCustomerStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },
};

// ==========================================
// ROUTES
// ==========================================

router.use(authenticateToken, tenantIsolation);

router.get('/', customersController.getCustomers);
router.get('/stats', customersController.getCustomerStats);
router.get('/:id', customersController.getCustomerById);
router.post('/', customersController.createCustomer);
router.put('/:id', customersController.updateCustomer);
router.delete('/:id', customersController.deleteCustomer);

export default router;
