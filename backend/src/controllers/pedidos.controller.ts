import { Request, Response } from 'express';
import * as cajaService from '../services/caja.service';
import * as pedidosService from '../services/pedidos.service';

const ESTADOS_VALIDOS = ['recibido', 'en proceso', 'listo', 'entregado'];
const METODOS_VALIDOS = ['efectivo', 'tarjeta', 'transferencia'];

export async function listar(_req: Request, res: Response) {
  res.json(await pedidosService.listarPedidos());
}

export async function buscar(req: Request, res: Response) {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.json([]);
  res.json(await pedidosService.buscarPedidos(q));
}

export async function obtener(req: Request, res: Response) {
  const pedido = await pedidosService.obtenerPedido(Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(pedido);
}

export async function crear(req: Request, res: Response) {
  const { clienteId, items, fechaPromesa, notas, pagoInicial } = req.body;

  if (!clienteId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'clienteId y al menos un item (servicioId, cantidad) son requeridos' });
  }
  for (const item of items) {
    if (!item.servicioId) return res.status(400).json({ error: 'Cada item requiere servicioId' });
  }
  if (pagoInicial && !METODOS_VALIDOS.includes(pagoInicial.metodo)) {
    return res.status(400).json({ error: 'metodo de pago inválido' });
  }
  const motivoCaja = await cajaService.motivoCajaNoDisponible();
  if (motivoCaja) return res.status(409).json({ error: motivoCaja });

  const pedido = await pedidosService.crearPedido({
    clienteId,
    usuarioId: req.usuario?.id,
    items: items.map((i: { servicioId: number; cantidad?: number }) => ({
      servicioId: i.servicioId,
      cantidad: i.cantidad ?? 1,
    })),
    fechaPromesa: fechaPromesa ? new Date(fechaPromesa) : undefined,
    notas,
    pagoInicial,
  });
  res.status(201).json(pedido);
}

export async function actualizarEstado(req: Request, res: Response) {
  const { estado } = req.body;
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: `Estado inválido. Usa uno de: ${ESTADOS_VALIDOS.join(', ')}` });
  }
  res.json(await pedidosService.actualizarEstadoPedido(Number(req.params.id), estado));
}

export async function pagar(req: Request, res: Response) {
  const { monto, metodo } = req.body;
  if (!monto || monto <= 0 || !METODOS_VALIDOS.includes(metodo)) {
    return res.status(400).json({ error: 'monto (> 0) y metodo (efectivo/tarjeta/transferencia) son requeridos' });
  }
  res.status(201).json(await pedidosService.registrarPago(Number(req.params.id), { monto, metodo }));
}
