import { prisma } from '../lib/prisma';

export function listarServicios(incluirInactivos = false) {
  return prisma.servicio.findMany({
    where: incluirInactivos ? undefined : { activo: true },
    orderBy: { nombre: 'asc' },
  });
}

export function crearServicio(data: { nombre: string; unidadCobro: string; precio: number }) {
  return prisma.servicio.create({ data });
}

export function actualizarServicio(
  id: number,
  data: { nombre?: string; unidadCobro?: string; precio?: number },
) {
  return prisma.servicio.update({ where: { id }, data });
}

export function cambiarEstadoServicio(id: number, activo: boolean) {
  return prisma.servicio.update({ where: { id }, data: { activo } });
}
