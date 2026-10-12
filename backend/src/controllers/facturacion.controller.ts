import { Request, Response } from 'express';
import * as facturacionService from '../services/facturacion.service';

export async function listar(_req: Request, res: Response) {
  res.json(await facturacionService.listarFacturas());
}

export async function obtener(req: Request, res: Response) {
  const factura = await facturacionService.obtenerFactura(Number(req.params.id));
  if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(factura);
}

export async function crear(req: Request, res: Response) {
  const { pedidoId } = req.body;
  if (!pedidoId) return res.status(400).json({ error: 'pedidoId es requerido' });
  res.status(201).json(await facturacionService.generarFactura(pedidoId));
}
