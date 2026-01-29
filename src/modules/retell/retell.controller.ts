import { Request, Response, NextFunction } from 'express';
import { retellService } from './retell.service';
import logger from '../../config/logger';
import webhookLogService from '../../services/webhook-log.service';

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
    const startTime = Date.now();
    let logId = '';

    try {
      const { event, call, args, function_name } = req.body;

      // Log webhook receipt
      logId = await webhookLogService.create({
        source: 'retell',
        event: event || function_name || 'unknown',
        path: req.path,
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.body,
        callId: call?.call_id,
      });

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

          // Log successful processing
          await webhookLogService.update(logId, {
            status: 'processed',
            statusCode: 200,
            responseBody: result,
            processingMs: Date.now() - startTime,
          });

          return res.json(result);

        default:
          logger.warn('Unknown Retell event', { event });
      }

      // Log successful processing
      await webhookLogService.update(logId, {
        status: 'processed',
        statusCode: 200,
        responseBody: { success: true },
        processingMs: Date.now() - startTime,
      });

      res.json({ success: true });
    } catch (error) {
      // Log failed processing
      await webhookLogService.update(logId, {
        status: 'failed',
        statusCode: 500,
        error: error instanceof Error ? error.message : String(error),
        processingMs: Date.now() - startTime,
      });

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
