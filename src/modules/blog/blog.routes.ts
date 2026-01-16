import { Router } from 'express';
import { blogController } from './blog.controller';
import { authenticateAdmin } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/posts', blogController.getPosts);
router.get('/posts/:id', blogController.getPost);

// Admin-only routes
router.post('/posts', authenticateAdmin, blogController.createPost);
router.put('/posts/:id', authenticateAdmin, blogController.updatePost);
router.delete('/posts/:id', authenticateAdmin, blogController.deletePost);

export default router;
