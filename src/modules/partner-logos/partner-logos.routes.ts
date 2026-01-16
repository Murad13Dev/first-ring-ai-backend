import { Router } from 'express';
import { partnerLogosController } from './partner-logos.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Public route
router.get('/logos', partnerLogosController.getLogos);

// Admin-only routes
router.post('/logos', authenticateAdmin, partnerLogosController.createLogo);
router.delete('/logos/:id', authenticateAdmin, partnerLogosController.deleteLogo);

export default router;
