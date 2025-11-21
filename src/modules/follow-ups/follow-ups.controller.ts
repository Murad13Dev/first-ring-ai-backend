import { Request, Response, NextFunction } from 'express';
import followUpsService from './follow-ups.service';
import { AppError } from '../../middleware/error.middleware';

export class FollowUpsController {
  /**
   * Configure follow-up automation
   */
  async configureFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const config = { tenantId, ...req.body };

      if (!config.type || !config.template) {
        throw new AppError('Type and template are required', 400);
      }

      const result = await followUpsService.configureFollowUp(config);

      res.status(200).json({
        success: true,
        message: 'Follow-up configured',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow-up configurations
   */
  async getConfigurations(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const configs = await followUpsService.getConfigurations(tenantId);

      res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle follow-up automation
   */
  async toggleFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, type } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        throw new AppError('Enabled must be a boolean', 400);
      }

      const result = await followUpsService.toggleFollowUp(tenantId, type as any, enabled);

      res.status(200).json({
        success: true,
        message: `Follow-up ${enabled ? 'enabled' : 'disabled'}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule missed call follow-up
   */
  async scheduleMissedCallFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { phone, callTime } = req.body;

      if (!phone) {
        throw new AppError('Phone is required', 400);
      }

      const job = await followUpsService.scheduleMissedCallFollowUp(
        tenantId,
        phone,
        callTime ? new Date(callTime) : new Date()
      );

      res.status(201).json({
        success: true,
        message: 'Missed call follow-up scheduled',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule order upsell
   */
  async scheduleOrderUpsell(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, orderId } = req.params;

      const job = await followUpsService.scheduleOrderUpsell(tenantId, orderId);

      res.status(201).json({
        success: true,
        message: 'Order upsell scheduled',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule booking reminder
   */
  async scheduleBookingReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, bookingId } = req.params;

      const job = await followUpsService.scheduleBookingReminder(tenantId, bookingId);

      res.status(201).json({
        success: true,
        message: 'Booking reminder scheduled',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule aftercare follow-up
   */
  async scheduleAftercareFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, bookingId } = req.params;
      const { serviceName } = req.body;

      if (!serviceName) {
        throw new AppError('Service name is required', 400);
      }

      const job = await followUpsService.scheduleAftercareFollowUp(tenantId, bookingId, serviceName);

      res.status(201).json({
        success: true,
        message: 'Aftercare follow-up scheduled',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule loyalty reward notification
   */
  async scheduleLoyaltyReward(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { customerId, points, reward } = req.body;

      if (!customerId || !points || !reward) {
        throw new AppError('Customer ID, points, and reward are required', 400);
      }

      const job = await followUpsService.scheduleLoyaltyReward(tenantId, customerId, points, reward);

      res.status(201).json({
        success: true,
        message: 'Loyalty reward notification scheduled',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Trigger reactivation campaign
   */
  async triggerReactivation(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { inactiveDays } = req.body;

      const jobs = await followUpsService.scheduleReactivation(tenantId, inactiveDays || 30);

      res.status(201).json({
        success: true,
        message: 'Reactivation campaign scheduled',
        data: { scheduledCount: jobs?.length || 0 },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedule review request
   */
  async scheduleReviewRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { orderId, bookingId } = req.body;

      if (!orderId && !bookingId) {
        throw new AppError('Order ID or Booking ID is required', 400);
      }

      const job = await followUpsService.scheduleReviewRequest(tenantId, orderId, bookingId);

      res.status(201).json({
        success: true,
        message: 'Review request scheduled',
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process pending follow-ups (for cron job)
   */
  async processPendingFollowUps(req: Request, res: Response, next: NextFunction) {
    try {
      const processed = await followUpsService.processPendingFollowUps();

      res.status(200).json({
        success: true,
        message: `Processed ${processed} follow-ups`,
        data: { processed },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get follow-up statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await followUpsService.getStatistics(
        tenantId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending follow-ups
   */
  async getPendingFollowUps(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const jobs = await followUpsService.getPendingFollowUps(tenantId);

      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel follow-up
   */
  async cancelFollowUp(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params;
      await followUpsService.cancelFollowUp(jobId);

      res.status(200).json({
        success: true,
        message: 'Follow-up cancelled',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get default templates
   */
  async getDefaultTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = followUpsService.getDefaultTemplates();

      res.status(200).json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FollowUpsController();
