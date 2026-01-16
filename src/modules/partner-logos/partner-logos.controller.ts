import { Request, Response, NextFunction } from 'express';
import { partnerLogosService, CreatePartnerLogoDto } from './partner-logos.service';
import logger from '../../config/logger';

export const partnerLogosController = {
  async getLogos(req: Request, res: Response, next: NextFunction) {
    try {
      const logos = await partnerLogosService.findAll();

      res.json({
        success: true,
        data: logos,
      });
    } catch (error) {
      logger.error('Error in getLogos controller', { error });
      next(error);
    }
  },

  async createLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreatePartnerLogoDto = req.body;

      if (!dto.image) {
        return res.status(400).json({
          success: false,
          message: 'Image is required',
        });
      }

      const logo = await partnerLogosService.create(dto);

      res.status(201).json({
        success: true,
        data: logo,
      });
    } catch (error) {
      logger.error('Error in createLogo controller', { error });
      next(error);
    }
  },

  async deleteLogo(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await partnerLogosService.remove(id);

      res.json({
        success: true,
        message: 'Logo deleted successfully',
      });
    } catch (error) {
      logger.error('Error in deleteLogo controller', { error });
      next(error);
    }
  },
};
