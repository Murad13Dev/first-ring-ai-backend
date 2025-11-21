import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import i18nService from '../../services/i18n.service';
import prisma from '../../config/database';

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

      // Get current tenant settings
      const currentTenant = await prisma.tenant.findUnique({ where: { id } });
      const currentSettings = (currentTenant?.settings && typeof currentTenant.settings === 'object')
        ? currentTenant.settings as Record<string, any>
        : {};

      const tenant = await prisma.tenant.update({
        where: { id },
        data: {
          settings: {
            ...currentSettings,
            defaultLanguage: language,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Language updated',
        data: { language },
      });
    } catch (error) {
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
