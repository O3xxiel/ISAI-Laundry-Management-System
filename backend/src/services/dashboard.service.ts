import { prisma } from '../lib/prisma';

const DIAS_SIN_RECOGER_ALERTA = 2;
const ESTADOS_ABIERTOS = ['recibido', 'en proceso', 'listo'];

function rangoDia(offsetDias = 0) {
  const inicio = new Date();
  inicio.setDate(inicio.getDate() + offsetDias);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
}

function sumar<T>(arr: T[], campo: (item: T) => unknown) {
  return arr.reduce((acc, item) => acc + Number(campo(item)), 0);
}

async function tarjetas() {
  const hoy = rangoDia(0);
  const ayer = rangoDia(-1);

  const [pedidosHoy, pedidosAyer, pagosHoy, pedidosPorEntregarHoy, itemsPesoHoy, totalPedidosAgg, totalPagosAgg] =
    await Promise.all([
      prisma.pedido.findMany({ where: { creadoEn: { gte: hoy.inicio, lt: hoy.fin } }, select: { total: true } }),
      prisma.pedido.findMany({ where: { creadoEn: { gte: ayer.inicio, lt: ayer.fin } }, select: { total: true } }),
      prisma.pago.findMany({ where: { fecha: { gte: hoy.inicio, lt: hoy.fin } } }),
      prisma.pedido.count({
        where: { fechaPromesa: { gte: hoy.inicio, lt: hoy.fin }, estado: { not: 'entregado' } },
      }),
      prisma.pedidoItem.findMany({
        where: { servicio: { unidadCobro: 'peso' }, pedido: { creadoEn: { gte: hoy.inicio, lt: hoy.fin } } },
        select: { cantidad: true },
      }),
      prisma.pedido.aggregate({ _sum: { total: true } }),
      prisma.pago.aggregate({ _sum: { monto: true } }),
    ]);

  const cobradoPorMetodo = new Map<string, number>();
  for (const pago of pagosHoy) {
    cobradoPorMetodo.set(pago.metodo, (cobradoPorMetodo.get(pago.metodo) ?? 0) + Number(pago.monto));
  }

  return {
    ventasHoy: sumar(pedidosHoy, (p) => p.total),
    ventasAyer: sumar(pedidosAyer, (p) => p.total),
    cobradoHoy: sumar(pagosHoy, (p) => p.monto),
    cobradoPorMetodo: Array.from(cobradoPorMetodo, ([metodo, monto]) => ({ metodo, monto })),
    pedidosRecibidosHoy: pedidosHoy.length,
    pedidosPorEntregarHoy,
    saldoPendienteTotal: Number(totalPedidosAgg._sum.total ?? 0) - Number(totalPagosAgg._sum.monto ?? 0),
    kilosHoy: sumar(itemsPesoHoy, (i) => i.cantidad),
  };
}

async function ordenesPorEstado() {
  const grupos = await prisma.pedido.groupBy({
    by: ['estado'],
    where: { estado: { in: ESTADOS_ABIERTOS } },
    _count: true,
  });
  const porEstado = new Map(grupos.map((g) => [g.estado, g._count]));
  return ESTADOS_ABIERTOS.map((estado) => ({ estado, cantidad: porEstado.get(estado) ?? 0 }));
}

async function tendenciaVentas() {
  // Antes eran 7 consultas (una por día); aquí es una sola, con un SUM condicional por
  // cada rango de día — mismos límites que rangoDia() usa en el resto del archivo.
  const rangos = Array.from({ length: 7 }, (_, idx) => rangoDia(-(6 - idx)));
  const columnas = rangos
    .map((_, i) => `SUM(CASE WHEN creado_en >= $${i * 2 + 1} AND creado_en < $${i * 2 + 2} THEN total ELSE 0 END) AS dia_${i}`)
    .join(', ');
  const params = rangos.flatMap((r) => [r.inicio, r.fin]);

  const [fila] = await prisma.$queryRawUnsafe<Record<string, string | null>[]>(
    `SELECT ${columnas} FROM pedidos`,
    ...params,
  );

  return rangos.map((r, i) => ({
    fecha: r.inicio.toISOString().slice(0, 10),
    ventas: Number(fila[`dia_${i}`] ?? 0),
  }));
}

async function ventasPorServicio() {
  const { inicio } = rangoDia(-29);
  const items = await prisma.pedidoItem.findMany({
    where: { pedido: { creadoEn: { gte: inicio } } },
    include: { servicio: true },
  });
  const porServicio = new Map<string, number>();
  for (const item of items) {
    porServicio.set(item.servicio.nombre, (porServicio.get(item.servicio.nombre) ?? 0) + Number(item.subtotal));
  }
  return Array.from(porServicio, ([servicio, monto]) => ({ servicio, monto })).sort((a, b) => b.monto - a.monto);
}

