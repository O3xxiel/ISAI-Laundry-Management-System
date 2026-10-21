import { Request, Response } from 'express';
import * as serviciosService from '../services/servicios.service';

const UNIDADES_VALIDAS = ['peso', 'pieza', 'fijo'];

export async function listar(req: Request, res: Response) {
  const incluirInactivos = req.query.incluirInactivos === '1' || req.query.incluirInactivos === 'true';
  res.json(await serviciosService.listarServicios(incluirInactivos));
}

export async function crear(req: Request, res: Response) {
  const { nombre, unidadCobro, precio } = req.body;
  if (!nombre || !UNIDADES_VALIDAS.includes(unidadCobro) || precio == null) {
    return res.status(400).json({ error: 'nombre, unidadCobro (peso/pieza/fijo) y precio son requeridos' });
  }
  res.status(201).json(await serviciosService.crearServicio({ nombre, unidadCobro, precio }));
}

export async function actualizar(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { nombre, unidadCobro, precio } = req.body;
  if (unidadCobro !== undefined && !UNIDADES_VALIDAS.includes(unidadCobro)) {
    return res.status(400).json({ error: 'unidadCobro debe ser peso, pieza o fijo' });
  }
  res.json(await serviciosService.actualizarServicio(id, { nombre, unidadCobro, precio }));
}

export async function cambiarEstado(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { activo } = req.body;
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ error: 'activo (boolean) es requerido' });
  }
  res.json(await serviciosService.cambiarEstadoServicio(id, activo));
}
