import { Request, Response } from 'express';
import * as cajaService from '../services/caja.service';

export async function corte(req: Request, res: Response) {
  const fecha = req.query.fecha ? new Date(String(req.query.fecha)) : new Date();
  res.json(await cajaService.obtenerCorte(fecha));
}
