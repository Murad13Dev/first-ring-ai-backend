import { Request, Response, NextFunction } from 'express';
import leadsService from './leads.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export class LeadsController {
  /**
   * Create new lead
   * POST /api/leads
   */
  async createLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await leadsService.createLead(req.body);

      return res.status(201).json({
        success: true,
        message: 'Lead created successfully',
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all leads (admin)
   * GET /api/leads
   */
  async getLeads(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        source: req.query.source as string,
        businessType: req.query.businessType as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await leadsService.getLeads(filters);

      return res.status(200).json({
        success: true,
        data: result.leads,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lead by ID
   * GET /api/leads/:id
   */
  async getLeadById(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await leadsService.getLeadById(req.params.id);

      return res.status(200).json({
        success: true,
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update lead
   * PUT /api/leads/:id
   */
  async updateLead(req: Request, res: Response, next: NextFunction) {
    try {
      const lead = await leadsService.updateLead(req.params.id, req.body);

      return res.status(200).json({
        success: true,
        message: 'Lead updated successfully',
        data: lead,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert lead to tenant
   * POST /api/leads/:id/convert
   */
  async convertToTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await leadsService.convertLeadToTenant(req.params.id);

      return res.status(200).json({
        success: true,
        message: 'Lead converted to tenant successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get lead statistics
   * GET /api/leads/stats
   */
  async getLeadStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await leadsService.getLeadStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LeadsController();
