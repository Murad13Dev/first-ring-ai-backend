import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import faqsService from './faqs.service';

export class FAQsController {
  async createFAQ(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { question, answer, keywords, category } = req.body;

      if (!question || !answer) {
        return res.status(400).json({
          success: false,
          message: 'Question and answer are required',
        });
      }

      const faq = await faqsService.createFAQ({
        tenantId,
        question,
        answer,
        keywords,
        category,
      });

      return res.status(201).json({
        success: true,
        message: 'FAQ created successfully',
        data: faq,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFAQs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { category, isActive, search, page, limit } = req.query;

      const result = await faqsService.getFAQs(tenantId, {
        category: category as string,
        isActive: isActive === 'true',
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFAQById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const faq = await faqsService.getFAQById(id, tenantId);

      return res.status(200).json({
        success: true,
        data: faq,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFAQ(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;
      const data = req.body;

      const faq = await faqsService.updateFAQ(id, tenantId, data);

      return res.status(200).json({
        success: true,
        message: 'FAQ updated successfully',
        data: faq,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFAQ(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const result = await faqsService.deleteFAQ(id, tenantId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async searchFAQs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { query } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required',
        });
      }

      const result = await faqsService.searchFAQs(tenantId, query);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const categories = await faqsService.getCategories(tenantId);

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async markHelpful(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const tenantId = req.tenantId!;

      const result = await faqsService.markHelpful(id, tenantId);

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFAQStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const stats = await faqsService.getFAQStats(tenantId);

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FAQsController();
