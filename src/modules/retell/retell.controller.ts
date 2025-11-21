import { Request, Response, NextFunction } from 'express';
import { retellService } from './retell.service';
import logger from '../../config/logger';

/**
 * Retell AI Webhook Controller
 * Handles incoming webhooks and function calls from Retell AI
 */
export const retellController = {
  /**
   * Main webhook endpoint for Retell AI
   * Receives call events and function calls
   */
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { event, call, args, function_name } = req.body;

      logger.info('Retell webhook received', { event, function_name });

      // Handle different event types
      switch (event) {
        case 'call_started':
          await retellService.handleCallStarted(call);
          break;

        case 'call_ended':
          await retellService.handleCallEnded(call);
          break;

        case 'call_analyzed':
          await retellService.handleCallAnalyzed(call);
          break;

        case 'function_call':
          // Handle function calls from Retell AI
          const result = await retellService.handleFunctionCall(
            function_name,
            args,
            call
          );
          return res.json(result);

        default:
          logger.warn('Unknown Retell event', { event });
      }

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  /**
   * General AI Functions - For main platform agent
   * Helps clients learn about platform and create projects
   */
  async generalFunctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { function_name, args } = req.body;
      const result = await retellService.handleGeneralFunction(function_name, args);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Client-specific AI Functions - For tenant agents
   * Restaurant, Retail, etc.
   */
  async clientFunctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { function_name, args } = req.body;

      const result = await retellService.handleClientFunction(
        tenantId,
        function_name,
        args
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get available functions for a tenant based on business type
   */
  async getAvailableFunctions(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const functions = await retellService.getAvailableFunctions(tenantId);
      res.json({ functions });
    } catch (error) {
      next(error);
    }
  },
};
