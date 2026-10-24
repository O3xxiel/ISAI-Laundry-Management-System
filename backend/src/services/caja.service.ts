import { prisma } from '../lib/prisma';

const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

function rangoDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
}

// 'YYYY-MM-DD' del día local. No usar toISOString(): convierte a UTC y puede cambiar de día.
export function fechaISO(fecha: Date) {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

// new Date('YYYY-MM-DD') se interpreta como medianoche UTC (en Guatemala, las 6 pm del día
// anterior); con la hora explícita se interpreta como medianoche local.
export function fechaLocal(fechaStr: string) {
  return new Date(`${fechaStr}T00:00:00`);
}

async function construirCorte(corte: {
  id: number;
  fecha: string;
  fondoInicial: unknown;
  responsableId: number;
  responsable: { nombre: string };
  abiertoEn: Date;
  conteoReal: unknown;
  cerradoEn: Date | null;
}) {
  const { inicio, fin } = rangoDia(fechaLocal(corte.fecha));

  const [pagos, pedidosCreados, movimientos] = await Promise.all([
    prisma.pago.findMany({
      where: { fecha: { gte: inicio, lt: fin } },
      include: { pedido: { select: { id: true } } },
      orderBy: { fecha: 'asc' },
    }),
    prisma.pedido.count({ where: { creadoEn: { gte: inicio, lt: fin } } }),
    prisma.movimientoCaja.findMany({
      where: { corteCajaId: corte.id },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    }),
  ]);

  const desglosePorMetodoMap = new Map<string, number>(METODOS.map((m) => [m, 0]));
  let totalCobrado = 0;
  for (const pago of pagos) {
    const monto = Number(pago.monto);
    totalCobrado += monto;
    desglosePorMetodoMap.set(pago.metodo, (desglosePorMetodoMap.get(pago.metodo) ?? 0) + monto);
  }

  const cobradoEfectivo = desglosePorMetodoMap.get('efectivo') ?? 0;
  const totalRetiros = movimientos.reduce((acc, m) => acc + Number(m.monto), 0);
  const fondoInicial = Number(corte.fondoInicial);
  const efectivoEsperado = fondoInicial + cobradoEfectivo - totalRetiros;
  const conteoReal = corte.conteoReal != null ? Number(corte.conteoReal) : null;
  const diferencia = conteoReal != null ? conteoReal - efectivoEsperado : null;

  const movimientosLista = [
    ...pagos.map((p) => ({
      tipo: 'cobro' as const,
      concepto: `Pedido #${String(p.pedido.id).padStart(6, '0')} (${p.metodo})`,
      monto: Number(p.monto),
      fecha: p.fecha,
    })),
    ...movimientos.map((m) => ({
      tipo: m.tipo as 'retiro' | 'gasto',
      concepto: m.concepto,
      monto: -Number(m.monto),
      fecha: m.fecha,
      responsable: m.usuario?.nombre,
    })),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  return {
    id: corte.id,
    fecha: corte.fecha,
    fondoInicial,
    responsable: corte.responsable.nombre,
    abiertoEn: corte.abiertoEn,
    cerradoEn: corte.cerradoEn,
    conteoReal,
    diferencia,
    pedidosCreados,
    totalCobrado,
    cobradoEfectivo,
    totalRetiros,
    efectivoEsperado,
    desglosePorMetodo: Array.from(desglosePorMetodoMap, ([metodo, monto]) => ({ metodo, monto })),
    movimientos: movimientosLista,
  };
}

export async function obtenerCorte(fecha = new Date()) {
  const fechaStr = fechaISO(fecha);
  const corte = await prisma.corteCaja.findUnique({
    where: { fecha: fechaStr },
    include: { responsable: { select: { nombre: true } } },
  });
  if (!corte) return null;
  return construirCorte(corte);
}

// Devuelve null si se pueden registrar ventas hoy, o el motivo por el que no.
export async function motivoCajaNoDisponible(fecha = new Date()) {
  const corte = await prisma.corteCaja.findUnique({ where: { fecha: fechaISO(fecha) } });
  if (!corte) return 'La caja de hoy no se ha abierto. Ábrela en Caja antes de registrar pedidos.';
  if (corte.cerradoEn) return 'La caja de hoy ya fue cerrada; no se pueden registrar más pedidos.';
  return null;
}

export async function abrirCaja(fecha: Date, fondoInicial: number, responsableId: number) {
  const fechaStr = fechaISO(fecha);
  const existente = await prisma.corteCaja.findUnique({ where: { fecha: fechaStr } });
  if (existente) throw new Error('La caja de este día ya fue abierta.');

  const creado = await prisma.corteCaja.create({
    data: { fecha: fechaStr, fondoInicial, responsableId },
    include: { responsable: { select: { nombre: true } } },
  });
  return construirCorte(creado);
}

async function obtenerCorteAbiertoOFallar(corteCajaId: number) {
  const corte = await prisma.corteCaja.findUniqueOrThrow({ where: { id: corteCajaId } });
  if (corte.cerradoEn) throw new Error('Esta caja ya fue cerrada; no se pueden registrar más movimientos.');
  return corte;
}

export async function registrarMovimiento(
  corteCajaId: number,
  data: { tipo: string; concepto: string; monto: number; usuarioId?: number },
) {
  await obtenerCorteAbiertoOFallar(corteCajaId);
  await prisma.movimientoCaja.create({ data: { corteCajaId, ...data } });
  const corte = await prisma.corteCaja.findUniqueOrThrow({
    where: { id: corteCajaId },
    include: { responsable: { select: { nombre: true } } },
  });
  return construirCorte(corte);
}

export async function cerrarCaja(corteCajaId: number, conteoReal: number) {
  await obtenerCorteAbiertoOFallar(corteCajaId);
  const cerrado = await prisma.corteCaja.update({
    where: { id: corteCajaId },
    data: { conteoReal, cerradoEn: new Date() },
    include: { responsable: { select: { nombre: true } } },
  });
  return construirCorte(cerrado);
}

// desde/hasta en formato 'YYYY-MM-DD' (inclusive), igual que CorteCaja.fecha.
export async function listarCortesEntre(desde: string, hasta: string) {
  const cortes = await prisma.corteCaja.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    orderBy: { fecha: 'asc' },
    include: { responsable: { select: { nombre: true } } },
  });
  return Promise.all(cortes.map(construirCorte));
}

export async function listarHistorial() {
  const cortes = await prisma.corteCaja.findMany({
    where: { cerradoEn: { not: null } },
    orderBy: { fecha: 'desc' },
    take: 30,
    include: { responsable: { select: { nombre: true } } },
  });

  return Promise.all(
    cortes.map(async (c) => {
      const completo = await construirCorte(c);
      return {
        id: completo.id,
        fecha: completo.fecha,
        responsable: completo.responsable,
        totalCobrado: completo.totalCobrado,
        diferencia: completo.diferencia,
      };
    }),
  );
}
