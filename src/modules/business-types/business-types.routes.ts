import { Router } from 'express';
import { businessTypesController } from './business-types.controller';

const router = Router();

/**
 * @swagger
 * /api/business-types:
 *   get:
 *     summary: Get all business types
 *     tags: [Business Types]
 */
router.get('/', businessTypesController.getAll);

/**
 * @swagger
 * /api/business-types/seed:
 *   post:
 *     summary: Seed default business types
 *     tags: [Business Types]
 */
router.post('/seed', businessTypesController.seedDefaults);

/**
 * @swagger
 * /api/business-types/slug/{slug}:
 *   get:
 *     summary: Get business type by slug
 *     tags: [Business Types]
 */
router.get('/slug/:slug', businessTypesController.getBySlug);

/**
 * @swagger
 * /api/business-types/slug/{slug}/functions:
 *   get:
 *     summary: Get functions for a business type
 *     tags: [Business Types]
 */
router.get('/slug/:slug/functions', businessTypesController.getFunctions);

/**
 * @swagger
 * /api/business-types/{id}:
 *   get:
 *     summary: Get business type by ID
 *     tags: [Business Types]
 */
router.get('/:id', businessTypesController.getById);

/**
 * @swagger
 * /api/business-types:
 *   post:
 *     summary: Create business type
 *     tags: [Business Types]
 */
router.post('/', businessTypesController.create);

/**
 * @swagger
 * /api/business-types/{id}:
 *   put:
 *     summary: Update business type
 *     tags: [Business Types]
 */
router.put('/:id', businessTypesController.update);

/**
 * @swagger
 * /api/business-types/{id}:
 *   delete:
 *     summary: Delete business type
 *     tags: [Business Types]
 */
router.delete('/:id', businessTypesController.delete);

/**
 * @swagger
 * /api/business-types/{id}/functions:
 *   post:
 *     summary: Add function to business type
 *     tags: [Business Types]
 */
router.post('/:id/functions', businessTypesController.addFunction);

/**
 * @swagger
 * /api/business-types/functions/{functionId}:
 *   put:
 *     summary: Update function
 *     tags: [Business Types]
 */
router.put('/functions/:functionId', businessTypesController.updateFunction);

/**
 * @swagger
 * /api/business-types/functions/{functionId}:
 *   delete:
 *     summary: Delete function
 *     tags: [Business Types]
 */
router.delete('/functions/:functionId', businessTypesController.deleteFunction);

export default router;
