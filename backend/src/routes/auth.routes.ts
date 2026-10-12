import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { asyncHandler } from '../lib/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', requireAuth, asyncHandler(authController.me));

export default router;
