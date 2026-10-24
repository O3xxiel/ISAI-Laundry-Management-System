import { prisma } from '../lib/prisma';

export interface InsumoReceta {
  insumoId: number;
  cantidad: number;
}

const INCLUDE = {
  insumos: { include: { insumo: { select: { id: true, nombre: true, unidad: true } } } },
};

export function listarServicios(incluirInactivos = false) {
  return prisma.servicio.findMany({
    where: incluirInactivos ? undefined : { activo: true },
    orderBy: { nombre: 'asc' },
    include: INCLUDE,
  });
}

export function crearServicio(data: { nombre: string; unidadCobro: string; precio: number; insumos?: InsumoReceta[] }) {
  const { insumos, ...campos } = data;
  return prisma.servicio.create({
    data: { ...campos, insumos: insumos?.length ? { create: insumos } : undefined },
    include: INCLUDE,
  });
}

export function actualizarServicio(
  id: number,
  data: { nombre?: string; unidadCobro?: string; precio?: number; insumos?: InsumoReceta[] },
) {
  const { insumos, ...campos } = data;
  return prisma.servicio.update({
    where: { id },
    // Si viene la receta, se reemplaza completa; si no viene, se deja como está.
    data: { ...campos, insumos: insumos ? { deleteMany: {}, create: insumos } : undefined },
    include: INCLUDE,
  });
}

export function cambiarEstadoServicio(id: number, activo: boolean) {
  return prisma.servicio.update({ where: { id }, data: { activo } });
}
