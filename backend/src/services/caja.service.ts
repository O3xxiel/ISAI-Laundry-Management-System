import { prisma } from '../lib/prisma';

function rangoDia(fecha: Date) {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
}

export async function obtenerCorte(fecha = new Date()) {
  const { inicio, fin } = rangoDia(fecha);

  const [pagos, pedidosCreados] = await Promise.all([
    prisma.pago.findMany({ where: { fecha: { gte: inicio, lt: fin } } }),
    prisma.pedido.count({ where: { creadoEn: { gte: inicio, lt: fin } } }),
  ]);

  const desglosePorMetodo = new Map<string, number>();
  let totalCobrado = 0;
  for (const pago of pagos) {
    const monto = Number(pago.monto);
    totalCobrado += monto;
    desglosePorMetodo.set(pago.metodo, (desglosePorMetodo.get(pago.metodo) ?? 0) + monto);
  }

  return {
    fecha: inicio.toISOString().slice(0, 10),
    pedidosCreados,
    totalCobrado,
    desglosePorMetodo: Array.from(desglosePorMetodo, ([metodo, monto]) => ({ metodo, monto })),
  };
}
