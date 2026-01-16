import prisma from '../../config/database';
import logger from '../../config/logger';

export interface CreateBlogPostDto {
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  category?: string;
  image?: string;
  featured?: boolean;
}

export interface UpdateBlogPostDto {
  title?: string;
  content?: string;
  excerpt?: string;
  author?: string;
  category?: string;
  image?: string;
  featured?: boolean;
}

export const blogService = {
  async findAll(category?: string, limit?: number, offset?: number) {
    try {
      const where = category ? { category } : {};

      const posts = await prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(limit && { take: limit }),
        ...(offset && { skip: offset }),
      });

      return posts;
    } catch (error) {
      logger.error('Error finding blog posts', { error });
      throw error;
    }
  },

  async findOne(id: string) {
    try {
      const post = await prisma.blogPost.findUnique({
        where: { id },
      });

      if (!post) {
        throw new Error('Blog post not found');
      }

      return post;
    } catch (error) {
      logger.error('Error finding blog post', { error, id });
      throw error;
    }
  },

  async create(dto: CreateBlogPostDto) {
    try {
      const post = await prisma.blogPost.create({
        data: {
          title: dto.title,
          content: dto.content,
          excerpt: dto.excerpt,
          author: dto.author,
          category: dto.category || 'News',
          image: dto.image,
          featured: dto.featured || false,
        },
      });

      logger.info('Blog post created', { postId: post.id });
      return post;
    } catch (error) {
      logger.error('Error creating blog post', { error });
      throw error;
    }
  },

  async update(id: string, dto: UpdateBlogPostDto) {
    try {
      const post = await prisma.blogPost.update({
        where: { id },
        data: dto,
      });

      logger.info('Blog post updated', { postId: post.id });
      return post;
    } catch (error) {
      logger.error('Error updating blog post', { error, id });
      throw error;
    }
  },

  async remove(id: string) {
    try {
      await prisma.blogPost.delete({
        where: { id },
      });

      logger.info('Blog post deleted', { postId: id });
    } catch (error) {
      logger.error('Error deleting blog post', { error, id });
      throw error;
    }
  },
};
