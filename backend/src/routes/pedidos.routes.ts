import { Router } from 'express';
import * as pedidosController from '../controllers/pedidos.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(pedidosController.listar));
router.get('/buscar', asyncHandler(pedidosController.buscar));
router.get('/:id', asyncHandler(pedidosController.obtener));
router.post('/', asyncHandler(pedidosController.crear));
router.patch('/:id/estado', asyncHandler(pedidosController.actualizarEstado));
router.post('/:id/pagos', asyncHandler(pedidosController.pagar));

export default router;
