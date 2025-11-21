import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import callsService from './calls.service';

export class CallsController {
  async createCall(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const data = req.body;
      const call = await callsService.createCall({ ...data, tenantId });
      return res.status(201).json({ success: true, data: call });
    } catch (error) {
      next(error);
    }
  }

  async getCalls(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { intent, outcome, direction, dateFrom, dateTo, page, limit } = req.query;
      
      const result = await callsService.getCalls(tenantId, {
        intent: intent as string,
        outcome: outcome as string,
        direction: direction as 'inbound' | 'outbound',
        dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo: dateTo ? new Date(dateTo as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getCallById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const call = await callsService.getCallById(id, tenantId);
      return res.status(200).json({ success: true, data: call });
    } catch (error) {
      next(error);
    }
  }

  async getCallStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { dateFrom, dateTo } = req.query;
      
      const stats = await callsService.getCallStats(
        tenantId,
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );

      return res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}

export default new CallsController();
