import prisma from '../../config/database';
import logger from '../../config/logger';

export interface CreatePartnerLogoDto {
  image: string; // base64 string
}

export const partnerLogosService = {
  async findAll() {
    try {
      const logos = await prisma.partnerLogo.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return logos;
    } catch (error) {
      logger.error('Error finding partner logos', { error });
      throw error;
    }
  },

  async create(dto: CreatePartnerLogoDto) {
    try {
      if (!dto.image) {
        throw new Error('Image is required');
      }

      const logo = await prisma.partnerLogo.create({
        data: {
          image: dto.image,
        },
      });

      logger.info('Partner logo created', { logoId: logo.id });
      return logo;
    } catch (error) {
      logger.error('Error creating partner logo', { error });
      throw error;
    }
  },

  async remove(id: string) {
    try {
      await prisma.partnerLogo.delete({
        where: { id },
      });

      logger.info('Partner logo deleted', { logoId: id });
    } catch (error) {
      logger.error('Error deleting partner logo', { error, id });
      throw error;
    }
  },
};
