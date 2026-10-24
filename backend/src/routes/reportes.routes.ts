import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { generarReporte } from '../services/reportes.service';

const router = Router();

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

router.get(
  '/excel',
  asyncHandler(async (req, res) => {
    const desde = req.query.desde ? String(req.query.desde) : undefined;
    const hasta = req.query.hasta ? String(req.query.hasta) : undefined;
    if ((desde && !FECHA.test(desde)) || (hasta && !FECHA.test(hasta))) {
      return res.status(400).json({ error: 'desde y hasta deben tener formato YYYY-MM-DD' });
    }
    const { buffer, nombreArchivo } = await generarReporte(desde, hasta);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(Buffer.from(buffer as ArrayBuffer));
  }),
);

export default router;