async function ventasPorHora() {
  const { inicio } = rangoDia(-6);
  const pedidos = await prisma.pedido.findMany({
    where: { creadoEn: { gte: inicio } },
    select: { total: true, creadoEn: true },
  });
  const porHora = new Array(24).fill(0);
  for (const p of pedidos) {
    porHora[new Date(p.creadoEn).getHours()] += Number(p.total);
  }
  return porHora.map((monto, hora) => ({ hora, monto }));
}

async function consumoInsumos() {
  const { inicio } = rangoDia(-6);
  const movimientos = await prisma.movimientoInsumo.findMany({
    where: { tipo: 'salida', fecha: { gte: inicio } },
    include: { insumo: true },
  });
  const porInsumo = new Map<string, number>();
  for (const m of movimientos) {
    porInsumo.set(m.insumo.nombre, (porInsumo.get(m.insumo.nombre) ?? 0) + Number(m.cantidad));
  }
  return Array.from(porInsumo, ([insumo, cantidad]) => ({ insumo, cantidad })).sort((a, b) => b.cantidad - a.cantidad);
}

interface FilaSaldoCliente {
  cliente: string;
  telefono: string;
  saldo: string;
  masAntiguo: Date;
}

async function clientesConSaldo(ahora: Date) {
  // Antes traía TODOS los pedidos con TODOS sus pagos a memoria para sumar en JS — con el
  // catálogo de pedidos creciendo, eso escala mal. Ahora es una sola consulta agregada:
  // primero se suman los pagos por pedido, y sobre eso se agrupa por cliente.
  const filas = await prisma.$queryRaw<FilaSaldoCliente[]>`
    SELECT
      c.nombre AS cliente,
      c.telefono AS telefono,
      (SUM(p.total) - COALESCE(SUM(pg.monto), 0)) AS saldo,
      MIN(p.creado_en) AS "masAntiguo"
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN (
      SELECT pedido_id, SUM(monto) AS monto FROM pagos GROUP BY pedido_id
    ) pg ON pg.pedido_id = p.id
    GROUP BY c.id, c.nombre, c.telefono
    HAVING (SUM(p.total) - COALESCE(SUM(pg.monto), 0)) > 0.001
    ORDER BY "masAntiguo" ASC
  `;

  return filas.map((f) => ({
    cliente: f.cliente,
    telefono: f.telefono,
    saldo: Number(f.saldo),
    diasAntiguedad: Math.floor((ahora.getTime() - new Date(f.masAntiguo).getTime()) / 86_400_000),
  }));
}

async function alertas() {
  const ahora = new Date();
  const limiteSinRecoger = new Date(ahora);
  limiteSinRecoger.setDate(limiteSinRecoger.getDate() - DIAS_SIN_RECOGER_ALERTA);

  const [atrasados, listosSinRecoger, saldoCliente, insumos] = await Promise.all([
    prisma.pedido.findMany({
      where: { fechaPromesa: { lt: ahora }, estado: { notIn: ['listo', 'entregado'] } },
      include: { cliente: true },
      orderBy: { fechaPromesa: 'asc' },
    }),
    prisma.pedido.findMany({
      where: { estado: 'listo', listoEn: { lt: limiteSinRecoger } },
      include: { cliente: true },
      orderBy: { listoEn: 'asc' },
    }),
    clientesConSaldo(ahora),
    prisma.insumo.findMany(),
  ]);

  const insumosBajos = insumos.filter((i) => Number(i.cantidadActual) <= Number(i.stockMinimo));

  return {
    atrasados: atrasados.map((p) => ({
      id: p.id,
      cliente: p.cliente.nombre,
      telefono: p.cliente.telefono,
      fechaPromesa: p.fechaPromesa,
      estado: p.estado,
    })),
    listosSinRecoger: listosSinRecoger.map((p) => ({
      id: p.id,
      cliente: p.cliente.nombre,
      telefono: p.cliente.telefono,
      diasEsperando: Math.floor((ahora.getTime() - (p.listoEn as Date).getTime()) / 86_400_000),
    })),
    clientesConSaldo: saldoCliente,
    insumosBajos,
  };
}

export async function obtenerKpis() {
  const [t, estados, tendencia, porServicio, porHora, consumo, alerts] = await Promise.all([
    tarjetas(),
    ordenesPorEstado(),
    tendenciaVentas(),
    ventasPorServicio(),
    ventasPorHora(),
    consumoInsumos(),
    alertas(),
  ]);

  return {
    ...t,
    insumosBajos: alerts.insumosBajos.length,
    detalleInsumosBajos: alerts.insumosBajos,
    ordenesPorEstado: estados,
    tendenciaVentas: tendencia,
    ventasPorServicio: porServicio,
    ventasPorHora: porHora,
    consumoInsumos: consumo,
    alertas: {
      atrasados: alerts.atrasados,
      listosSinRecoger: alerts.listosSinRecoger,
      clientesConSaldo: alerts.clientesConSaldo,
    },
  };
}
