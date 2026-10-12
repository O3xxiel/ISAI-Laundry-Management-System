import { Router } from 'express';
import * as serviciosController from '../controllers/servicios.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(serviciosController.listar));
router.post('/', asyncHandler(serviciosController.crear));

export default router;
