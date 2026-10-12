import { Router } from 'express';
import * as inventarioController from '../controllers/inventario.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(inventarioController.listar));
router.get('/alertas', asyncHandler(inventarioController.alertas));
router.post('/', asyncHandler(inventarioController.crear));
router.post('/movimientos', asyncHandler(inventarioController.registrarMovimiento));
router.post('/conteo', asyncHandler(inventarioController.conteo));
router.get('/:id/historial', asyncHandler(inventarioController.historial));

export default router;
