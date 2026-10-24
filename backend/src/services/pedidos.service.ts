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
    include: { insumos: true },
  });
  const servicioPorId = new Map(servicios.map((s) => [s.id, s]));

  // Consumo total por insumo = cantidad del renglón × cantidad de la receta, sumado entre renglones.
  const consumoPorInsumo = new Map<number, number>();
  const itemsData = data.items.map((item) => {
    const servicio = servicioPorId.get(item.servicioId);
    if (!servicio) throw new Error(`Servicio ${item.servicioId} no existe`);
    const cantidad = servicio.unidadCobro === 'fijo' ? 1 : item.cantidad;
    const subtotal = Number(servicio.precio) * cantidad;
    for (const r of servicio.insumos) {
      consumoPorInsumo.set(r.insumoId, (consumoPorInsumo.get(r.insumoId) ?? 0) + Number(r.cantidad) * cantidad);
    }
    return { servicioId: servicio.id, cantidad, subtotal };
  });

  const total = itemsData.reduce((acc, i) => acc + i.subtotal, 0);

  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.create({
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
    await tx.factura.create({
      data: {
        pedidoId: pedido.id,
        numeroFactura: `F${String(pedido.id).padStart(6, '0')}`,
        total: pedido.total,
      },
    });

    // Sin validar stock a propósito: no se rechaza a un cliente porque el sistema "cree" que no
    // hay detergente. El stock puede quedar negativo hasta que el conteo físico lo corrija.
    for (const [insumoId, cantidad] of consumoPorInsumo) {
      await tx.insumo.update({ where: { id: insumoId }, data: { cantidadActual: { decrement: cantidad } } });
      await tx.movimientoInsumo.create({
        data: {
          insumoId,
          usuarioId: data.usuarioId,
          tipo: 'salida',
          motivo: 'Consumo',
          nota: `Pedido #${String(pedido.id).padStart(6, '0')}`,
          cantidad,
        },
      });
    }

    return pedido;
  });
}

export async function actualizarEstadoPedido(id: number, estado: string, usuarioId?: number) {
  const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id }, include: { pagos: true } });
  if (pedido.estado === 'entregado') {
    throw new Error('Este pedido ya fue entregado; su estado no se puede volver a cambiar.');
  }
  if (pedido.estado === 'cancelado') {
    throw new Error('Este pedido fue cancelado; su estado no se puede volver a cambiar.');
  }
  if (estado === 'entregado' && saldoPendiente(pedido) > 0.001) {
    throw new Error('Este pedido tiene saldo pendiente; cóbralo antes de marcarlo como entregado.');
  }

  return prisma.$transaction(async (tx) => {
    // Si se cancela antes de empezar a lavarlo, los insumos no se llegaron a usar: se devuelven.
    if (estado === 'cancelado' && pedido.estado === 'recibido') {
      const nota = `Pedido #${String(id).padStart(6, '0')}`;
      const consumos = await tx.movimientoInsumo.findMany({ where: { tipo: 'salida', nota } });
      for (const c of consumos) {
        await tx.insumo.update({ where: { id: c.insumoId }, data: { cantidadActual: { increment: c.cantidad } } });
        await tx.movimientoInsumo.create({
          data: { insumoId: c.insumoId, usuarioId, tipo: 'entrada', motivo: 'Devolución', nota: `${nota} cancelado`, cantidad: c.cantidad },
        });
      }
    }

    return tx.pedido.update({
      where: { id },
      data: { estado, listoEn: estado === 'listo' ? new Date() : undefined },
      include: INCLUDE,
    });
  });
}

export async function registrarPago(pedidoId: number, data: PagoInicialInput) {
  const pedido = await prisma.pedido.findUniqueOrThrow({ where: { id: pedidoId } });
  if (pedido.estado === 'cancelado') throw new Error('Este pedido fue cancelado; no se le pueden registrar pagos.');
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
