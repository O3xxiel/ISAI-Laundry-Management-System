import { Router } from 'express';
import * as serviciosController from '../controllers/servicios.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(serviciosController.listar));
router.post('/', asyncHandler(serviciosController.crear));
router.put('/:id', asyncHandler(serviciosController.actualizar));
router.patch('/:id/estado', asyncHandler(serviciosController.cambiarEstado));

export default router;
