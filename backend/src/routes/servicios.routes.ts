import { Router } from 'express';
import * as serviciosController from '../controllers/servicios.controller';
import { asyncHandler } from '../lib/asyncHandler';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// listar queda abierto a cualquier rol autenticado: el POS lo necesita para elegir servicios.
router.get('/', asyncHandler(serviciosController.listar));
router.post('/', requireRole('admin'), asyncHandler(serviciosController.crear));
router.put('/:id', requireRole('admin'), asyncHandler(serviciosController.actualizar));
router.patch('/:id/estado', requireRole('admin'), asyncHandler(serviciosController.cambiarEstado));

export default router;
