import { Request, Response } from 'express';
import * as inventarioService from '../services/inventario.service';

const TIPOS_VALIDOS = ['entrada', 'salida'];

const MOTIVOS_POR_TIPO: Record<string, string[]> = {
  entrada: ['Compra', 'Ajuste por conteo', 'Devolución'],
  salida: ['Consumo', 'Merma o desperdicio', 'Ajuste por conteo'],
};

export async function listar(_req: Request, res: Response) {
  res.json(await inventarioService.listarInsumos());
}

export async function alertas(_req: Request, res: Response) {
  res.json(await inventarioService.listarAlertas());
}

export async function crear(req: Request, res: Response) {
  const { nombre, unidad, cantidadActual, stockMinimo } = req.body;
  if (!nombre || !unidad || cantidadActual == null || stockMinimo == null) {
    return res.status(400).json({ error: 'nombre, unidad, cantidadActual y stockMinimo son requeridos' });
  }
  if (cantidadActual < 0 || stockMinimo < 0) {
    return res.status(400).json({ error: 'Las cantidades no pueden ser negativas' });
  }
  const existente = await inventarioService.buscarPorNombre(nombre);
  if (existente) {
    return res.status(400).json({ error: `Ya existe un insumo llamado "${existente.nombre}"` });
  }
  res.status(201).json(await inventarioService.crearInsumo({ nombre: nombre.trim(), unidad, cantidadActual, stockMinimo }));
}

export async function registrarMovimiento(req: Request, res: Response) {
  const { insumoId, tipo, cantidad, motivo, nota } = req.body;
  if (!insumoId || !TIPOS_VALIDOS.includes(tipo) || !cantidad) {
    return res.status(400).json({ error: 'insumoId, tipo (entrada/salida) y cantidad son requeridos' });
  }
  if (!MOTIVOS_POR_TIPO[tipo].includes(motivo)) {
    return res.status(400).json({ error: `motivo inválido. Usa uno de: ${MOTIVOS_POR_TIPO[tipo].join(', ')}` });
  }
  res.status(201).json(
    await inventarioService.registrarMovimiento({ insumoId, tipo, cantidad, motivo, nota, usuarioId: req.usuario?.id }),
  );
}

export async function historial(req: Request, res: Response) {
  res.json(await inventarioService.historialDeInsumo(Number(req.params.id)));
}

export async function conteo(req: Request, res: Response) {
  const { conteos } = req.body as { conteos: { insumoId: number; cantidadReal: number; nota?: string }[] };
  if (!Array.isArray(conteos) || conteos.length === 0) {
    return res.status(400).json({ error: 'conteos es requerido' });
  }
  for (const c of conteos) {
    if (!c.insumoId || c.cantidadReal == null || c.cantidadReal < 0) {
      return res.status(400).json({ error: 'Cada conteo requiere insumoId y cantidadReal (>= 0)' });
    }
  }
  res.status(201).json(await inventarioService.registrarConteo(conteos, req.usuario?.id));
}
