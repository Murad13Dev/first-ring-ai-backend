import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import tenantsService from './tenants.service';

export class TenantsController {
  /**
   * Create new tenant (Admin only)
   * POST /api/tenants
   */
  async createTenant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        name,
        businessType,
        email,
        phone,
        address,
        city,
        website,
        plan,
        ownerName,
        ownerEmail,
        ownerPassword,
      } = req.body;

      // Validation
      if (!name || !businessType || !email || !ownerName || !ownerEmail || !ownerPassword) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: name, businessType, email, ownerName, ownerEmail, ownerPassword',
        });
      }

      const result = await tenantsService.createTenant({
        name,
        businessType,
        email,
        phone,
        address,
        city,
        website,
        plan,
        ownerName,
        ownerEmail,
        ownerPassword,
      });

      return res.status(201).json({
        success: true,
        message: 'Tenant created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tenants (Admin only)
   * GET /api/tenants
   */
  async getAllTenants(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        plan,
        subscriptionStatus,
        businessType,
        search,
        page,
        limit,
      } = req.query;

      const result = await tenantsService.getAllTenants({
        plan: plan as string,
        subscriptionStatus: subscriptionStatus as string,
        businessType: businessType as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant by ID
   * GET /api/tenants/:id
   */
  async getTenantById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const tenant = await tenantsService.getTenantById(id);

      return res.status(200).json({
        success: true,
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant
   * PUT /api/tenants/:id
   */
  async updateTenant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;

      const tenant = await tenantsService.updateTenant(id, data);

      return res.status(200).json({
        success: true,
        message: 'Tenant updated successfully',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete tenant (deactivate)
   * DELETE /api/tenants/:id
   */
  async deleteTenant(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const result = await tenantsService.deleteTenant(id);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant statistics
   * GET /api/tenants/:id/stats
   */
  async getTenantStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const stats = await tenantsService.getTenantStats(id);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all tenants statistics (Admin)
   * GET /api/tenants/stats/all
   */
  async getAllTenantsStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await tenantsService.getAllTenantsStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update tenant subscription
   * PUT /api/tenants/:id/subscription
   */
  async updateSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { plan, subscriptionStatus, subscriptionId, currentPeriodEnd } = req.body;

      if (!plan || !subscriptionStatus) {
        return res.status(400).json({
          success: false,
          message: 'Plan and subscriptionStatus are required',
        });
      }

      const tenant = await tenantsService.updateSubscription(id, {
        plan,
        subscriptionStatus,
        subscriptionId,
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : undefined,
      });

      return res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: tenant,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new TenantsController();
