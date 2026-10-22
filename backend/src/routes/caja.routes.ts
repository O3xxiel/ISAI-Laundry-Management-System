import { Router } from 'express';
import * as cajaController from '../controllers/caja.controller';
import { asyncHandler } from '../lib/asyncHandler';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Abrir y registrar movimientos: cualquier rol, para no depender de que el admin
// esté presente para empezar a vender. Cerrar (conteo real) e historial: solo admin,
// es el control de responsabilidad sobre el efectivo.
router.get('/corte', asyncHandler(cajaController.corte));
router.post('/abrir', asyncHandler(cajaController.abrir));
router.post('/:id/movimientos', asyncHandler(cajaController.movimiento));
router.post('/:id/cerrar', requireRole('admin'), asyncHandler(cajaController.cerrar));
router.get('/historial', requireRole('admin'), asyncHandler(cajaController.historial));

export default router;
