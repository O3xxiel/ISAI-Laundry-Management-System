import { prisma } from '../lib/prisma';

const INCLUDE = {
  cliente: true,
  items: { include: { servicio: true } },
  pagos: { orderBy: { fecha: 'asc' as const } },
};

export function listarPedidos() {
  return prisma.pedido.findMany({ include: INCLUDE, orderBy: { creadoEn: 'desc' } });
}

export function obtenerPedido(id: number) {
  return prisma.pedido.findUnique({ where: { id }, include: INCLUDE });
}

interface ItemInput {
  servicioId: number;
  cantidad: number;
}

interface PagoInicialInput {
  monto: number;
  metodo: string;
}

export async function crearPedido(data: {
  clienteId: number;
  usuarioId?: number;
  items: ItemInput[];
  fechaPromesa?: Date;
  notas?: string;
  pagoInicial?: PagoInicialInput;
}) {
  const servicios = await prisma.servicio.findMany({
    where: { id: { in: data.items.map((i) => i.servicioId) } },
  });
  const servicioPorId = new Map(servicios.map((s) => [s.id, s]));

  const itemsData = data.items.map((item) => {
    const servicio = servicioPorId.get(item.servicioId);
    if (!servicio) throw new Error(`Servicio ${item.servicioId} no existe`);
    const cantidad = servicio.unidadCobro === 'fijo' ? 1 : item.cantidad;
    const subtotal = Number(servicio.precio) * cantidad;
    return { servicioId: servicio.id, cantidad, subtotal };
  });

  const total = itemsData.reduce((acc, i) => acc + i.subtotal, 0);

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: data.clienteId,
      usuarioId: data.usuarioId,
      total,
      fechaPromesa: data.fechaPromesa,
      notas: data.notas,
      items: { create: itemsData },
      pagos: data.pagoInicial && data.pagoInicial.monto > 0 ? { create: [data.pagoInicial] } : undefined,
    },
    include: INCLUDE,
  });

  // La factura se genera sola: el total ya queda fijo al crear el pedido, así que no hay
  // ninguna razón de negocio para que "facturar" sea un paso manual aparte.
  await prisma.factura.create({
    data: {
      pedidoId: pedido.id,
      numeroFactura: `F${String(pedido.id).padStart(6, '0')}`,
      total: pedido.total,
    },
  });

  return pedido;
}

export async function actualizarEstadoPedido(id: number, estado: string) {
  const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id }, include: { pagos: true } });
  if (pedido.estado === 'entregado') {
    throw new Error('Este pedido ya fue entregado; su estado no se puede volver a cambiar.');
  }
  if (estado === 'entregado' && saldoPendiente(pedido) > 0.001) {
    throw new Error('Este pedido tiene saldo pendiente; cóbralo antes de marcarlo como entregado.');
  }

  return prisma.pedido.update({
    where: { id },
    data: { estado, listoEn: estado === 'listo' ? new Date() : undefined },
    include: INCLUDE,
  });
}

export async function registrarPago(pedidoId: number, data: PagoInicialInput) {
  await prisma.pago.create({ data: { pedidoId, ...data } });
  return obtenerPedido(pedidoId);
}

export function buscarPedidos(q: string) {
  const id = Number(q);
  return prisma.pedido.findMany({
    where: {
      OR: [
        ...(Number.isInteger(id) ? [{ id }] : []),
        { cliente: { nombre: { contains: q, mode: 'insensitive' as const } } },
        { cliente: { telefono: { contains: q } } },
      ],
    },
    include: INCLUDE,
    orderBy: { creadoEn: 'desc' },
    take: 20,
  });
}

export function saldoPendiente(pedido: { total: unknown; pagos: { monto: unknown }[] }) {
  const pagado = pedido.pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  return Number(pedido.total) - pagado;
}
