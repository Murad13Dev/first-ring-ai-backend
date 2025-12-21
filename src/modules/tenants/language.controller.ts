import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import i18nService from '../../services/i18n.service';
import prisma from '../../config/database';
import logger from '../../config/logger';

export class LanguageController {
  /**
   * Get supported languages
   * GET /api/tenants/languages
   */
  async getSupportedLanguages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const languages = i18nService.getSupportedLanguages();
      
      return res.status(200).json({
        success: true,
        data: languages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Set tenant default language
   * PUT /api/tenants/:id/language
   */
  async setTenantLanguage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { language } = req.body;

      if (!language) {
        return res.status(400).json({
          success: false,
          message: 'Language is required',
        });
      }

      // Check if tenant exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { id },
        select: { settings: true }
      });

      if (!existingTenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
        });
      }

      // Get current settings and merge with new language
      const currentSettings = (existingTenant.settings && typeof existingTenant.settings === 'object')
        ? existingTenant.settings as Record<string, any>
        : {};

      const updatedSettings = {
        ...currentSettings,
        defaultLanguage: language,
      };

      // Update tenant with new settings
      const tenant = await prisma.tenant.update({
        where: { id },
        data: {
          settings: updatedSettings,
        },
      });

      logger.info('Tenant language updated successfully', {
        tenantId: id,
        language,
        settings: tenant.settings,
      });

      return res.status(200).json({
        success: true,
        message: 'Language updated successfully',
        data: {
          language,
          settings: tenant.settings,
        },
      });
    } catch (error) {
      logger.error('Error updating tenant language', { error, tenantId: req.params.id });
      next(error);
    }
  }

  /**
   * Test translation
   * POST /api/tenants/languages/test
   */
  async testTranslation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { language, key, params } = req.body;

      const translation = i18nService.t(language || 'en', key || 'greeting.welcome', params || {});

      return res.status(200).json({
        success: true,
        data: {
          language,
          key,
          translation,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LanguageController();
