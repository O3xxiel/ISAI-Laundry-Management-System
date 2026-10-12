import { Prisma } from '@prisma/client';
import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { ErrorRequestHandler } from 'express';
import authRouter from './routes/auth.routes';
import cajaRouter from './routes/caja.routes';
import clientesRouter from './routes/clientes.routes';
import dashboardRouter from './routes/dashboard.routes';
import facturacionRouter from './routes/facturacion.routes';
import inventarioRouter from './routes/inventario.routes';
import pedidosRouter from './routes/pedidos.routes';
import serviciosRouter from './routes/servicios.routes';
import { requireAuth } from './middleware/auth.middleware';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);

app.use('/api/pedidos', requireAuth, pedidosRouter);
app.use('/api/inventario', requireAuth, inventarioRouter);
app.use('/api/facturacion', requireAuth, facturacionRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/clientes', requireAuth, clientesRouter);
app.use('/api/servicios', requireAuth, serviciosRouter);
app.use('/api/caja', requireAuth, cajaRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }

  // Cualquier otro error que venga de Prisma (base de datos apagada, conexión caída,
  // consulta inválida, etc.) — no mostrar el detalle técnico, solo un mensaje claro.
  // Los errores de negocio (new Error('...') lanzados a propósito en los servicios)
  // no son instancias de Prisma, así que siguen llegando tal cual al usuario.
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError ||
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError
  ) {
    return res.status(503).json({ error: 'No se pudo conectar a la base de datos. Intenta de nuevo en unos segundos.' });
  }

  res.status(500).json({ error: err.message ?? 'Error interno del servidor' });
};
app.use(errorHandler);

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`Backend escuchando en puerto ${PORT}`));
