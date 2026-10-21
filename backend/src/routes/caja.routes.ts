import { Router } from 'express';
import * as cajaController from '../controllers/caja.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/corte', asyncHandler(cajaController.corte));
router.post('/abrir', asyncHandler(cajaController.abrir));
router.post('/:id/movimientos', asyncHandler(cajaController.movimiento));
router.post('/:id/cerrar', asyncHandler(cajaController.cerrar));
router.get('/historial', asyncHandler(cajaController.historial));

export default router;
