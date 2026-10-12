import { Router } from 'express';
import * as clientesController from '../controllers/clientes.controller';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/', asyncHandler(clientesController.listar));
router.get('/buscar', asyncHandler(clientesController.buscar));
router.post('/', asyncHandler(clientesController.crear));

export default router;
