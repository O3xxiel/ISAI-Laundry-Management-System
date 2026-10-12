import { Router } from 'express';
import * as cajaController from '../controllers/caja.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/corte', asyncHandler(cajaController.corte));

export default router;
