import { Request, Response, NextFunction } from 'express';
import channelsService from './channels.service';
import { AppError } from '../../middleware/error.middleware';

export class ChannelsController {
  // ================== WhatsApp ==================

  /**
   * Send WhatsApp message
   */
  async sendWhatsAppMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, message, mediaUrl } = req.body;

      if (!to || !message) {
        throw new AppError('To and message are required', 400);
      }

      const result = await channelsService.whatsapp.sendMessage({ to, message, mediaUrl });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle WhatsApp webhook
   */
  async handleWhatsAppWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await channelsService.whatsapp.handleIncoming(req.body);

      // Return TwiML response
      res.type('text/xml');
      res.send('<Response></Response>');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send order confirmation via WhatsApp
   */
  async sendWhatsAppOrderConfirmation(req: Request, res: Response, next: NextFunction) {
    try {
      const { to, order } = req.body;

      if (!to || !order) {
        throw new AppError('To and order are required', 400);
      }

      const result = await channelsService.whatsapp.sendOrderConfirmation(to, order);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // ================== Web Chat ==================

  /**
   * Create web chat session
   */
  async createChatSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const customerInfo = req.body;

      const session = await channelsService.webchat.createSession(tenantId, customerInfo);

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { message, sender, metadata } = req.body;

      if (!message) {
        throw new AppError('Message is required', 400);
      }

      const chatMessage = await channelsService.webchat.storeMessage({
        sessionId,
        message,
        sender: sender || 'user',
        metadata,
      });

      res.status(201).json({
        success: true,
        data: chatMessage,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get chat session history
   */
  async getChatHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const messages = await channelsService.webchat.getSessionHistory(sessionId);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * End chat session
   */
  async endChatSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      await channelsService.webchat.endSession(sessionId);

      res.status(200).json({
        success: true,
        message: 'Chat session ended',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active chat sessions
   */
  async getActiveSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const sessions = await channelsService.webchat.getActiveSessions(tenantId);

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfer chat to agent
   */
  async transferToAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { agentId } = req.body;

      await channelsService.webchat.transferToAgent(sessionId, agentId);

      res.status(200).json({
        success: true,
        message: 'Chat transferred to agent',
      });
    } catch (error) {
      next(error);
    }
  }

  // ================== QR Ordering ==================

  /**
   * Generate QR code
   */
  async generateQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { tableNumber, locationId } = req.body;

      const result = await channelsService.qrOrdering.generateQRCode({
        tenantId,
        tableNumber,
        locationId,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate QR code image
   */
  async generateQRCodeImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { tableNumber, locationId } = req.query;

      const result = await channelsService.qrOrdering.generateQRCodeBuffer({
        tenantId,
        tableNumber: tableNumber as string,
        locationId: locationId as string,
      });

      res.set('Content-Type', result.contentType);
      res.set('Content-Disposition', `attachment; filename="qr-${result.qrId}.png"`);
      res.send(result.buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate QR code
   */
  async validateQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { qrId } = req.params;
      const result = await channelsService.qrOrdering.validateQRCode(qrId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get tenant QR codes
   */
  async getTenantQRCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const qrCodes = await channelsService.qrOrdering.getTenantQRCodes(tenantId);

      res.status(200).json({
        success: true,
        data: qrCodes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deactivate QR code
   */
  async deactivateQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { qrId } = req.params;
      await channelsService.qrOrdering.deactivateQRCode(qrId);

      res.status(200).json({
        success: true,
        message: 'QR code deactivated',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate bulk QR codes
   */
  async generateBulkQRCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { tableCount } = req.body;

      if (!tableCount || tableCount < 1 || tableCount > 100) {
        throw new AppError('Table count must be between 1 and 100', 400);
      }

      const results = await channelsService.qrOrdering.generateBulkQRCodes(tenantId, tableCount);

      res.status(201).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  // ================== Statistics ==================

  /**
   * Get channel statistics
   */
  async getChannelStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await channelsService.getChannelStats(
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
}

export default new ChannelsController();
