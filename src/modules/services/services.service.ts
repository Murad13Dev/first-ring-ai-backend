import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

interface CreateServiceData {
  tenantId: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration?: number;
  available?: boolean;
  image?: string;
  modifiers?: any;
  stockQuantity?: number;
  lowStockAlert?: number;
  sortOrder?: number;
}

interface UpdateServiceData {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  duration?: number;
  available?: boolean;
  image?: string;
  modifiers?: any;
  stockQuantity?: number;
  lowStockAlert?: number;
  sortOrder?: number;
}

export class ServicesService {
  /**
   * Create new service
   */
  async createService(data: CreateServiceData) {
    try {
      const service = await prisma.service.create({
        data: {
          tenantId: data.tenantId,
          name: data.name,
          description: data.description,
          category: data.category,
          price: data.price,
          duration: data.duration,
          available: data.available !== undefined ? data.available : true,
          image: data.image,
          modifiers: data.modifiers,
          stockQuantity: data.stockQuantity,
          lowStockAlert: data.lowStockAlert,
          sortOrder: data.sortOrder || 0,
        },
      });

      logger.info('Service created successfully', {
        serviceId: service.id,
        tenantId: data.tenantId,
        name: service.name,
      });

      return service;
    } catch (error) {
      logger.error('Create service error', { error });
      throw error;
    }
  }

  /**
   * Get all services for a tenant
   */
  async getServices(
    tenantId: string,
    filters?: {
      category?: string;
      available?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { tenantId };

      if (filters?.category) where.category = filters.category;
      if (filters?.available !== undefined) where.available = filters.available;
      
      if (filters?.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [services, total] = await Promise.all([
        prisma.service.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { sortOrder: 'asc' },
            { createdAt: 'desc' },
          ],
        }),
        prisma.service.count({ where }),
      ]);

      return {
        services,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get services error', { error });
      throw error;
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: string, tenantId: string) {
    try {
      const service = await prisma.service.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      return service;
    } catch (error) {
      logger.error('Get service by ID error', { error });
      throw error;
    }
  }

  /**
   * Update service
   */
  async updateService(id: string, tenantId: string, data: UpdateServiceData) {
    try {
      const service = await prisma.service.findFirst({
        where: { id, tenantId },
      });

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      const updated = await prisma.service.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      logger.info('Service updated successfully', {
        serviceId: id,
        tenantId,
      });

      return updated;
    } catch (error) {
      logger.error('Update service error', { error });
      throw error;
    }
  }

  /**
   * Delete service
   */
  async deleteService(id: string, tenantId: string) {
    try {
      const service = await prisma.service.findFirst({
        where: { id, tenantId },
      });

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      await prisma.service.delete({
        where: { id },
      });

      logger.info('Service deleted successfully', {
        serviceId: id,
        tenantId,
      });

      return { message: 'Service deleted successfully' };
    } catch (error) {
      logger.error('Delete service error', { error });
      throw error;
    }
  }

  /**
   * Get service categories for tenant
   */
  async getCategories(tenantId: string) {
    try {
      const categories = await prisma.service.findMany({
        where: {
          tenantId,
          category: { not: null },
        },
        distinct: ['category'],
        select: { category: true },
      });

      return categories.map((c) => c.category).filter(Boolean);
    } catch (error) {
      logger.error('Get categories error', { error });
      throw error;
    }
  }

  /**
   * Bulk update service availability
   */
  async bulkUpdateAvailability(
    tenantId: string,
    serviceIds: string[],
    available: boolean
  ) {
    try {
      const result = await prisma.service.updateMany({
        where: {
          id: { in: serviceIds },
          tenantId,
        },
        data: { available },
      });

      logger.info('Bulk availability update', {
        tenantId,
        count: result.count,
        available,
      });

      return {
        message: `${result.count} services updated`,
        count: result.count,
      };
    } catch (error) {
      logger.error('Bulk update availability error', { error });
      throw error;
    }
  }

  /**
   * Update stock quantity
   */
  async updateStock(
    id: string,
    tenantId: string,
    quantity: number,
    operation: 'add' | 'subtract' | 'set' = 'set'
  ) {
    try {
      const service = await prisma.service.findFirst({
        where: { id, tenantId },
      });

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      let newQuantity: number;

      if (operation === 'set') {
        newQuantity = quantity;
      } else if (operation === 'add') {
        newQuantity = (service.stockQuantity || 0) + quantity;
      } else {
        newQuantity = (service.stockQuantity || 0) - quantity;
      }

      newQuantity = Math.max(0, newQuantity);

      const updated = await prisma.service.update({
        where: { id },
        data: { stockQuantity: newQuantity },
      });

      // Check low stock alert
      if (
        updated.lowStockAlert &&
        updated.stockQuantity !== null &&
        updated.stockQuantity <= updated.lowStockAlert
      ) {
        logger.warn('Low stock alert', {
          serviceId: id,
          tenantId,
          serviceName: updated.name,
          stockQuantity: updated.stockQuantity,
          lowStockAlert: updated.lowStockAlert,
        });
        // TODO: Send notification to tenant
      }

      return updated;
    } catch (error) {
      logger.error('Update stock error', { error });
      throw error;
    }
  }

  /**
   * Get low stock services
   */
  async getLowStockServices(tenantId: string) {
    try {
      const services = await prisma.$queryRaw`
        SELECT * FROM services 
        WHERE tenant_id = ${tenantId}
        AND stock_quantity IS NOT NULL
        AND low_stock_alert IS NOT NULL
        AND stock_quantity <= low_stock_alert
        ORDER BY stock_quantity ASC
      `;

      return services;
    } catch (error) {
      logger.error('Get low stock services error', { error });
      throw error;
    }
  }

  /**
   * Duplicate service
   */
  async duplicateService(id: string, tenantId: string) {
    try {
      const original = await prisma.service.findFirst({
        where: { id, tenantId },
      });

      if (!original) {
        throw new AppError('Service not found', 404);
      }

      const { id: _, createdAt, updatedAt, ...serviceData } = original;

      const duplicate = await prisma.service.create({
        data: {
          ...serviceData,
          name: `${original.name} (Copy)`,
        },
      });

      logger.info('Service duplicated successfully', {
        originalId: id,
        duplicateId: duplicate.id,
        tenantId,
      });

      return duplicate;
    } catch (error) {
      logger.error('Duplicate service error', { error });
      throw error;
    }
  }
}

export default new ServicesService();
