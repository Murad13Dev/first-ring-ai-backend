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
        autoProvisionPhone,
        autoProvisionAgent,
        phoneAreaCode,
        language,
      } = req.body;

      // Validation - only basic tenant info is required
      if (!name || !businessType || !email) {
        return res.status(400).json({
          success: false,
          message: 'Required fields: name, businessType, email',
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
        autoProvisionPhone,
        autoProvisionAgent,
        phoneAreaCode,
        language,
      });

      // Customize response message based on flow
      const message = result.needsVerification
        ? 'Tenant created successfully. Verification email sent to owner.'
        : 'Tenant created successfully';

      return res.status(201).json({
        success: true,
        message,
        data: {
          tenant: result.tenant,
          owner: {
            id: result.owner.id,
            email: result.owner.email,
            name: result.owner.name,
            role: result.owner.role,
            emailVerified: result.owner.emailVerified,
          },
          needsVerification: result.needsVerification,
        },
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

      // Log incoming update request for debugging
      console.log('📝 Tenant update request:', {
        tenantId: id,
        requestBody: data,
        user: req.user?.email,
      });

      // Validate subscription status if provided
      if (data.subscriptionStatus) {
        const validStatuses = ['trial', 'active', 'cancelled', 'suspended'];
        if (!validStatuses.includes(data.subscriptionStatus)) {
          return res.status(400).json({
            success: false,
            message: `Invalid subscription status. Must be one of: ${validStatuses.join(', ')}`,
            providedStatus: data.subscriptionStatus,
          });
        }
      }

      // Validate plan if provided
      if (data.plan) {
        const validPlans = ['free', 'starter', 'basic', 'pro', 'professional', 'enterprise'];
        if (!validPlans.includes(data.plan)) {
          return res.status(400).json({
            success: false,
            message: `Invalid plan. Must be one of: ${validPlans.join(', ')}`,
            providedPlan: data.plan,
          });
        }
      }

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
      const { plan, subscriptionStatus, subscriptionId, currentPeriodEnd, status } = req.body;

      // Support both 'subscriptionStatus' and 'status' for frontend compatibility
      const finalStatus = subscriptionStatus || status;

      // Validate subscription status
      const validStatuses = ['trial', 'active', 'cancelled', 'suspended'];
      if (finalStatus && !validStatuses.includes(finalStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid subscription status. Must be one of: ${validStatuses.join(', ')}`,
          providedStatus: finalStatus,
        });
      }

      // Validate plan
      const validPlans = ['free', 'starter', 'basic', 'pro', 'professional', 'enterprise'];
      if (plan && !validPlans.includes(plan)) {
        return res.status(400).json({
          success: false,
          message: `Invalid plan. Must be one of: ${validPlans.join(', ')}`,
          providedPlan: plan,
        });
      }

      // At least one field must be provided
      if (!plan && !finalStatus && !subscriptionId && !currentPeriodEnd) {
        return res.status(400).json({
          success: false,
          message: 'At least one subscription field must be provided (plan, subscriptionStatus, subscriptionId, or currentPeriodEnd)',
        });
      }

      const updateData: any = {};
      if (plan !== undefined) updateData.plan = plan;
      if (finalStatus !== undefined) updateData.subscriptionStatus = finalStatus;
      if (subscriptionId !== undefined) updateData.subscriptionId = subscriptionId;
      if (currentPeriodEnd !== undefined) updateData.currentPeriodEnd = new Date(currentPeriodEnd);

      console.log('🔄 Subscription update request:', {
        tenantId: id,
        requestBody: req.body,
        updateData,
      });

      const tenant = await tenantsService.updateSubscription(id, updateData);

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
