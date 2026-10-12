import { Request, Response } from 'express';
import * as serviciosService from '../services/servicios.service';

const UNIDADES_VALIDAS = ['peso', 'pieza', 'fijo'];

export async function listar(_req: Request, res: Response) {
  res.json(await serviciosService.listarServicios());
}

export async function crear(req: Request, res: Response) {
  const { nombre, unidadCobro, precio } = req.body;
  if (!nombre || !UNIDADES_VALIDAS.includes(unidadCobro) || precio == null) {
    return res.status(400).json({ error: 'nombre, unidadCobro (peso/pieza/fijo) y precio son requeridos' });
  }
  res.status(201).json(await serviciosService.crearServicio({ nombre, unidadCobro, precio }));
}
