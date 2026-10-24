import { Request, Response } from 'express';
import * as serviciosService from '../services/servicios.service';
import type { InsumoReceta } from '../services/servicios.service';

const UNIDADES_VALIDAS = ['peso', 'pieza', 'fijo'];

// Devuelve la receta normalizada, o un mensaje de error si no es válida.
function validarInsumos(insumos: unknown): InsumoReceta[] | string | undefined {
  if (insumos === undefined) return undefined;
  if (!Array.isArray(insumos)) return 'insumos debe ser una lista';
  const receta: InsumoReceta[] = [];
  for (const i of insumos) {
    const insumoId = Number(i?.insumoId);
    const cantidad = Number(i?.cantidad);
    if (!Number.isInteger(insumoId) || !(cantidad > 0)) {
      return 'Cada insumo necesita un insumoId y una cantidad mayor a 0';
    }
    if (receta.some((r) => r.insumoId === insumoId)) return 'Hay un insumo repetido en la receta';
    receta.push({ insumoId, cantidad });
  }
  return receta;
}

export async function listar(req: Request, res: Response) {
  const incluirInactivos = req.query.incluirInactivos === '1' || req.query.incluirInactivos === 'true';
  res.json(await serviciosService.listarServicios(incluirInactivos));
}

export async function crear(req: Request, res: Response) {
  const { nombre, unidadCobro, precio } = req.body;
  if (!nombre || !UNIDADES_VALIDAS.includes(unidadCobro) || precio == null) {
    return res.status(400).json({ error: 'nombre, unidadCobro (peso/pieza/fijo) y precio son requeridos' });
  }
  const insumos = validarInsumos(req.body.insumos);
  if (typeof insumos === 'string') return res.status(400).json({ error: insumos });
  res.status(201).json(await serviciosService.crearServicio({ nombre, unidadCobro, precio, insumos }));
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { nombre, unidadCobro, precio } = req.body;
  if (unidadCobro !== undefined && !UNIDADES_VALIDAS.includes(unidadCobro)) {
    return res.status(400).json({ error: 'unidadCobro debe ser peso, pieza o fijo' });
  }
  const insumos = validarInsumos(req.body.insumos);
  if (typeof insumos === 'string') return res.status(400).json({ error: insumos });
  res.json(await serviciosService.actualizarServicio(id, { nombre, unidadCobro, precio, insumos }));
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { activo } = req.body;
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'activo (boolean) es requerido' });
  }
  res.json(await serviciosService.cambiarEstadoServicio(id, activo));
}
