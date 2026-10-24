import { Request, Response } from 'express';
import * as cajaService from '../services/caja.service';

const TIPOS_VALIDOS = ['retiro', 'gasto'];

export async function corte(req: Request, res: Response) {
  const fecha = req.query.fecha ? cajaService.fechaLocal(String(req.query.fecha)) : new Date();
  const resultado = await cajaService.obtenerCorte(fecha);
  if (!resultado) return res.json(null);
  res.json(resultado);
}

export async function abrir(req: Request, res: Response) {
  const { fondoInicial } = req.body;
  if (fondoInicial == null || Number(fondoInicial) < 0) {
    return res.status(400).json({ error: 'fondoInicial es requerido y debe ser mayor o igual a 0' });
  }
  const responsableId = req.usuario!.id;
  res.status(201).json(await cajaService.abrirCaja(new Date(), Number(fondoInicial), responsableId));
}

export async function movimiento(req: Request, res: Response) {
  const corteCajaId = Number(req.params.id);
  const { tipo, concepto, monto } = req.body;
  if (!TIPOS_VALIDOS.includes(tipo) || !concepto || monto == null || Number(monto) <= 0) {
    return res.status(400).json({ error: 'tipo (retiro/gasto), concepto y monto (> 0) son requeridos' });
  }
  const resultado = await cajaService.registrarMovimiento(corteCajaId, {
    tipo,
    concepto,
    monto: Number(monto),
    usuarioId: req.usuario!.id,
  });
  res.status(201).json(resultado);
}

export async function cerrar(req: Request, res: Response) {
  const corteCajaId = Number(req.params.id);
  const { conteoReal } = req.body;
  if (conteoReal == null || Number(conteoReal) < 0) {
    return res.status(400).json({ error: 'conteoReal es requerido y debe ser mayor o igual a 0' });
  }
  res.json(await cajaService.cerrarCaja(corteCajaId, Number(conteoReal)));
}

export async function historial(_req: Request, res: Response) {
  res.json(await cajaService.listarHistorial());
}
