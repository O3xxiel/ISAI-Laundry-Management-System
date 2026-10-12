import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';

export async function obtener(_req: Request, res: Response) {
  res.json(await dashboardService.obtenerKpis());
}
