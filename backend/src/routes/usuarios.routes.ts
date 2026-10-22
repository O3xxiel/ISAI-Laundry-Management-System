import { Router } from 'express';
import * as usuariosController from '../controllers/usuarios.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(usuariosController.listar));
router.post('/', asyncHandler(usuariosController.crear));
router.put('/:id', asyncHandler(usuariosController.actualizar));
router.patch('/:id/estado', asyncHandler(usuariosController.cambiarEstado));

export default router;
