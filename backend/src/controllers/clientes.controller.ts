import { Request, Response } from 'express';
import * as clientesService from '../services/clientes.service';

export async function listar(_req: Request, res: Response) {
  res.json(await clientesService.listarClientes());
}

export async function crear(req: Request, res: Response) {
  const { nombre, telefono, correo } = req.body;
  if (!nombre || !telefono) return res.status(400).json({ error: 'nombre y telefono son requeridos' });
  res.status(201).json(await clientesService.crearCliente({ nombre, telefono, correo }));
}

export async function buscar(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json([]);
  res.json(await clientesService.buscarClientes(q));
}
