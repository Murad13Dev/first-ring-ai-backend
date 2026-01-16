import { Request, Response, NextFunction } from 'express';
import { blogService, CreateBlogPostDto, UpdateBlogPostDto } from './blog.service';
import logger from '../../config/logger';

export const blogController = {
  async getPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, limit, offset } = req.query;

      const posts = await blogService.findAll(
        category as string,
        limit ? parseInt(limit as string) : undefined,
        offset ? parseInt(offset as string) : undefined
      );

      res.json({
        success: true,
        data: posts,
      });
    } catch (error) {
      logger.error('Error in getPosts controller', { error });
      next(error);
    }
  },

  async getPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const post = await blogService.findOne(id);

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      logger.error('Error in getPost controller', { error });
      next(error);
    }
  },

  async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateBlogPostDto = req.body;

      if (!dto.title || !dto.content || !dto.author) {
        return res.status(400).json({
          success: false,
          message: 'Title, content, and author are required',
        });
      }

      const post = await blogService.create(dto);

      res.status(201).json({
        success: true,
        data: post,
      });
    } catch (error) {
      logger.error('Error in createPost controller', { error });
      next(error);
    }
  },

  async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const dto: UpdateBlogPostDto = req.body;

      const post = await blogService.update(id, dto);

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      logger.error('Error in updatePost controller', { error });
      next(error);
    }
  },

  async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await blogService.remove(id);

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deletePost controller', { error });
      next(error);
    }
  },
};
