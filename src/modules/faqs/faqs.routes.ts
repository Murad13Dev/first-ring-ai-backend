import { Router } from 'express';
import faqsController from './faqs.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { tenantIsolation } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticateToken, tenantIsolation);

router.post('/', faqsController.createFAQ);
router.get('/', faqsController.getFAQs);
router.post('/search', faqsController.searchFAQs);
router.get('/categories/list', faqsController.getCategories);
router.get('/stats', faqsController.getFAQStats);
router.get('/:id', faqsController.getFAQById);
router.put('/:id', faqsController.updateFAQ);
router.delete('/:id', faqsController.deleteFAQ);
router.post('/:id/helpful', faqsController.markHelpful);

export default router;
