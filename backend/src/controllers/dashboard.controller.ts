import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function obtener(req: Request, res: Response) {
  const desde = req.query.desde ? String(req.query.desde) : undefined;
  const hasta = req.query.hasta ? String(req.query.hasta) : undefined;
  res.json(await dashboardService.obtenerKpis(desde, hasta));
}
