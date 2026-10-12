import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(dashboardController.obtener));

export default router;
