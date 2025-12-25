import { Request, Response, NextFunction } from 'express';
import { integrationService } from '../../services/integration.service';
import { WhopService } from '../../services/whop.service';
import { DiscordService } from '../../services/discord.service';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IntegrationsController {
  /**
   * Get integration settings for tenant
   * GET /api/integrations
   */
  async getIntegration(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      const integration = await integrationService.getTenantIntegration(
        tenantId
      );

      // Remove sensitive fields from response
      if (integration) {
        const safeIntegration = {
          ...integration,
          discordBotToken: integration.discordBotToken ? '••••••••' : null,
          discordClientSecret: integration.discordClientSecret
            ? '••••••••'
            : null,
          whopApiKey: integration.whopApiKey ? '••••••••' : null,
          whopWebhookSecret: integration.whopWebhookSecret ? '••••••••' : null,
        };
        res.json(safeIntegration);
      } else {
        res.json({
          discordEnabled: false,
          whopEnabled: false,
          isActive: false,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Configure Discord integration
   * POST /api/integrations/discord/configure
   */
  async configureDiscord(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const {
        webhookUrl,
        botToken,
        guildId,
        notifyOnNewOrder,
        notifyOnPaymentSuccess,
        notifyOnPaymentFailed,
        notifyOnOrderReady,
        notifyOnAICall,
        dailyReportEnabled,
        dailyReportTime,
      } = req.body;

      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400);
      }

      // Validate webhook URL if provided
      if (webhookUrl && !DiscordService.isValidWebhookUrl(webhookUrl)) {
        throw new AppError('Invalid Discord webhook URL', 400);
      }

      // Test webhook if provided
      if (webhookUrl) {
        const testSuccess = await integrationService.testDiscordWebhook(
          webhookUrl
        );
        if (!testSuccess) {
          throw new AppError('Failed to send test message to Discord webhook', 400);
        }
      }

      const integration = await integrationService.upsertTenantIntegration(
        tenantId,
        {
          discordEnabled: true,
          discordWebhookUrl: webhookUrl,
          discordBotToken: botToken,
          discordGuildId: guildId,
          notifyOnNewOrder: notifyOnNewOrder ?? true,
          notifyOnPaymentSuccess: notifyOnPaymentSuccess ?? true,
          notifyOnPaymentFailed: notifyOnPaymentFailed ?? true,
          notifyOnOrderReady: notifyOnOrderReady ?? false,
          notifyOnAICall: notifyOnAICall ?? false,
          dailyReportEnabled: dailyReportEnabled ?? false,
          dailyReportTime: dailyReportTime,
        }
      );

      logger.info('Discord integration configured', { tenantId });

      res.json({
        success: true,
        message: 'Discord integration configured successfully',
        integration: {
          ...integration,
          discordBotToken: integration.discordBotToken ? '••••••••' : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle Whop webhook
   * POST /api/integrations/whop/webhook
   */
  async handleWhopWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signature = req.headers['x-whop-signature'] as string;
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        throw new AppError('Tenant ID header is required', 400);
      }

      const integration = await integrationService.getTenantIntegration(
        tenantId
      );

      if (!integration || !integration.whopWebhookSecret) {
        throw new AppError('Whop integration not configured', 400);
      }

      const payload = JSON.stringify(req.body);
      const isValid = WhopService.verifyWebhookSignature(
        payload,
        signature,
        integration.whopWebhookSecret
      );

      if (!isValid) {
        throw new AppError('Invalid webhook signature', 401);
      }

      const result = await integrationService.handleWhopWebhook(
        tenantId,
        req.body
      );

      res.json({ received: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const integrationsController = new IntegrationsController();
