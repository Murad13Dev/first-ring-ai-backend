import prisma from '../../config/database';
import logger from '../../config/logger';
import { AppError } from '../../middleware/error.middleware';

interface CreateFAQData {
  tenantId: string;
  question: string;
  answer: string;
  keywords?: string[];
  category?: string;
}

interface UpdateFAQData {
  question?: string;
  answer?: string;
  keywords?: string[];
  category?: string;
  isActive?: boolean;
}

export class FAQsService {
  /**
   * Create new FAQ
   */
  async createFAQ(data: CreateFAQData) {
    try {
      // Generate keywords if not provided
      const keywords = data.keywords || this.generateKeywords(data.question, data.answer);

      const faq = await prisma.fAQ.create({
        data: {
          tenantId: data.tenantId,
          question: data.question,
          answer: data.answer,
          keywords,
          category: data.category,
        },
      });

      logger.info('FAQ created successfully', {
        faqId: faq.id,
        tenantId: data.tenantId,
      });

      return faq;
    } catch (error) {
      logger.error('Create FAQ error', { error });
      throw error;
    }
  }

  /**
   * Get all FAQs for a tenant
   */
  async getFAQs(
    tenantId: string,
    filters?: {
      category?: string;
      isActive?: boolean;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = filters?.page || 1;
      const limit = filters?.limit || 50;
      const skip = (page - 1) * limit;

      const where: any = { tenantId };

      if (filters?.category) where.category = filters.category;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;
      
      if (filters?.search) {
        where.OR = [
          { question: { contains: filters.search, mode: 'insensitive' } },
          { answer: { contains: filters.search, mode: 'insensitive' } },
          { keywords: { has: filters.search.toLowerCase() } },
        ];
      }

      const [faqs, total] = await Promise.all([
        prisma.fAQ.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.fAQ.count({ where }),
      ]);

      return {
        faqs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Get FAQs error', { error });
      throw error;
    }
  }

  /**
   * Get FAQ by ID
   */
  async getFAQById(id: string, tenantId: string) {
    try {
      const faq = await prisma.fAQ.findFirst({
        where: { id, tenantId },
      });

      if (!faq) {
        throw new AppError('FAQ not found', 404);
      }

      // Increment view count
      await prisma.fAQ.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      return faq;
    } catch (error) {
      logger.error('Get FAQ by ID error', { error });
      throw error;
    }
  }

  /**
   * Update FAQ
   */
  async updateFAQ(id: string, tenantId: string, data: UpdateFAQData) {
    try {
      const faq = await prisma.fAQ.findFirst({
        where: { id, tenantId },
      });

      if (!faq) {
        throw new AppError('FAQ not found', 404);
      }

      // Regenerate keywords if question or answer changed
      let keywords = data.keywords;
      if ((data.question || data.answer) && !data.keywords) {
        keywords = this.generateKeywords(
          data.question || faq.question,
          data.answer || faq.answer
        );
      }

      const updated = await prisma.fAQ.update({
        where: { id },
        data: {
          ...data,
          keywords: keywords || faq.keywords,
          updatedAt: new Date(),
        },
      });

      logger.info('FAQ updated successfully', { faqId: id, tenantId });

      return updated;
    } catch (error) {
      logger.error('Update FAQ error', { error });
      throw error;
    }
  }

  /**
   * Delete FAQ
   */
  async deleteFAQ(id: string, tenantId: string) {
    try {
      const faq = await prisma.fAQ.findFirst({
        where: { id, tenantId },
      });

      if (!faq) {
        throw new AppError('FAQ not found', 404);
      }

      await prisma.fAQ.delete({
        where: { id },
      });

      logger.info('FAQ deleted successfully', { faqId: id, tenantId });

      return { message: 'FAQ deleted successfully' };
    } catch (error) {
      logger.error('Delete FAQ error', { error });
      throw error;
    }
  }

  /**
   * Search FAQs (for AI agent)
   * Returns best matching FAQ based on query
   */
  async searchFAQs(tenantId: string, query: string) {
    try {
      const normalizedQuery = query.toLowerCase().trim();

      // Get all active FAQs for tenant
      const faqs = await prisma.fAQ.findMany({
        where: {
          tenantId,
          isActive: true,
        },
      });

      if (faqs.length === 0) {
        return {
          found: false,
          message: 'No FAQs found',
        };
      }

      // Score each FAQ based on relevance
      const scoredFAQs = faqs.map((faq) => {
        let score = 0;

        // Exact match in question (highest score)
        if (faq.question.toLowerCase().includes(normalizedQuery)) {
          score += 100;
        }

        // Keywords match
        const matchingKeywords = faq.keywords.filter((keyword) =>
          normalizedQuery.includes(keyword.toLowerCase())
        );
        score += matchingKeywords.length * 10;

        // Word overlap
        const queryWords = normalizedQuery.split(' ').filter((w) => w.length > 3);
        const questionWords = faq.question.toLowerCase().split(' ');
        const answerWords = faq.answer.toLowerCase().split(' ');

        queryWords.forEach((word) => {
          if (questionWords.includes(word)) score += 5;
          if (answerWords.includes(word)) score += 3;
        });

        return { ...faq, score };
      });

      // Sort by score
      scoredFAQs.sort((a, b) => b.score - a.score);

      // Get best match
      const bestMatch = scoredFAQs[0];

      // Confidence threshold
      const MIN_CONFIDENCE = 10;

      if (bestMatch.score < MIN_CONFIDENCE) {
        return {
          found: false,
          message: 'No relevant FAQ found',
          suggestions: scoredFAQs.slice(0, 3).map((faq) => ({
            question: faq.question,
            score: faq.score,
          })),
        };
      }

      // Log successful search
      await prisma.fAQ.update({
        where: { id: bestMatch.id },
        data: { viewCount: { increment: 1 } },
      });

      return {
        found: true,
        faq: {
          id: bestMatch.id,
          question: bestMatch.question,
          answer: bestMatch.answer,
          category: bestMatch.category,
        },
        confidence: Math.min(bestMatch.score / 100, 1), // 0-1 range
        alternatives: scoredFAQs.slice(1, 4).map((faq) => ({
          question: faq.question,
          score: faq.score,
        })),
      };
    } catch (error) {
      logger.error('Search FAQs error', { error });
      throw error;
    }
  }

  /**
   * Get FAQ categories
   */
  async getCategories(tenantId: string) {
    try {
      const categories = await prisma.fAQ.findMany({
        where: {
          tenantId,
          category: { not: null },
        },
        distinct: ['category'],
        select: { category: true },
      });

      return categories.map((c) => c.category).filter(Boolean);
    } catch (error) {
      logger.error('Get FAQ categories error', { error });
      throw error;
    }
  }

  /**
   * Mark FAQ as helpful
   */
  async markHelpful(id: string, tenantId: string) {
    try {
      const faq = await prisma.fAQ.findFirst({
        where: { id, tenantId },
      });

      if (!faq) {
        throw new AppError('FAQ not found', 404);
      }

      await prisma.fAQ.update({
        where: { id },
        data: { helpfulCount: { increment: 1 } },
      });

      return { message: 'Marked as helpful' };
    } catch (error) {
      logger.error('Mark helpful error', { error });
      throw error;
    }
  }

  /**
   * Get FAQ statistics
   */
  async getFAQStats(tenantId: string) {
    try {
      const [
        totalFAQs,
        activeFAQs,
        totalViews,
        totalHelpful,
        topFAQs,
      ] = await Promise.all([
        prisma.fAQ.count({ where: { tenantId } }),
        prisma.fAQ.count({ where: { tenantId, isActive: true } }),
        prisma.fAQ.aggregate({
          where: { tenantId },
          _sum: { viewCount: true },
        }),
        prisma.fAQ.aggregate({
          where: { tenantId },
          _sum: { helpfulCount: true },
        }),
        prisma.fAQ.findMany({
          where: { tenantId },
          orderBy: { viewCount: 'desc' },
          take: 5,
          select: {
            id: true,
            question: true,
            viewCount: true,
            helpfulCount: true,
          },
        }),
      ]);

      return {
        totalFAQs,
        activeFAQs,
        totalViews: totalViews._sum.viewCount || 0,
        totalHelpful: totalHelpful._sum.helpfulCount || 0,
        topFAQs,
      };
    } catch (error) {
      logger.error('Get FAQ stats error', { error });
      throw error;
    }
  }

  /**
   * Generate keywords from question and answer
   */
  private generateKeywords(question: string, answer: string): string[] {
    const text = `${question} ${answer}`.toLowerCase();
    
    // Remove common stop words
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'can', 'may', 'might', 'must', 'shall', 'it', 'that', 'this',
      'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'when',
      'where', 'why', 'how', 'nə', 'necə', 'harada', 'niyə', 'kim',
    ];

    // Extract words
    const words = text
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.includes(word));

    // Get unique words
    const uniqueWords = [...new Set(words)];

    // Return top 10 most frequent
    return uniqueWords.slice(0, 10);
  }
}

export default new FAQsService();
