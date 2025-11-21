import { Request, Response, NextFunction } from 'express';
import posIntegrationsService from './pos-integrations.service';
import { AppError } from '../../middleware/error.middleware';

export class POSIntegrationsController {
  /**
   * Configure POS for tenant
   */
  async configurePOS(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const config = req.body;

      if (!config.provider || !config.apiKey) {
        throw new AppError('Provider and API key are required', 400);
      }

      const result = await posIntegrationsService.configurePOS(tenantId, config);

      res.status(200).json({
        success: true,
        message: 'POS configured successfully',
        data: { provider: config.provider },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get POS configuration
   */
  async getPOSConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const config = await posIntegrationsService.getPOSConfig(tenantId);

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Test POS connection
   */
  async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const result = await posIntegrationsService.testConnection(tenantId);

      res.status(200).json({
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Push order to POS
   */
  async pushOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, orderId } = req.params;
      const result = await posIntegrationsService.pushOrder(tenantId, orderId);

      res.status(200).json({
        success: true,
        message: 'Order pushed to POS',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Push appointment to POS
   */
  async pushAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, bookingId } = req.params;
      const result = await posIntegrationsService.pushAppointment(tenantId, bookingId);

      res.status(200).json({
        success: true,
        message: 'Appointment pushed to POS',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync menu from POS
   */
  async syncMenu(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const items = await posIntegrationsService.syncMenu(tenantId);

      res.status(200).json({
        success: true,
        message: 'Menu synced from POS',
        data: { items, count: items.length },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get availability from POS
   */
  async getAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { date, serviceId } = req.query;

      if (!date) {
        throw new AppError('Date is required', 400);
      }

      const slots = await posIntegrationsService.getAvailability(
        tenantId,
        new Date(date as string),
        serviceId as string
      );

      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel order in POS
   */
  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, orderId } = req.params;
      await posIntegrationsService.cancelOrder(tenantId, orderId);

      res.status(200).json({
        success: true,
        message: 'Order canceled in POS',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get supported POS providers
   */
  async getSupportedProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const providers = posIntegrationsService.getSupportedProviders();

      res.status(200).json({
        success: true,
        data: providers,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new POSIntegrationsController();
