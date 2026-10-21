import { prisma } from '../lib/prisma';

const includePedido = {
  pedido: { include: { cliente: true, items: { include: { servicio: true } }, pagos: true } },
} as const;

export function listarFacturas() {
  return prisma.factura.findMany({ include: includePedido, orderBy: { fechaEmision: 'desc' } });
}

export function obtenerFactura(id: number) {
  return prisma.factura.findUnique({ where: { id }, include: includePedido });
}

export async function generarFactura(pedidoId: number) {
  const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
  const numeroFactura = `F${String(pedido.id).padStart(6, '0')}`;

  return prisma.factura.create({
    data: { pedidoId: pedido.id, numeroFactura, total: pedido.total },
    include: includePedido,
  });
}
