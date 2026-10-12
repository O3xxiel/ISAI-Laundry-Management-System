import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function daysAgo(n: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  // Limpia datos de negocio (no toca usuarios) para partir de un estado consistente.
  await prisma.pago.deleteMany();
  await prisma.factura.deleteMany();
  await prisma.pedidoItem.deleteMany();
  await prisma.movimientoInsumo.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.insumo.deleteMany();
  await prisma.servicio.deleteMany();
  await prisma.cliente.deleteMany();

  const clientes = await Promise.all(
    [
      ['Uriel Sierra', '50212345678', 'uriel.sierra@example.com'],
      ['Marta Xol', '50245678912', null],
      ['Carlos Caal', '50233221144', 'carlos.caal@example.com'],
      ['Ana Tzul', '50255667788', null],
      ['José Pop', '50244556677', 'jose.pop@example.com'],
      ['Lucía Bol', '50266778899', null],
      ['Miguel Ical', '50277889900', null],
      ['Rosa Coy', '50288990011', 'rosa.coy@example.com'],
    ].map(([nombre, telefono, correo]) =>
      prisma.cliente.create({ data: { nombre: nombre!, telefono: telefono!, correo: correo ?? undefined } }),
    ),
  );

  const servicios = await Promise.all(
    [
      ['Lavado y secado', 'peso', 12.5],
      ['Lavado, secado y planchado', 'peso', 16.0],
      ['Lavado en seco', 'peso', 22.0],
      ['Solo planchado', 'pieza', 8.0],
      ['Edredón', 'pieza', 45.0],
      ['Cobija', 'pieza', 30.0],
      ['Cortina', 'pieza', 35.0],
      ['Suavizante extra', 'fijo', 5.0],
      ['Quitamanchas', 'fijo', 10.0],
    ].map(([nombre, unidadCobro, precio]) =>
      prisma.servicio.create({ data: { nombre: nombre as string, unidadCobro: unidadCobro as string, precio: precio as number } }),
    ),
  );

  const insumos = await Promise.all(
    [
      ['Detergente líquido', 'litros', 8, 15],
      ['Suavizante', 'litros', 20, 10],
      ['Bolsas plásticas', 'unidades', 40, 100],
      ['Ganchos', 'unidades', 300, 50],
      ['Blanqueador', 'litros', 3, 5],
      ['Etiquetas', 'unidades', 150, 50],
    ].map(([nombre, unidad, cantidadActual, stockMinimo]) =>
      prisma.insumo.create({
        data: { nombre: nombre as string, unidad: unidad as string, cantidadActual: cantidadActual as number, stockMinimo: stockMinimo as number },
      }),
    ),
  );

  await prisma.movimientoInsumo.createMany({
    data: [
      { insumoId: insumos[0].id, tipo: 'entrada', cantidad: 20, fecha: daysAgo(6) },
      { insumoId: insumos[0].id, tipo: 'salida', cantidad: 12, fecha: daysAgo(2) },
      { insumoId: insumos[2].id, tipo: 'entrada', cantidad: 100, fecha: daysAgo(6) },
      { insumoId: insumos[2].id, tipo: 'salida', cantidad: 60, fecha: daysAgo(1) },
      { insumoId: insumos[4].id, tipo: 'entrada', cantidad: 8, fecha: daysAgo(6) },
      { insumoId: insumos[4].id, tipo: 'salida', cantidad: 5, fecha: daysAgo(3) },
      { insumoId: insumos[1].id, tipo: 'entrada', cantidad: 25, fecha: daysAgo(6) },
    ],
  });

  const metodos = ['efectivo', 'tarjeta', 'transferencia'];

  // servicioId por índice (0-based): 0 lavado+secado, 1 completo, 2 seco, 3 planchado,
  // 4 edredón, 5 cobija, 6 cortina, 7 suavizante extra, 8 quitamanchas
  const pedidosPlan: {
    diasAtras: number;
    hora: number;
    estado: string;
    cliente: number;
    items: { servicio: number; cantidad: number }[];
    pago: 'total' | 'anticipo' | 'ninguno';
    fechaPromesaAtrasada?: boolean;
    diasListoSinRecoger?: number;
  }[] = [
    { diasAtras: 4, hora: 9, estado: 'entregado', cliente: 0, items: [{ servicio: 0, cantidad: 8 }], pago: 'total' },
    { diasAtras: 4, hora: 14, estado: 'entregado', cliente: 1, items: [{ servicio: 1, cantidad: 6 }, { servicio: 8, cantidad: 1 }], pago: 'total' },
    { diasAtras: 3, hora: 10, estado: 'entregado', cliente: 2, items: [{ servicio: 3, cantidad: 5 }], pago: 'total' },
    { diasAtras: 3, hora: 16, estado: 'entregado', cliente: 3, items: [{ servicio: 4, cantidad: 1 }], pago: 'anticipo' },
    { diasAtras: 2, hora: 11, estado: 'entregado', cliente: 4, items: [{ servicio: 0, cantidad: 10 }], pago: 'total' },
    { diasAtras: 2, hora: 15, estado: 'entregado', cliente: 5, items: [{ servicio: 5, cantidad: 2 }, { servicio: 6, cantidad: 3 }], pago: 'anticipo' },
    { diasAtras: 1, hora: 9, estado: 'entregado', cliente: 6, items: [{ servicio: 2, cantidad: 6 }], pago: 'total' },
    { diasAtras: 1, hora: 13, estado: 'entregado', cliente: 7, items: [{ servicio: 1, cantidad: 9 }], pago: 'total' },
    { diasAtras: 0, hora: 8, estado: 'entregado', cliente: 0, items: [{ servicio: 0, cantidad: 4 }, { servicio: 7, cantidad: 1 }], pago: 'total' },
    { diasAtras: 3, hora: 9, estado: 'listo', cliente: 1, items: [{ servicio: 0, cantidad: 11 }], pago: 'anticipo', diasListoSinRecoger: 3 },
    { diasAtras: 2, hora: 10, estado: 'en proceso', cliente: 2, items: [{ servicio: 3, cantidad: 13 }], pago: 'ninguno', fechaPromesaAtrasada: true },
    { diasAtras: 0, hora: 11, estado: 'en proceso', cliente: 3, items: [{ servicio: 6, cantidad: 4 }], pago: 'ninguno' },
    { diasAtras: 0, hora: 12, estado: 'recibido', cliente: 4, items: [{ servicio: 1, cantidad: 7 }], pago: 'ninguno' },
    { diasAtras: 0, hora: 13, estado: 'recibido', cliente: 5, items: [{ servicio: 0, cantidad: 9 }, { servicio: 8, cantidad: 1 }], pago: 'anticipo' },
  ];

  const pedidos = [];
  for (let i = 0; i < pedidosPlan.length; i++) {
    const plan = pedidosPlan[i];
    const cliente = clientes[plan.cliente];
    const metodo = metodos[i % metodos.length];

    const itemsData = plan.items.map(({ servicio: idx, cantidad }) => {
      const servicio = servicios[idx];
      const cant = servicio.unidadCobro === 'fijo' ? 1 : cantidad;
      return { servicioId: servicio.id, cantidad: cant, subtotal: Number(servicio.precio) * cant };
    });
    const total = itemsData.reduce((acc, it) => acc + it.subtotal, 0);
    const fechaPromesa = new Date(daysAgo(plan.diasAtras, plan.hora));
    fechaPromesa.setDate(fechaPromesa.getDate() + (plan.fechaPromesaAtrasada ? -1 : 1));
    const listoEn = plan.diasListoSinRecoger != null ? daysAgo(plan.diasListoSinRecoger, plan.hora) : undefined;

    const pedido = await prisma.pedido.create({
      data: {
        clienteId: cliente.id,
        total,
        estado: plan.estado,
        fechaPromesa,
        listoEn,
        notas: i === 5 ? 'Cortinas con manchas de humedad, revisar antes de lavar.' : undefined,
        creadoEn: daysAgo(plan.diasAtras, plan.hora),
        items: { create: itemsData },
      },
    });

    if (plan.pago === 'total') {
      await prisma.pago.create({ data: { pedidoId: pedido.id, monto: total, metodo, fecha: pedido.creadoEn } });
    } else if (plan.pago === 'anticipo') {
      const anticipo = Math.round(total * 0.5 * 100) / 100;
      await prisma.pago.create({ data: { pedidoId: pedido.id, monto: anticipo, metodo, fecha: pedido.creadoEn } });
    }

    // Igual que en el backend real: la factura se genera sola al crear el pedido.
    await prisma.factura.create({
      data: {
        pedidoId: pedido.id,
        numeroFactura: `F${String(pedido.id).padStart(6, '0')}`,
        total: pedido.total,
        fechaEmision: pedido.creadoEn,
      },
    });

    pedidos.push(pedido);
  }

  console.log(
    `Listo: ${clientes.length} clientes, ${servicios.length} servicios, ${insumos.length} insumos, ${pedidos.length} pedidos, ${pedidos.length} facturas.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
