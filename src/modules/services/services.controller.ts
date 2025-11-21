import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import servicesService from './services.service';

export class ServicesController {
  /**
   * Create service
   * POST /api/services
   */
  async createService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const {
        name,
        description,
        category,
        price,
        duration,
        available,
        image,
        modifiers,
        stockQuantity,
        lowStockAlert,
        sortOrder,
      } = req.body;

      if (!name || price === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Name and price are required',
        });
      }

      const service = await servicesService.createService({
        tenantId,
        name,
        description,
        category,
        price: parseFloat(price),
        duration,
        available,
        image,
        modifiers,
        stockQuantity,
        lowStockAlert,
        sortOrder,
      });

      return res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all services
   * GET /api/services
   */
  async getServices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { category, available, search, page, limit } = req.query;

      const result = await servicesService.getServices(tenantId, {
        category: category as string,
        available: available === 'true',
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
   * Get service by ID
   * GET /api/services/:id
   */
  async getServiceById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const service = await servicesService.getServiceById(id, tenantId);

      return res.status(200).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service
   * PUT /api/services/:id
   */
  async updateService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const data = req.body;

      const service = await servicesService.updateService(id, tenantId, data);

      return res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete service
   * DELETE /api/services/:id
   */
  async deleteService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const result = await servicesService.deleteService(id, tenantId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get categories
   * GET /api/services/categories/list
   */
  async getCategories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;

      const categories = await servicesService.getCategories(tenantId);

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update availability
   * PUT /api/services/bulk/availability
   */
  async bulkUpdateAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { serviceIds, available } = req.body;

      if (!serviceIds || !Array.isArray(serviceIds) || available === undefined) {
        return res.status(400).json({
          success: false,
          message: 'serviceIds (array) and available (boolean) are required',
        });
      }

      const result = await servicesService.bulkUpdateAvailability(
        tenantId,
        serviceIds,
        available
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: { count: result.count },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update stock
   * PUT /api/services/:id/stock
   */
  async updateStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const { quantity, operation } = req.body;

      if (quantity === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Quantity is required',
        });
      }

      const service = await servicesService.updateStock(
        id,
        tenantId,
        parseInt(quantity),
        operation || 'set'
      );

      return res.status(200).json({
        success: true,
        message: 'Stock updated successfully',
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get low stock services
   * GET /api/services/stock/low
   */
  async getLowStockServices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;

      const services = await servicesService.getLowStockServices(tenantId);

      return res.status(200).json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate service
   * POST /api/services/:id/duplicate
   */
  async duplicateService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const duplicate = await servicesService.duplicateService(id, tenantId);

      return res.status(201).json({
        success: true,
        message: 'Service duplicated successfully',
        data: duplicate,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ServicesController();
