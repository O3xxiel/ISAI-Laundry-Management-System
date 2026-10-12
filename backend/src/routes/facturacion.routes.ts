import { Router } from 'express';
import * as facturacionController from '../controllers/facturacion.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(facturacionController.listar));
router.get('/:id', asyncHandler(facturacionController.obtener));
router.post('/', asyncHandler(facturacionController.crear));

export default router;
