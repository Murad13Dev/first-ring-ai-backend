import { Request, Response, NextFunction } from 'express';
import certifiedRepsService from './certified-reps.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class CertifiedRepsController {
  /**
   * Get all Certified Reps (admin only)
   * GET /api/certified-reps
   */
  async getAllReps(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        subscriptionActive: req.query.subscriptionActive === 'true',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await certifiedRepsService.getAllReps(filters);

      return res.status(200).json({
        success: true,
        data: result.reps,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Certified Rep by ID (admin only)
   * GET /api/certified-reps/:id
   */
  async getRepById(req: Request, res: Response, next: NextFunction) {
    try {
      const rep = await certifiedRepsService.getRepById(req.params.id);

      return res.status(200).json({
        success: true,
        data: rep,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get Certified Rep statistics (admin only)
   * GET /api/certified-reps/stats
   */
  async getRepStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await certifiedRepsService.getRepStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add client for Certified Rep (admin or rep owner)
   * POST /api/certified-reps/:repId/clients
   */
  async addClient(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { repId } = req.params;
      const clientData = req.body;

      const client = await certifiedRepsService.addClient(repId, clientData);

      return res.status(201).json({
        success: true,
        message: 'Client added successfully',
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CertifiedRepsController();
