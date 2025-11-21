import { Request, Response, NextFunction } from 'express';
import { businessTypesService } from './business-types.service';

export const businessTypesController = {
  /**
   * Get all business types
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const businessTypes = await businessTypesService.getAll(includeInactive);
      res.json({ success: true, data: businessTypes });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get business type by slug
   */
  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const businessType = await businessTypesService.getBySlug(slug);
      res.json({ success: true, data: businessType });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get business type by ID
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const businessType = await businessTypesService.getById(id);
      res.json({ success: true, data: businessType });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create business type
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const businessType = await businessTypesService.create(req.body);
      res.status(201).json({ success: true, data: businessType });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update business type
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const businessType = await businessTypesService.update(id, req.body);
      res.json({ success: true, data: businessType });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete business type
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await businessTypesService.delete(id);
      res.json({ success: true, message: 'Business type deleted' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add function to business type
   */
  async addFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const func = await businessTypesService.addFunction(id, req.body);
      res.status(201).json({ success: true, data: func });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update function
   */
  async updateFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const { functionId } = req.params;
      const func = await businessTypesService.updateFunction(functionId, req.body);
      res.json({ success: true, data: func });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete function
   */
  async deleteFunction(req: Request, res: Response, next: NextFunction) {
    try {
      const { functionId } = req.params;
      await businessTypesService.deleteFunction(functionId);
      res.json({ success: true, message: 'Function deleted' });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get functions for a business type
   */
  async getFunctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const functions = await businessTypesService.getFunctionsBySlug(slug);
      res.json({ success: true, data: functions });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Seed default business types
   */
  async seedDefaults(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await businessTypesService.seedDefaults();
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },
};
