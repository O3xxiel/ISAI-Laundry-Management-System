import { prisma } from '../lib/prisma';

const DIAS_CONSUMO = 14;
const UMBRAL_CONTEO = 0.05;

async function conDiasRestantes<T extends { id: number; cantidadActual: unknown }>(insumos: T[]) {
  const desde = new Date();
  desde.setDate(desde.getDate() - DIAS_CONSUMO);

  const salidas = await prisma.movimientoInsumo.findMany({
    where: { tipo: 'salida', fecha: { gte: desde }, insumoId: { in: insumos.map((i) => i.id) } },
    select: { insumoId: true, cantidad: true },
  });

  const consumoPorInsumo = new Map<number, number>();
  for (const s of salidas) {
    consumoPorInsumo.set(s.insumoId, (consumoPorInsumo.get(s.insumoId) ?? 0) + Number(s.cantidad));
  }

  return insumos.map((insumo) => {
    const consumoTotal = consumoPorInsumo.get(insumo.id) ?? 0;
    const promedioDiario = consumoTotal / DIAS_CONSUMO;
    const diasRestantes = promedioDiario > 0 ? Math.round(Number(insumo.cantidadActual) / promedioDiario) : null;
    return { ...insumo, diasRestantes };
  });
}

export async function listarInsumos() {
  const insumos = await prisma.insumo.findMany({ orderBy: { nombre: 'asc' } });
  return conDiasRestantes(insumos);
}

export async function listarAlertas() {
  const insumos = await prisma.insumo.findMany();
  return insumos.filter((i) => Number(i.cantidadActual) <= Number(i.stockMinimo));
}

export async function buscarPorNombre(nombre: string) {
  return prisma.insumo.findFirst({
    where: { nombre: { equals: nombre.trim(), mode: 'insensitive' } },
  });
}

export function crearInsumo(data: { nombre: string; unidad: string; cantidadActual: number; stockMinimo: number }) {
  return prisma.insumo.create({ data });
}

export function registrarMovimiento(data: {
  insumoId: number;
  tipo: 'entrada' | 'salida';
  motivo: string;
  nota?: string;
  cantidad: number;
  usuarioId?: number;
}) {
  return prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.findUniqueOrThrow({ where: { id: data.insumoId } });
    const delta = data.tipo === 'entrada' ? data.cantidad : -data.cantidad;
    const nuevaCantidad = Number(insumo.cantidadActual) + delta;

    if (nuevaCantidad < 0) {
      throw new Error('Stock insuficiente para esta salida');
    }

    await tx.insumo.update({ where: { id: data.insumoId }, data: { cantidadActual: nuevaCantidad } });
    return tx.movimientoInsumo.create({ data });
  });
}

export async function historialDeInsumo(insumoId: number) {
  const insumo = await prisma.insumo.findUniqueOrThrow({ where: { id: insumoId } });
  const movimientos = await prisma.movimientoInsumo.findMany({
    where: { insumoId },
    include: { usuario: true },
    orderBy: { fecha: 'desc' },
  });

  // Los movimientos no guardan una "foto" del saldo en su momento, así que se reconstruye
  // hacia atrás desde el saldo actual (la única cifra que sabemos con certeza).
  let saldo = Number(insumo.cantidadActual);
  return movimientos.map((m) => {
    const saldoResultante = saldo;
    const delta = m.tipo === 'entrada' ? Number(m.cantidad) : -Number(m.cantidad);
    saldo -= delta;
    return { ...m, saldoResultante };
  });
}

interface ConteoInput {
  insumoId: number;
  cantidadReal: number;
  nota?: string;
}

export async function registrarConteo(conteos: ConteoInput[], usuarioId?: number) {
  const insumos = await prisma.insumo.findMany({ where: { id: { in: conteos.map((c) => c.insumoId) } } });
  const insumoPorId = new Map(insumos.map((i) => [i.id, i]));

  const aplicables = conteos
    .map((c) => {
      const insumo = insumoPorId.get(c.insumoId);
      if (!insumo) throw new Error(`Insumo ${c.insumoId} no existe`);
      const actual = Number(insumo.cantidadActual);
      const diferencia = c.cantidadReal - actual;
      const base = actual > 0 ? actual : c.cantidadReal;
      const pctDiferencia = base > 0 ? Math.abs(diferencia) / base : 0;
      return { insumo, cantidadReal: c.cantidadReal, diferencia, pctDiferencia, nota: c.nota };
    })
    .filter((c) => Math.abs(c.diferencia) > 0.001);

  for (const c of aplicables) {
    if (c.pctDiferencia > UMBRAL_CONTEO && !c.nota?.trim()) {
      throw new Error(`"${c.insumo.nombre}" tiene una diferencia mayor al 5% — agrega una nota explicando por qué.`);
    }
  }

  return prisma.$transaction(
    aplicables.map((c) =>
      prisma.insumo.update({
        where: { id: c.insumo.id },
        data: {
          cantidadActual: c.cantidadReal,
          movimientos: {
            create: {
              tipo: c.diferencia > 0 ? 'entrada' : 'salida',
              motivo: 'Ajuste por conteo',
              cantidad: Math.abs(c.diferencia),
              nota: c.nota,
              usuarioId,
            },
          },
        },
      }),
    ),
  );
}
